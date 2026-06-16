import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseTorrentAddOptions } from "./qbittorrentTorrentAdd.ts"

describe("qbittorrentTorrentAdd", () => {
  it("defaults paused to false when paused and stopped are absent", () => {
    const formData = new FormData()
    formData.set(
      "urls",
      "magnet:?xt=urn:btih:A1B2C3D4E5F6789012345678ABCDEF0100000000&dn=test&xl=1"
    )

    assert.deepEqual(parseTorrentAddOptions(formData), {
      category: "",
      paused: false,
    })
  })

  it("defaults category to empty string when absent", () => {
    const formData = new FormData()
    formData.set("urls", "magnet:?xt=urn:btih:test&dn=test&xl=1")
    formData.set("paused", "false")

    assert.equal(parseTorrentAddOptions(formData).category, "")
    assert.equal(parseTorrentAddOptions(formData).paused, false)
  })

  it("accepts paused=true and stopped=true", () => {
    const pausedForm = new FormData()
    pausedForm.set("paused", "true")
    assert.equal(parseTorrentAddOptions(pausedForm).paused, true)

    const stoppedForm = new FormData()
    stoppedForm.set("stopped", "true")
    assert.equal(parseTorrentAddOptions(stoppedForm).paused, true)
  })
})
