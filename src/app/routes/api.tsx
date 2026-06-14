import { LoaderFunction } from "@remix-run/node"
import { logger } from "~/utils/logger"
import { skipFalsy } from "~/utils/array"
import {
  emptyResponse,
  fakeItem,
  group,
  itemsResponse,
  search,
} from "~/utils/indexers"

export const loader = (async ({ request }) => {
  const content = await handleTorznabRequest(request)
  return new Response(`<?xml version="1.0" encoding="UTF-8" ?>${content}`, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })
}) satisfies LoaderFunction

async function handleTorznabRequest(request: Request) {
  logger.debug("URL", request.url)
  const url = new URL(request.url)

  switch (url.searchParams.get("t")) {
    case "caps":
      return caps(url)
    case "search":
      return await rawSearch(url)
    case "tvsearch":
      return await tvSearch(url)
    default:
      throw Error("NOT IMPLEMENTED")
  }
}

function caps(_url: URL) {
  void _url
  return `
<caps xmlns:torznab="http://torznab.com/schemas/2015/feed">
  <server version="1.0" title="eMulerr" strapline="eMulerr" />
  <limits min="100000" max="100000" default="100000"/>
  <retention days="1"/>
  <registration available="no" open="no" />
  <searching>
    <search available="yes" supportedParams="q" searchEngine="raw"/>
    <movie-search available="no"/>
    <tv-search available="yes" supportedParams="q,season,ep" searchEngine="raw"/>
  </searching>
  <categories>
    <category id="2000" name="Movies" />
    <category id="5000" name="TV" />
    <category id="7000" name="Other" />
    <category id="10000" name="All" />
  </categories>
  <tags>
    <tag name="freeleech" description="FreeLeech" />
  </tags>
</caps>`
}

async function rawSearch(url: URL) {
  const q = url.searchParams.get("q")
  const offset = url.searchParams.get("offset")
  const cat =
    url.searchParams
      .get("cat")
      ?.toString()
      ?.split(",")
      ?.map((x) => parseInt(x)) ?? []

  // avoid duplicated entries
  if (offset && offset !== "0") {
    return emptyResponse()
  }

  // rss sync
  if (!q) {
    return itemsResponse([fakeItem], cat)
  }

  const searchResults = await search(q)
  return itemsResponse(searchResults, cat)
}

async function tvSearch(url: URL) {
  const q = url.searchParams.get("q")
  const season = url.searchParams.get("season")?.toString()
  const episode = url.searchParams.get("ep")?.toString()
  const offset = url.searchParams.get("offset")?.toString()
  const cat =
    url.searchParams
      .get("cat")
      ?.toString()
      ?.split(",")
      ?.map((x) => parseInt(x)) ?? []

  // avoid duplicated entries
  if (offset && offset !== "0") {
    return emptyResponse()
  }

  // rss sync
  if (!q) {
    return itemsResponse([fakeItem], cat)
  }

  const episodeQuery = [
    ...new Set(
      season && episode
        ? ["/", "-"].some((c) => episode.includes(c)) // daily episode
          ? [`${season}/${episode}`]
          : [
              `${season}x${episode}`,
              `${season}x${episode.padStart(2, "0")}`,
              `S${season.padStart(2, "0")}E${episode.padStart(2, "0")}`,
              `S${season}E${episode}`,
            ]
        : season
          ? season.length === 4 // daily episode
            ? [season]
            : [`${season}x`, `S${season.padStart(2, "0")}`, `S${season}`]
          : []
    ),
  ].filter(skipFalsy)

  const episodeFilter = group(episodeQuery, "OR", true)
  const query = group([q, episodeFilter], "AND", false)
  const searchResults = await search(query)
  return itemsResponse(searchResults, cat)
}

