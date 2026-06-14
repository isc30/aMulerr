import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  timestampToUnixSeconds,
  torrentTimestampsFromMetadata,
} from "./qbittorrentTimestamps.ts"

describe("qbittorrentTimestamps", () => {
  it("converts milliseconds to seconds", () => {
    assert.equal(timestampToUnixSeconds(1_700_000_000_000), 1_700_000_000)
  })

  it("preserves values already in seconds", () => {
    assert.equal(timestampToUnixSeconds(1_700_000_000), 1_700_000_000)
  })

  it("returns zero for missing timestamps", () => {
    assert.equal(timestampToUnixSeconds(undefined), 0)
    assert.deepEqual(torrentTimestampsFromMetadata(undefined), {
      added_on: 0,
      completion_on: 0,
      addition_date: 0,
      completion_date: 0,
    })
  })

  it("keeps info and properties timestamps consistent", () => {
    const meta = {
      addedOn: 1_700_000_000_000,
      completionOn: 1_700_000_100_000,
    }
    const timestamps = torrentTimestampsFromMetadata(meta)
    assert.equal(timestamps.added_on, timestamps.addition_date)
    assert.equal(timestamps.completion_on, timestamps.completion_date)
    assert.equal(timestamps.added_on, 1_700_000_000)
    assert.equal(timestamps.completion_on, 1_700_000_100)
  })
})
