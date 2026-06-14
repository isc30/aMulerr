import { LoaderFunction, json } from "@remix-run/node"
import { getDownloadClientFiles } from "~/data/downloadClient"
import { buildQbittorrentTorrentInfo } from "~/utils/qbittorrentTorrentResponse"
import {
  hashSelectionMatchesFile,
  parseQbittorrentHashQuery,
} from "~/utils/qbittorrentHash"
import { logger } from "~/utils/logger"

export const loader = (async ({ request }) => {
  const url = new URL(request.url)
  logger.debug("Path", url.pathname)

  const category = url.searchParams.get("category")
  const hashSelection = parseQbittorrentHashQuery(
    url.searchParams.has("hashes"),
    url.searchParams.get("hashes")
  )
  const files = await getDownloadClientFiles()

  return json(
    files
      .filter((file) => {
        if (category !== null && (file.meta?.category ?? "") !== category) {
          return false
        }

        return hashSelectionMatchesFile(hashSelection, file.hash)
      })
      .map((file) => buildQbittorrentTorrentInfo(file))
      .filter((entry) => entry !== null)
  )
}) satisfies LoaderFunction

export const action = loader
