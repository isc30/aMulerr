export const INTERNAL_ED2K_HASH_LENGTH = 32
export const EXTERNAL_QBITTORRENT_HASH_LENGTH = 40
export const EXTERNAL_HASH_PADDING = "00000000"

const INTERNAL_HASH_RE = /^[0-9A-F]{32}$/
const EXTERNAL_HASH_RE = /^[0-9A-F]{40}$/

export type ParsedQbittorrentHashSelection =
  | { kind: "absent" }
  | { kind: "empty" }
  | { kind: "all" }
  | { kind: "hashes"; hashes: string[] }
  | { kind: "invalid" }

export function normalizeInternalEd2kHash(value: string): string | null {
  const hash = value.trim().toUpperCase()
  return INTERNAL_HASH_RE.test(hash) ? hash : null
}

export function internalToExternalQbittorrentHash(
  value: string
): string | null {
  const internal = normalizeInternalEd2kHash(value)
  if (!internal) {
    return null
  }

  return `${internal}${EXTERNAL_HASH_PADDING}`.toLowerCase()
}

export function externalToInternalEd2kHash(value: string): string | null {
  const hash = value.trim().toUpperCase()

  if (INTERNAL_HASH_RE.test(hash)) {
    return hash
  }

  if (EXTERNAL_HASH_RE.test(hash) && hash.endsWith(EXTERNAL_HASH_PADDING)) {
    return hash.slice(0, INTERNAL_ED2K_HASH_LENGTH)
  }

  return null
}

export function parseQbittorrentHashSelection(
  value: string | null | undefined
): ParsedQbittorrentHashSelection {
  if (value === null || value === undefined) {
    return { kind: "empty" }
  }

  const raw = value.trim()
  if (!raw) {
    return { kind: "empty" }
  }

  if (raw.toLowerCase() === "all") {
    return { kind: "all" }
  }

  const hashes = [
    ...new Set(
      raw
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean)
        .map(externalToInternalEd2kHash)
        .filter((hash): hash is string => hash !== null)
    ),
  ]

  if (!hashes.length) {
    return { kind: "invalid" }
  }

  return { kind: "hashes", hashes }
}

export function parseQbittorrentHashQuery(
  hashesParamPresent: boolean,
  value: string | null
): ParsedQbittorrentHashSelection {
  if (!hashesParamPresent) {
    return { kind: "absent" }
  }

  return parseQbittorrentHashSelection(value)
}

export function parseTorrentHashesFromFormData(
  formData: FormData
): ParsedQbittorrentHashSelection {
  if (!formData.has("hashes")) {
    return { kind: "absent" }
  }

  return parseQbittorrentHashSelection(formData.get("hashes")?.toString())
}

export function selectionFromParsedHashes(
  parsed: ParsedQbittorrentHashSelection
): "all" | string[] | null {
  if (parsed.kind === "all") {
    return "all"
  }

  if (parsed.kind === "hashes") {
    return parsed.hashes
  }

  return null
}

export function hashSelectionMatchesFile(
  selection: ParsedQbittorrentHashSelection,
  fileHash: string
): boolean {
  switch (selection.kind) {
    case "absent":
    case "all":
      return true
    case "empty":
    case "invalid":
      return false
    case "hashes": {
      const wanted = new Set(selection.hashes.map((hash) => hash.toUpperCase()))
      return wanted.has(fileHash.toUpperCase())
    }
  }
}
