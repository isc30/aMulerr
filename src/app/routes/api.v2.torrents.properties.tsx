import { LoaderFunction, json } from "@remix-run/node"
import { getApiVisibleFileByHash } from "~/data/downloadClient"
import { buildQbittorrentTorrentProperties } from "~/utils/qbittorrentTorrentResponse"
import { logger } from "~/utils/logger"

export const loader = (async ({ request }) => {
  const url = new URL(request.url)
  logger.debug("Path", url.pathname)

  const hash = url.searchParams.get("hash")
  if (!hash) {
    return new Response("Missing hash parameter", { status: 400 })
  }

  const file = await getApiVisibleFileByHash(hash)
  if (!file) {
    return new Response("Not Found", { status: 404 })
  }

  return json(buildQbittorrentTorrentProperties(file))
}) satisfies LoaderFunction

export const action = loader
