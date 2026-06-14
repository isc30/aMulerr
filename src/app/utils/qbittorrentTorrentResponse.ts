import { existsSync } from "node:fs"
import { amuleGetDownloads } from "amule/amule"
import {
  COMPLETE_DOWNLOAD_ROOT,
  INCOMPLETE_DOWNLOAD_ROOT,
  resolveSafeFilePath,
  SHARED_DOWNLOAD_ROOT,
} from "~/utils/qbittorrentPathSafety"
import { internalToExternalQbittorrentHash } from "~/utils/qbittorrentHash"
import { torrentTimestampsFromMetadata } from "~/utils/qbittorrentTimestamps"
import type { DownloadClientFile } from "~/data/downloadClient"

export const QBITTORRENT_SAVE_PATH = COMPLETE_DOWNLOAD_ROOT

// LazyLibrarian treats pausedUP/stoppedUP items as finished only when max_ratio > 0.
// aMule has no BitTorrent ratio; completed eD2K items always expose ratio 1.0.
export const COMPLETED_COMPAT_RATIO = 1.0
export const INCOMPLETE_COMPAT_RATIO = 0.0
export const COMPLETED_SEEDING_TIME_SECONDS = 86400

export function statusToQbittorrentState(
  status: Awaited<ReturnType<typeof amuleGetDownloads>>[0]["status_str"]
) {
  switch (status) {
    case "downloading":
      return "downloading"
    case "downloaded":
      return "pausedUP"
    case "stalled":
      return "stalledDL"
    case "error":
      return "error"
    case "completing":
      return "moving"
    case "stopped":
      return "pausedDL"
  }
}

export function resolveContentPath(fileName: string): string | undefined {
  for (const root of [
    COMPLETE_DOWNLOAD_ROOT,
    SHARED_DOWNLOAD_ROOT,
    INCOMPLETE_DOWNLOAD_ROOT,
  ]) {
    const safePath = resolveSafeFilePath(root, fileName)
    if (safePath && existsSync(safePath)) {
      return safePath
    }
  }

  return undefined
}

export function buildQbittorrentTorrentInfo(file: DownloadClientFile) {
  const externalHash = internalToExternalQbittorrentHash(file.hash)
  if (!externalHash) {
    return null
  }

  const completed = file.progress >= 1
  const progress =
    file.progress === 1 ? 1 : Math.min(0.999, Math.max(file.progress, 0.001))
  const timestamps = torrentTimestampsFromMetadata(file.meta)
  const path = resolveContentPath(file.name)

  return {
    hash: externalHash,
    name: file.name,
    size: file.size,
    total_size: file.size,
    downloaded: file.size_done,
    completed: file.size_done,
    progress,
    dlspeed: file.speed ?? 0,
    upspeed: file.up_speed ?? 0,
    eta: file.eta,
    state: statusToQbittorrentState(file.status_str),
    category: file.meta?.category ?? "",
    save_path: QBITTORRENT_SAVE_PATH,
    content_path: path,
    ratio: completed ? COMPLETED_COMPAT_RATIO : INCOMPLETE_COMPAT_RATIO,
    seeding_time: completed ? COMPLETED_SEEDING_TIME_SECONDS : 0,
    added_on: timestamps.added_on,
    completion_on: completed ? timestamps.completion_on : 0,
    priority: 1,
  }
}

export function buildQbittorrentTorrentProperties(file: DownloadClientFile) {
  const timestamps = torrentTimestampsFromMetadata(file.meta)

  return {
    save_path: QBITTORRENT_SAVE_PATH,
    creation_date: 0,
    piece_size: 0,
    comment: "",
    total_wasted: 0,
    total_uploaded: 0,
    total_uploaded_session: 0,
    total_downloaded: file.size_done,
    total_downloaded_session: file.size_done,
    up_limit: -1,
    dl_limit: -1,
    time_elapsed: 0,
    nb_connections: 0,
    nb_connections_limit: 100,
    share_ratio: file.progress >= 1 ? 1 : 0,
    addition_date: timestamps.addition_date,
    completion_date: file.progress >= 1 ? timestamps.completion_date : 0,
    created_by: "eMulerr",
    dl_speed_avg: file.speed ?? 0,
    dl_speed: file.speed ?? 0,
    eta: file.eta,
    last_seen: 0,
    peers: 0,
    seeds: 0,
  }
}

export function buildQbittorrentTorrentFile(file: DownloadClientFile) {
  const completed = file.progress >= 1
  const progress =
    file.progress === 1 ? 1 : Math.min(0.999, Math.max(file.progress, 0.001))

  return {
    index: 0,
    name: file.name,
    size: file.size,
    progress,
    priority: 1,
    is_seed: completed,
    availability: completed ? 1 : 0,
  }
}
