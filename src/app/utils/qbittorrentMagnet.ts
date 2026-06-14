import base32 from "hi-base32"
import {
  EXTERNAL_HASH_PADDING,
  normalizeInternalEd2kHash,
} from "~/utils/qbittorrentHash"

export class MagnetParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MagnetParseError"
  }
}

function decodeBtihToInternalHash(btih: string): string {
  const value = btih.trim()

  if (/^[0-9A-Fa-f]{40}$/.test(value)) {
    const upper = value.toUpperCase()
    if (!upper.endsWith(EXTERNAL_HASH_PADDING)) {
      throw new MagnetParseError("Unsupported BitTorrent info hash")
    }

    const internal = normalizeInternalEd2kHash(upper.slice(0, 32))
    if (!internal) {
      throw new MagnetParseError("Invalid compatibility info hash")
    }

    return internal
  }

  try {
    const bytes = Buffer.from(base32.decode.asBytes(value.toUpperCase()))
    if (bytes.length !== 20) {
      throw new MagnetParseError("Invalid base32 info hash length")
    }

    if (!bytes.subarray(16).every((byte) => byte === 0)) {
      throw new MagnetParseError("Unsupported BitTorrent info hash")
    }

    const internal = normalizeInternalEd2kHash(
      bytes.subarray(0, 16).toString("hex")
    )
    if (!internal) {
      throw new MagnetParseError("Invalid eD2K info hash")
    }

    return internal
  } catch (error) {
    if (error instanceof MagnetParseError) {
      throw error
    }

    throw new MagnetParseError("Invalid magnet info hash")
  }
}

export function parseSyntheticMagnetLink(magnetLink: string): {
  hash: string
  name: string
  size: number
} {
  const trimmed = magnetLink.trim()
  if (!trimmed.toLowerCase().startsWith("magnet:?")) {
    throw new MagnetParseError("Invalid magnet protocol")
  }

  const params = new URLSearchParams(trimmed.slice("magnet:?".length))
  const xt = params.get("xt")
  if (!xt?.toLowerCase().startsWith("urn:btih:")) {
    throw new MagnetParseError("Missing or invalid xt parameter")
  }

  const hash = decodeBtihToInternalHash(xt.slice("urn:btih:".length))
  const dn = params.get("dn")?.trim()
  if (!dn) {
    throw new MagnetParseError("Missing dn parameter")
  }

  const xl = params.get("xl")?.trim()
  if (!xl || !/^\d+$/.test(xl)) {
    throw new MagnetParseError("Invalid xl parameter")
  }

  const size = Number.parseInt(xl, 10)
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new MagnetParseError("Invalid xl parameter")
  }

  return {
    hash,
    name: dn,
    size,
  }
}
