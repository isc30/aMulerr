import {
  amuleGetUploads,
  amuleGetDownloads,
  amuleGetShared,
  amuleDoDownload,
  amuleDoDelete,
  amuleDoPause,
  amuleDoReloadShared,
  amuleDoResume,
} from "amule/amule"
import { toEd2kLink } from "~/links"
import { unlink } from "node:fs/promises"
import { createJsonDb } from "~/utils/jsonDb"
import { staleWhileRevalidate } from "~/utils/memoize"

export const metadataDb = createJsonDb<
  Record<
    string,
    { category: string; addedOn: number; pausedByApi?: boolean }
  >
>("/config/hash-metadata.json", {})

function setPausedByApi(hash: string, paused: boolean) {
  const existing = metadataDb.data[hash]

  if (paused) {
    metadataDb.data[hash] = {
      category: existing?.category ?? "",
      addedOn: existing?.addedOn ?? Date.now(),
      pausedByApi: true,
    }
    return
  }

  if (!existing) {
    return
  }

  const next = { ...existing }
  delete next.pausedByApi
  metadataDb.data[hash] = next
}

async function filterKnownDownloadHashes(
  hashes: string[]
): Promise<string[]> {
  const downloads = await amuleGetDownloads()
  const knownHashes = new Map(
    downloads.map((download) => [
      download.hash.toUpperCase(),
      download.hash,
    ])
  )

  return [
    ...new Set(hashes.map((hash) => hash.toUpperCase())),
  ]
    .map((hash) => knownHashes.get(hash))
    .filter((hash): hash is string => Boolean(hash))
}

export async function pauseTorrents(hashes: string[]) {
  const knownHashes = await filterKnownDownloadHashes(hashes)

  await Promise.all(
    knownHashes.map(async (hash) => {
      await amuleDoPause(hash)
      setPausedByApi(hash, true)
    })
  )
}

export async function resumeTorrents(hashes: string[]) {
  const knownHashes = await filterKnownDownloadHashes(hashes)

  await Promise.all(
    knownHashes.map(async (hash) => {
      await amuleDoResume(hash)
      setPausedByApi(hash, false)
    })
  )
}

export const getDownloadClientFiles = staleWhileRevalidate(async function () {
  const uploads = await amuleGetUploads()
  const downloads = [...await amuleGetDownloads()]
  const shared = (await amuleGetShared())
    .filter(
      (f) => !downloads.some((d) => d.hash === f.hash)
    )
    .map(
      (f) =>
        ({
          ...f,
          eta: 0,
          last_seen_complete: 0,
          prio: 0,
          prio_auto: 0,
          progress: 1,
          size_done: f.size,
          size_xfer: 0,
          src_valid: null,
          src_count: null,
          src_count_xfer: null,
          speed: null,
          status: 9,
          status_str: "downloaded",
        }) as const
    )

  const metadata = metadataDb.data

  const files = [
    ...downloads.sort(
      (a, b) =>
        (b.speed > 0 ? 1 : 0) - (a.speed > 0 ? 1 : 0) ||
        b.progress - a.progress ||
        b.speed - a.speed
    ),
    ...shared,
  ].map((f) => ({
    ...f,
    up_speed: uploads
      .filter((u) => u.name === f.name)
      .map((u) => u.xfer_speed)
      .reduce((prev, curr) => prev + curr, 0),
    meta: metadata[f.hash],
  }))

  return files
})

export async function download(
  hash: string,
  name: string,
  size: number,
  category: string
) {
  const ed2kLink = toEd2kLink(hash, name, size)
  await amuleDoDownload(ed2kLink)
  setCategory(hash, category)
}

export function setCategory(hash: string, category: string) {
  const existing = metadataDb.data[hash]
  metadataDb.data[hash] = {
    ...existing,
    addedOn: existing?.addedOn ?? Date.now(),
    category: category,
  }
}

export async function remove(hashes: string[]) {
  if (hashes.length) {
    const downloads = await amuleGetDownloads()
    const shared = await amuleGetShared()

    await Promise.all(
      hashes.map(async (hash) => {
        const file =
          downloads.find((v) => v.hash === hash) ??
          shared.find((v) => v.hash === hash)

        await amuleDoDelete(hash)

        if (file) {
          await unlink(`/downloads/complete/${file.name}`).catch(() => void 0)
          await unlink(`/tmp/shared/${file.name}`).catch(() => void 0)
        }

        delete metadataDb.data[hash]
      })
    )

    await amuleDoReloadShared()
  }
}
