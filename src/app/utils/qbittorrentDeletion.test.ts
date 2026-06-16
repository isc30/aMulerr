import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  COMPLETE_DOWNLOAD_ROOT,
  INCOMPLETE_DOWNLOAD_ROOT,
  SHARED_DOWNLOAD_ROOT,
} from "./qbittorrentPathSafety.ts"
import {
  resolveDeletionFilePath,
  resolveDeletionTargetRoots,
  unlinkExistingFile,
} from "./qbittorrentDeletion.ts"

describe("qbittorrentDeletion", () => {
  it("targets completed files in complete/shared roots only", () => {
    assert.deepEqual(resolveDeletionTargetRoots(true), [
      COMPLETE_DOWNLOAD_ROOT,
      SHARED_DOWNLOAD_ROOT,
    ])
    assert.deepEqual(resolveDeletionTargetRoots(false), [
      INCOMPLETE_DOWNLOAD_ROOT,
    ])
  })

  it("deletes only the first matching trusted path", () => {
    const completePath = `${COMPLETE_DOWNLOAD_ROOT}/book.epub`
    const sharedPath = `${SHARED_DOWNLOAD_ROOT}/book.epub`
    const existsAt = (path: string) =>
      path === completePath || path === sharedPath

    assert.equal(
      resolveDeletionFilePath("book.epub", true, existsAt),
      completePath
    )
  })

  it("preserves unrelated same-named files in other roots", () => {
    const sharedPath = `${SHARED_DOWNLOAD_ROOT}/book.epub`
    const existsAt = (path: string) => path === sharedPath

    assert.equal(
      resolveDeletionFilePath("book.epub", true, existsAt),
      sharedPath
    )
    assert.equal(
      resolveDeletionFilePath("../secret.epub", true, () => true),
      null
    )
  })

  describe("unlinkExistingFile", () => {
    it("treats ENOENT as already deleted", async () => {
      const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" })
      let called = false
      await unlinkExistingFile("/downloads/complete/missing.epub", async () => {
        called = true
        throw enoent
      })
      assert.equal(called, true)
    })

    it("propagates non-ENOENT unlink errors", async () => {
      const eacces = Object.assign(new Error("EACCES"), { code: "EACCES" })
      await assert.rejects(
        unlinkExistingFile("/downloads/complete/locked.epub", async () => {
          throw eacces
        }),
        /EACCES/
      )
    })

    it("completes when unlink succeeds", async () => {
      let removed: string | undefined
      await unlinkExistingFile(
        "/downloads/complete/book.epub",
        async (path) => {
          removed = path
        }
      )
      assert.equal(removed, "/downloads/complete/book.epub")
    })
  })
})
