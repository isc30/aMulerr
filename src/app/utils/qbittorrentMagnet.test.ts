import assert from "node:assert/strict"
import { describe, it } from "node:test"
import base32 from "hi-base32"
import {
  MagnetParseError,
  parseSyntheticMagnetLink,
} from "./qbittorrentMagnet.ts"

const HASH = "A1B2C3D4E5F6789012345678ABCDEF01"
const SIZE = 12345

function buildMagnet(name: string) {
  const hashBuffer = Buffer.from(HASH, "hex")
  const base32Buffer = Buffer.alloc(20, "\0")
  hashBuffer.copy(base32Buffer)
  const base32Hash = base32.encode(base32Buffer).toUpperCase()
  return `magnet:?xt=urn:btih:${base32Hash}&dn=${encodeURIComponent(name)}&xl=${SIZE}&tr=http://emulerr`
}

describe("qbittorrentMagnet", () => {
  it("returns dn without double decoding", () => {
    const name = "100% complete & café + test"
    assert.deepEqual(parseSyntheticMagnetLink(buildMagnet(name)), {
      hash: HASH,
      name,
      size: SIZE,
    })
  })

  it("accepts reordered magnet parameters", () => {
    const magnet = buildMagnet("Example.epub")
    const [, query = ""] = magnet.split("magnet:?")
    const params = new URLSearchParams(query)
    const reordered = `magnet:?dn=${params.get("dn")}&tr=http://emulerr&xl=${SIZE}&xt=${params.get("xt")}`
    assert.equal(parseSyntheticMagnetLink(reordered).name, "Example.epub")
  })

  it("accepts hexadecimal compatibility hashes", () => {
    const magnet = `magnet:?xt=urn:btih:${HASH.toLowerCase()}00000000&dn=${encodeURIComponent("Example.epub")}&xl=${SIZE}`
    assert.equal(parseSyntheticMagnetLink(magnet).hash, HASH)
  })

  it("rejects non-emulerr btih values", () => {
    const magnet = `magnet:?xt=urn:btih:${"a".repeat(40)}&dn=${encodeURIComponent("Example.epub")}&xl=${SIZE}`
    assert.throws(() => parseSyntheticMagnetLink(magnet), MagnetParseError)
  })
})
