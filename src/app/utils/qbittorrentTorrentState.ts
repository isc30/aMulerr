import {
  pauseTorrents,
  resumeTorrents,
  type TorrentHashSelection,
} from "~/data/downloadClient"
import {
  parseTorrentHashesFromFormData,
  selectionFromParsedHashes,
  type ParsedQbittorrentHashSelection,
} from "~/utils/qbittorrentHash"
import { logger } from "~/utils/logger"

export type { ParsedQbittorrentHashSelection as ParsedTorrentHashes }

export {
  parseTorrentHashesFromFormData,
  parseQbittorrentHashSelection,
  parseQbittorrentHashQuery,
} from "~/utils/qbittorrentHash"

function toTorrentHashSelection(
  parsed: ParsedQbittorrentHashSelection
): TorrentHashSelection | null {
  return selectionFromParsedHashes(parsed)
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
