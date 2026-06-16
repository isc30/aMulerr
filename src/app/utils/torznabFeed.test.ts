import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { hasAllowedExtension, itemsResponse } from "./torznabFeed.ts"

const SAMPLE_HASH = "A1B2C3D4E5F6789012345678ABCDEF01"
const MAGNET = `magnet:?xt=urn:btih:${SAMPLE_HASH.toLowerCase()}00000000&dn=test&tr=http://emulerr`

function sampleItem(name: string) {
  return {
    name,
    short_name: name,
    hash: SAMPLE_HASH,
    size: 42,
    sources: 3,
    present: false,
    magnetLink: MAGNET,
    ed2kLink: "ed2k://example",
  }
}

function assertWellFormedRss(xml: string) {
  assert.match(xml, /<rss version="2\.0"/)
  assert.match(xml, /<channel>/)
  assert.match(xml, /<\/channel>/)
  assert.match(xml, /<\/rss>/)
  assert.doesNotMatch(xml, /<(title|link|enclosure)[^>]*>[^<]*&[^a][^;]*</)
}

describe("torznabFeed publication support", () => {
  it("accepts video extensions", () => {
    for (const name of ["clip.mp4", "movie.MKV", "show.AVI"]) {
      assert.equal(hasAllowedExtension(name), true, name)
    }
  })

  it("accepts publication extensions case-insensitively", () => {
    for (const name of [
      "issue.pdf",
      "book.EPUB",
      "novel.MOBI",
      "reader.AZW3",
      "comic.CBZ",
      "archive.CBR",
      "bundle.ZIP",
      "collection.RAR",
    ]) {
      assert.equal(hasAllowedExtension(name), true, name)
    }
  })

  it("rejects unknown extensions and extensionless names", () => {
    for (const name of ["readme.txt", "binary", "Hackable Magazine N°30"]) {
      assert.equal(hasAllowedExtension(name), false, name)
    }
  })

  it("includes link, enclosure and magneturl in Torznab items", () => {
    const xml = itemsResponse([sampleItem("Hackable Magazine 01.PDF")], [7000])
    assert.match(xml, /<link>.*magnet:\?xt=urn:btih:/)
    assert.match(xml, /<enclosure url=".*magnet:\?xt=urn:btih:/)
    assert.match(
      xml,
      /<torznab:attr name="magneturl" value=".*magnet:\?xt=urn:btih:/
    )
    assertWellFormedRss(xml)
  })

  it("escapes XML special characters in titles and magnet attributes", () => {
    const trickyName = 'Hackable & "Spécial" <01>.pdf'
    const trickyMagnet =
      "magnet:?xt=urn:btih:abc&dn=Hackable%20%26%20Test&tr=http://emulerr"
    const xml = itemsResponse(
      [
        {
          ...sampleItem(trickyName),
          magnetLink: trickyMagnet,
        },
      ],
      [7000]
    )

    assert.match(xml, /Hackable &amp; &quot;Spécial&quot; &lt;01&gt;\.pdf/)
    assert.match(xml, /value="magnet:\?xt=urn:btih:abc&amp;dn=/)
    assert.doesNotMatch(xml, /<title>Hackable & /)
    assertWellFormedRss(xml)
  })

  it("keeps unicode publication names in valid Torznab output", () => {
    const xml = itemsResponse([sampleItem("Revue été 2024.pdf")], [7000])
    assert.match(xml, /Revue été 2024\.pdf/)
    assertWellFormedRss(xml)
  })

  it("joins multiple items without comma separators", () => {
    const trickyName = 'Hackable & "N°02".pdf'
    const trickyMagnet =
      "magnet:?xt=urn:btih:abc&dn=Hackable%20%26%20Test&tr=http://emulerr"
    const xml = itemsResponse(
      [
        sampleItem("Hackable Magazine 01.pdf"),
        {
          ...sampleItem(trickyName),
          magnetLink: trickyMagnet,
        },
      ],
      [7000]
    )

    const itemCount = (xml.match(/<item>/g) ?? []).length
    assert.equal(itemCount, 2)
    assert.doesNotMatch(xml, /<\/item>,\s*<item>/)
    assert.match(xml, /Hackable Magazine 01\.pdf/)
    assert.match(xml, /Hackable &amp; &quot;N°02&quot;\.pdf/)
    assert.match(xml, /value="magnet:\?xt=urn:btih:abc&amp;dn=/)
    assertWellFormedRss(xml)
  })
})
