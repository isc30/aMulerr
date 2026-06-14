const MS_THRESHOLD = 1_000_000_000_000

export function timestampToUnixSeconds(value: number | undefined): number {
  if (value === undefined) {
    return 0
  }

  if (value >= MS_THRESHOLD) {
    return Math.floor(value / 1000)
  }

  return value
}

export function torrentTimestampsFromMetadata(meta?: {
  addedOn?: number
  completionOn?: number
}) {
  return {
    added_on: timestampToUnixSeconds(meta?.addedOn),
    completion_on: timestampToUnixSeconds(meta?.completionOn),
    addition_date: timestampToUnixSeconds(meta?.addedOn),
    completion_date: timestampToUnixSeconds(meta?.completionOn),
  }
}
