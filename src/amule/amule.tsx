const pass = "secret"
const host = "http://127.0.0.1:4711"

import { promisify } from "util"
import { exec } from "child_process"
import { request as httpRequest } from "http"
import { decode } from "html-entities"
import { AmuleCategory } from "./amule.types"
import { Mutex } from "async-mutex"
import { staleWhileRevalidate } from "~/utils/memoize"
import { logger } from "~/utils/logger"
import { z } from "zod"
import { wait } from "~/utils/time"

async function fetchTimeout(url: string, init: RequestInit, ms: number = 30000) {
  // No AbortController here: aborting an in-flight request makes the
  // web-fetch polyfill reject an internal stream promise that nothing
  // handles, crashing the process. Instead we race a plain timer and let
  // the amule restart (triggered by the caller on timeout) close the
  // dangling socket.
  let timeout: NodeJS.Timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Request timeout")), ms)
  })

  const fetchPromise = fetch(url, init)
  // swallow late rejections from a request that already lost the race
  fetchPromise.catch(() => {})

  try {
    return await Promise.race([fetchPromise, timeoutPromise])
  } finally {
    clearTimeout(timeout!)
  }
}

async function fetchAmuleApiRaw(
  url: string | URL,
  init: RequestInit,
  retry = true
) {
  try {
    return await fetchTimeout(url.toString(), init)
  } catch {
    await restartAmule()

    if (retry) {
      return await fetchAmuleApiRaw(url, init, false)
    } else {
      throw "Unable to connect to amule"
    }
  }
}

async function fetchAmuleApi(url: string | URL): Promise<void>
async function fetchAmuleApi<Output>(
  url: string | URL,
  zodType: z.ZodType<Output>
): Promise<z.infer<typeof zodType>>
async function fetchAmuleApi<Output>(
  url: string | URL,
  zodType: z.ZodType<Output> = z.any()
) {
  const response = await fetchAmuleApiRaw(url, await getAuth(), true)
  const json = await response.json()
  return zodType.parse(json)
}

