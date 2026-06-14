import {
  pauseTorrents,
  resumeTorrents,
  type TorrentHashSelection,
} from "~/data/downloadClient"
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

function toTorrentHashSelection(
  parsed: ParsedTorrentHashes
): TorrentHashSelection | null {
  if (parsed.kind === "none") {
    return null
  }

  if (parsed.kind === "all") {
    return "all"
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
  const selection = toTorrentHashSelection(parsed)

  if (selection) {
    if (state === "pause") {
      await pauseTorrents(selection)
    } else {
      await resumeTorrents(selection)
    }
  }

  return new Response(null, { status: 200 })
}

export function rejectTorrentStateGet(): Response {
  return rejectNonPostMethod()
}
