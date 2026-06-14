export function setReleaseGroup(name: string) {
  if (/--eMulerr\.\w+$/i.test(name)) {
    return name
  }

  name = name.replace(/(.*)(\.\w+)$/, `$1--eMulerr$2`)
  return name
}

export function sanitizeUnicode(str: string) {
  const apostrophes = /[\u2018\u2019\u02BB\u02BC\u201B\u2032]/g

  return str
    .normalize("NFKD")
    .replace(apostrophes, " ")
    .replace(/[\u0100-\uFFFF]/g, "")
}

export function sanitizeQuery(q: string): string
export function sanitizeQuery(q: string | undefined | null): string
export function sanitizeQuery(q: string | undefined | null) {
  if (!q) {
    return q
  }

  return sanitizeUnicode(q)
    .replace(/[^\w ()'-]/g, " ")
    .replace(/ +/g, " ")
    .trim()
}

export function sanitizeFilename(str: string) {
  // remove illegal characters
  str = str.replace(/[/\\?%*:|"<>]/g, "_")
  str = sanitizeUnicode(str)

  // fix utf8 decoding artifacts
  for (;;) {
    try {
      const nstr = decodeURIComponent(escape(str));
      if (nstr === str) {
        break
      }
      str = nstr
    } catch (e) {
      break;
    }
  }

  return str
}