// aMule 3.0's webserver parses request headers case-sensitively: the
// lowercase content-length sent by fetch makes it wait for the body
// forever. Use http.request, which preserves header casing, for the
// login POST.
function postLogin(ms: number = 30000) {
  return new Promise<string>((resolve, reject) => {
    const body = `pass=${pass}`
    const req = httpRequest(
      `${host}/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body).toString(),
        },
        timeout: ms,
      },
      (res) => {
        res.resume()
        const cookie = res.headers["set-cookie"]?.[0]?.split(";")[0]
        if (cookie) {
          resolve(cookie)
        } else {
          reject(new Error("No session cookie in login response"))
        }
      }
    )
    req.on("timeout", () => req.destroy(new Error("Request timeout")))
    req.on("error", reject)
    req.end(body)
  })
}

async function getAuth(retry = true): Promise<RequestInit> {
  try {
    const cookie = await postLogin()

    return {
      headers: {
        cookie,
      },
    } satisfies RequestInit
  } catch {
    await restartAmule()

    if (retry) {
      return await getAuth(false)
    } else {
      throw "Unable to connect to amule"
    }
  }
}

const restartMutex = new Mutex()
export async function restartAmule() {
  if (restartMutex.isLocked()) {
    await restartMutex.waitForUnlock()
    return
  }

  await restartMutex.runExclusive(async () => {
    logger.info("Restarting amule...")
    await promisify(exec)("kill $(pidof amuleweb) || true")
    await promisify(exec)("kill $(pidof amuled) || true")
    await wait(30000)
  })
}

// API

const searchTypes = {
  local: "0",
  global: "1",
  kad: "2",
}

async function amuleDoSearchImpl(
  query: string,
  ext: string | undefined,
  type: keyof typeof searchTypes
) {
  const searchUrl = new URL(`${host}/api.php`)
  searchUrl.searchParams.set("do", "search")
  searchUrl.searchParams.set("q", query)
  searchUrl.searchParams.set("ext", ext ?? "")
  searchUrl.searchParams.set("searchType", searchTypes[type])
  searchUrl.searchParams.set("minSize", (100 * 1012 * 1024).toString(10))

  return await fetchAmuleApi(searchUrl)
}

export async function amuleDoDownload(link: string) {
  const downloadUrl = new URL(`${host}/api.php`)
  downloadUrl.searchParams.set("do", "download")
  downloadUrl.searchParams.set("link", link)
  downloadUrl.searchParams.set("category", AmuleCategory.downloads.toString(10))

  return await fetchAmuleApi(downloadUrl)
}

export async function amuleDoDelete(hash: string) {
  const url = new URL(`${host}/api.php`)
  url.searchParams.set("do", "cancel")
  url.searchParams.set("hash", hash)

  return await fetchAmuleApi(url)
}

export async function amuleDoResume(hash: string) {
  const url = new URL(`${host}/api.php`)
  url.searchParams.set("do", "resume")
  url.searchParams.set("hash", hash)

  return await fetchAmuleApi(url)
}

export async function amuleDoReloadShared() {
  const url = new URL(`${host}/api.php`)
  url.searchParams.set("do", "reload-shared")

  await fetchAmuleApi(url)
}

async function amuleGetSearchResults() {
  const searchResult = await fetchAmuleApi(
    `${host}/api.php?get=searchresult`,
    z.array(
      z.object({
        name: z.string(),
        short_name: z.string(),
        hash: z.string(),
        size: z.number(),
        sources: z.number(),
        present: z.number(),
      })
    )
  ).then((r) =>
    r.map((o) => ({
      ...o,
      name: decode(o.name),
      short_name: decode(o.short_name),
      hash: o.hash.toUpperCase(),
      present: !!o.present,
      sources: Math.max(o.sources, 1),
    }))
  )

  return searchResult
}

export const amuleGetShared = staleWhileRevalidate(
  async function () {
    const shared = await fetchAmuleApi(
      `${host}/api.php?get=shared`,
      z.array(
        z.object({
          name: z.string(),
          short_name: z.string(),
          hash: z.string(),
          size: z.number(),
          link: z.string(),
          xfer: z.number(),
          xfer_all: z.number(),
          req: z.number(),
          req_all: z.number(),
          accept: z.number(),
          accept_all: z.number(),
        })
      )
    ).then((r) =>
      r.map((o) => ({
        ...o,
        name: decode(o.name),
        short_name: decode(o.short_name),
        hash: o.hash.toUpperCase(),
      }))
    )

    return shared
  },
  {
    stalled: 250,
  }
)

export const amuleGetDownloads = staleWhileRevalidate(async function () {
  const downloads = await fetchAmuleApi(
    `${host}/api.php?get=downloads`,
    z.array(
      z.object({
        name: z.string(),
        short_name: z.string(),
        hash: z.string(),
        link: z.string(),
        category: z.nativeEnum(AmuleCategory),
        status: z.number(),
        size: z.number(),
        size_done: z.number(),
        size_xfer: z.number(),
        speed: z.number(),
        src_count: z.number(),
        src_count_not_curr: z.number(),
        src_count_a4af: z.number(),
        src_count_xfer: z.number(),
        prio: z.number(),
        prio_auto: z.number(),
        last_seen_complete: z.number(),
      })
    )
  ).then((r) =>
    r.map((d) => {
      const progress = d.size > 0 ? d.size_done / d.size : 0
      const o = {
        ...d,
        name: decode(d.name),
        short_name: decode(d.short_name),
        hash: d.hash.toUpperCase(),
        amuleCategory: d.category,
        progress,
        eta: d.speed > 0 ? (d.size - d.size_done) / d.speed : 8640000,
        src_valid: d.src_count - d.src_count_not_curr,
        status_str: (() => {
          switch (d.status) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 10:
              return d.src_count_xfer > 0
                ? ("downloading" as const)
                : progress < 1
                  ? ("stalled" as const)
                  : "completing"
            case 4:
            case 5:
            case 6:
              return "error" as const
            case 7:
              return "stopped" as const
            case 8:
              return "completing" as const
            case 9:
              return "downloaded" as const
            default:
              return "stalled" as const
          }
        })(),
      }
      const { category, ...good } = o
      return good
    })
  )

  return downloads
})

export const amuleGetUploads = staleWhileRevalidate(async function () {
  const uploads = await fetchAmuleApi(
    `${host}/api.php?get=uploads`,
    z.array(
      z.object({
        name: z.string(),
        short_name: z.string(),
        xfer_up: z.number(),
        xfer_down: z.number(),
        xfer_speed: z.number(),
      })
    )
  ).then((r) =>
    r.map((d) => ({
      ...d,
      name: decode(d.name),
      short_name: decode(d.short_name),
    }))
  )

  return uploads
})

export const amuleGetServers = staleWhileRevalidate(async function () {
  return await fetchAmuleApi(
    `${host}/api.php?get=servers`,
    z.array(
      z.object({
        name: z.string(),
        desc: z.string(),
        addr: z.string(),
        users: z.number(),
        ip: z.string(),
        port: z.number(),
        maxusers: z.number(),
        files: z.number(),
      })
    )
  )
})

export const amuleGetStats = staleWhileRevalidate(async function () {
  return await fetchAmuleApi(
    `${host}/api.php?get=stats`,
    z.object({
      id: z.number().nullish(),
      serv_addr: z.string().nullish(),
      serv_name: z.string().nullish(),
      serv_users: z.number().nullish(),
      kad_connected: z.boolean(),
      kad_firewalled: z.boolean(),
      speed_up: z.number().nullish(),
      speed_down: z.number().nullish(),
      speed_limit_up: z.number().nullish(),
      speed_limit_down: z.number().nullish(),
    })
  )
})

export const amuleGetCategories = staleWhileRevalidate(
  async function getCategories() {
    return await fetchAmuleApi(
      `${host}/api.php?get=categories`,
      z.record(z.string(), z.number())
    )
  }
)

const searchMutex = new Mutex()
export const amuleDoSearch = staleWhileRevalidate(
  async function (
    q: string,
    ext: string | undefined,
    type: keyof typeof searchTypes
  ) {
    return await searchMutex.runExclusive(async () => {
      logger.info(`[network] Searching ${type}${ext ? ` (${ext})` : ""}: ${q}`)
      await amuleDoSearchImpl(q, ext, type)
      let allResults: Awaited<ReturnType<typeof amuleGetSearchResults>> = []

      let retries = 6
      while (retries > 0) {
        await new Promise((r) => setTimeout(r, 2500))
        const currentResults = await amuleGetSearchResults()

        if (currentResults.length === 0) {
          logger.debug(
            `[network] Searching ${type}: no items found, searching more...`
          )
          --retries
          continue
        }

        if (allResults.length == currentResults.length) {
          logger.debug(`[network] Searching ${type}: found same items`)
          allResults = currentResults
          --retries
          continue
        }

        allResults = currentResults
        logger.debug(
          `[network] Searching ${type}: found new items, searching more...`
        )
        retries = 2
      }

      logger.info(
        `[network] Searching ${type}${ext ? ` (${ext})` : ""}: finished with`,
        allResults.length,
        "items"
      )
      return allResults
    })
  },
  {
    stalled: 1000 * 60 * 5,
    expired: 1000 * 60 * 5,
    shouldCache: (v) => v.length > 0,
  }
)
