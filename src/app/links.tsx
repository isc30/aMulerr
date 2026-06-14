import base32 from "hi-base32"
import {
  MagnetParseError,
  parseSyntheticMagnetLink,
} from "~/utils/qbittorrentMagnet"

export function toMagnetLink(hash: string, name: string, size: number) {
  const hashBuffer = Buffer.from(hash, "hex")
  const base32Buffer = Buffer.alloc(20, "\0")
  hashBuffer.copy(base32Buffer)
  const base32Hash = base32.encode(base32Buffer).toUpperCase()

  return `magnet:?xt=urn:btih:${base32Hash}&dn=${encodeURIComponent(name)}&xl=${size}&tr=http://emulerr`
}

export function fromMagnetLink(magnetLink: string) {
  try {
    return parseSyntheticMagnetLink(magnetLink)
  } catch (error) {
    if (error instanceof MagnetParseError) {
      throw new Error(error.message)
    }

    throw error
  }
}

export function toEd2kLink(hash: string, name: string, size: number) {
  return `ed2k://|file|${name}|${size}|${hash}|/`
}

export function fromEd2kLink(ed2kLink: string) {
  const extractEd2kLinkInfo =
    /ed2k:\/\/\|file\|(?<name>[^|]+)\|(?<size>[^|]+)\|(?<hash>[^|]+)\|/

  const { hash, name, size } = extractEd2kLinkInfo.exec(ed2kLink)?.groups ?? {}

  if (!hash || !name || !size) {
    throw new Error("Invalid ed2k link")
  }

  return { hash, name: decodeURIComponent(name), size: parseInt(size) }
}
