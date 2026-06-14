import { amuleGetDownloads } from "amule/amule"
import { pauseTorrents, resumeTorrents } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

export type ParsedTorrentHashes =
  | { kind: "none" }
  | { kind: "all" }
  | { kind: "hashes"; hashes: string[] }

export function normalizeQbittorrentHash(raw: string): string {
  const hash = raw.trim().toUpperCase()
  if (/^[0-9A-F]{40}$/.test(hash) && hash.endsWith("00000000")) {
    return hash.slice(0, 32)
  }
  return hash
}

export function parseTorrentHashesFromFormData(
  formData: FormData
): ParsedTorrentHashes {
  const hashesValue = formData.get("hashes")

  if (typeof hashesValue !== "string") {
    return { kind: "none" }
  }

  const hashesRaw = hashesValue.trim()
  if (!hashesRaw) {
    return { kind: "none" }
  }

  if (hashesRaw.toLowerCase() === "all") {
    return { kind: "all" }
  }

  const hashes = [
    ...new Set(
      hashesRaw
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean)
        .map(normalizeQbittorrentHash)
        .filter((hash) => /^[0-9A-F]{32}$/.test(hash))
    ),
  ]

  if (!hashes.length) {
    return { kind: "none" }
  }

  return { kind: "hashes", hashes }
}

export async function resolveTorrentHashes(
  parsed: ParsedTorrentHashes
): Promise<string[]> {
  if (parsed.kind === "none") {
    return []
  }

  if (parsed.kind === "all") {
    const downloads = await amuleGetDownloads()
    return downloads.map((download) => download.hash)
  }

  return parsed.hashes
}

function rejectNonPostMethod(): Response {
  return new Response(null, {
    status: 405,
    headers: { Allow: "POST" },
  })
}

async function readTorrentStateFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData()
  } catch {
    return new FormData()
  }
}

export async function handleTorrentStateAction(
  request: Request,
  state: "pause" | "resume"
): Promise<Response> {
  if (request.method !== "POST") {
    return rejectNonPostMethod()
  }

  const url = new URL(request.url)
  logger.debug("Path", url.pathname)
  const formData = await readTorrentStateFormData(request)
  const parsed = parseTorrentHashesFromFormData(formData)
  const hashes = await resolveTorrentHashes(parsed)

  if (hashes.length) {
    if (state === "pause") {
      await pauseTorrents(hashes)
    } else {
      await resumeTorrents(hashes)
    }
  }

  return new Response(null, { status: 200 })
}

export function rejectTorrentStateGet(): Response {
  return rejectNonPostMethod()
}
