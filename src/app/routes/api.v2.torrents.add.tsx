import { ActionFunction, json } from "@remix-run/node"
import { download } from "~/data/downloadClient"
import {
  MagnetParseError,
  parseSyntheticMagnetLink,
} from "~/utils/qbittorrentMagnet"
import { logger } from "~/utils/logger"
import { parseTorrentAddOptions } from "~/utils/qbittorrentTorrentAdd"

async function readTorrentAddFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData()
  } catch {
    return new FormData()
  }
}

export const action = (async ({ request }) => {
  const url = new URL(request.url)
  logger.debug("Path", url.pathname)

  const formData = await readTorrentAddFormData(request)

  if (formData.has("torrents") || formData.has("torrents0")) {
    return new Response(
      "BitTorrent .torrent file uploads are unsupported; use eMulerr synthetic magnets",
      {
        status: 415,
        headers: { "Content-Type": "text/plain" },
      }
    )
  }

  const urlsRaw = formData.get("urls")?.toString()
  const { category, paused } = parseTorrentAddOptions(formData)

  if (!urlsRaw?.trim()) {
    return new Response("Missing urls parameter", { status: 400 })
  }

  const magnets = urlsRaw
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)

  const parsedMagnets = []
  for (const magnet of magnets) {
    try {
      parsedMagnets.push(parseSyntheticMagnetLink(magnet))
    } catch (error) {
      const message =
        error instanceof MagnetParseError
          ? error.message
          : "Invalid magnet link"
      return new Response(message, { status: 400 })
    }
  }

  for (const magnet of parsedMagnets) {
    await download(magnet.hash, magnet.name, magnet.size, category, {
      paused,
    })
  }

  return json({})
}) satisfies ActionFunction
