import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  externalToInternalEd2kHash,
  hashSelectionMatchesFile,
  internalToExternalQbittorrentHash,
  normalizeInternalEd2kHash,
  parseQbittorrentHashQuery,
  parseQbittorrentHashSelection,
  selectionFromParsedHashes,
} from "./qbittorrentHash.ts"

const SAMPLE = "A1B2C3D4E5F6789012345678ABCDEF01"
const UNKNOWN = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

describe("qbittorrentHash", () => {
  it("normalizes internal hashes", () => {
    assert.equal(normalizeInternalEd2kHash(`  ${SAMPLE.toLowerCase()}  `), SAMPLE)
  })

  it("converts internal to external hash", () => {
    assert.equal(
      internalToExternalQbittorrentHash(SAMPLE),
      `${SAMPLE.toLowerCase()}00000000`
    )
  })

  it("converts external compatibility hash to internal", () => {
    assert.equal(
      externalToInternalEd2kHash(`${SAMPLE.toLowerCase()}00000000`),
      SAMPLE
    )
  })

  it("rejects arbitrary 40-character hashes", () => {
    assert.equal(
      externalToInternalEd2kHash("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
      null
    )
  })

  it("distinguishes absent, empty, all, valid and invalid selections", () => {
    assert.deepEqual(parseQbittorrentHashQuery(false, null), { kind: "absent" })
    assert.deepEqual(parseQbittorrentHashQuery(true, ""), { kind: "empty" })
    assert.deepEqual(parseQbittorrentHashSelection("ALL"), { kind: "all" })
    assert.deepEqual(parseQbittorrentHashSelection("not-a-hash"), {
      kind: "invalid",
    })
  })

  it("parses pipe-separated mixed-case hashes", () => {
    const parsed = parseQbittorrentHashSelection(
      `${SAMPLE}|${SAMPLE.toLowerCase()}00000000`
    )
    assert.equal(parsed.kind, "hashes")
    if (parsed.kind === "hashes") {
      assert.deepEqual(parsed.hashes, [SAMPLE])
    }
  })

  it("returns null selection for mutation no-ops", () => {
    assert.equal(selectionFromParsedHashes({ kind: "absent" }), null)
    assert.equal(selectionFromParsedHashes({ kind: "empty" }), null)
    assert.equal(selectionFromParsedHashes({ kind: "invalid" }), null)
    assert.equal(selectionFromParsedHashes({ kind: "all" }), "all")
  })

  it("filters info results by hash selection semantics", () => {
    assert.equal(
      hashSelectionMatchesFile({ kind: "absent" }, SAMPLE),
      true
    )
    assert.equal(
      hashSelectionMatchesFile({ kind: "invalid" }, SAMPLE),
      false
    )
    assert.equal(
      hashSelectionMatchesFile({ kind: "empty" }, SAMPLE),
      false
    )
    assert.equal(
      hashSelectionMatchesFile({ kind: "hashes", hashes: [SAMPLE] }, SAMPLE),
      true
    )
    assert.equal(
      hashSelectionMatchesFile({ kind: "hashes", hashes: [UNKNOWN] }, SAMPLE),
      false
    )
  })
})
