import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildQbittorrentTorrentInfo,
  buildQbittorrentTorrentProperties,
} from "./qbittorrentTorrentResponse.ts"
import {
  COMPLETE_DOWNLOAD_ROOT,
  resolveSafeFilePath,
} from "./qbittorrentPathSafety.ts"

const file = {
  hash: "A1B2C3D4E5F6789012345678ABCDEF01",
  name: "Example.epub",
  size: 1000,
  size_done: 1000,
  progress: 1,
  speed: 0,
  up_speed: 0,
  eta: 0,
  status_str: "downloaded" as const,
  meta: {
    category: "books",
    addedOn: 1_700_000_000_000,
    completionOn: 1_700_000_100_000,
  },
}

describe("qbittorrentTorrentResponse", () => {
  it("builds stable unix-second timestamps", () => {
    const info = buildQbittorrentTorrentInfo(file)
    const properties = buildQbittorrentTorrentProperties(file)
    assert.equal(info?.added_on, 1_700_000_000)
    assert.equal(info?.completion_on, 1_700_000_100)
    assert.equal(properties.addition_date, info?.added_on)
    assert.equal(properties.completion_date, info?.completion_on)
  })

  it("uses safe content paths", () => {
    assert.equal(
      resolveSafeFilePath(COMPLETE_DOWNLOAD_ROOT, file.name),
      `${COMPLETE_DOWNLOAD_ROOT}/${file.name}`
    )
    assert.equal(resolveSafeFilePath(COMPLETE_DOWNLOAD_ROOT, "../x"), null)
  })
})
