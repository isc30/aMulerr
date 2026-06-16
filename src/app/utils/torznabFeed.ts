import { encode } from "html-entities"
import { buildRFC822Date } from "./time"

const VIDEO_EXTENSIONS = ["mp4", "mkv", "avi", "wmv", "mpeg", "mpg"]
const PUBLICATION_EXTENSIONS = [
  "pdf",
  "epub",
  "mobi",
  "azw3",
  "cbz",
  "cbr",
  "zip",
  "rar",
]
const TORZNAB_EXTENSIONS = [...VIDEO_EXTENSIONS, ...PUBLICATION_EXTENSIONS]

export function hasAllowedExtension(filename: string) {
  const lower = filename.toLowerCase()
  return TORZNAB_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`))
}

export const itemsResponse = (
  searchResults: Array<{
    name: string
    hash: string
    size: number
    sources: number
    magnetLink: string
  }>,
  categories: number[]
) => `
  <rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
    <channel>
      <torznab:response offset="0" total="${searchResults.length}"/>
      ${searchResults
        .map(
          (item) => `
          <item>
            <title>${encode(item.name)}</title>
            <guid>${item.hash}-${encode(item.name)}</guid>
            <link>${encode(item.magnetLink)}</link>
            <pubDate>${buildRFC822Date(new Date())}</pubDate>
            <enclosure url="${encode(item.magnetLink)}" length="${item.size}" type="application/x-bittorrent" />
            <torznab:attr name="magneturl" value="${encode(item.magnetLink)}" />
            <torznab:attr name="size" value="${item.size}" />
            ${categories.map((c) => `<torznab:attr name="category" value="${c}" />`).join("")}
            <torznab:attr name="seeders" value="${item.sources}" />
            <torznab:attr name="downloadvolumefactor" value="0" />
            <torznab:attr name="uploadvolumefactor" value="0" />
            <torznab:attr name="minimumratio" value="0" />
            <torznab:attr name="minimumseedtime" value="0" />
            <torznab:attr name="tag" value="freeleech" />
          </item>`
        )
        .join("")}
    </channel>
  </rss>
  `
