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
})
