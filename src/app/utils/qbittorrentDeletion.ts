import {
  COMPLETE_DOWNLOAD_ROOT,
  INCOMPLETE_DOWNLOAD_ROOT,
  resolveSafeFilePath,
  SHARED_DOWNLOAD_ROOT,
} from "~/utils/qbittorrentPathSafety"

export function resolveDeletionTargetRoots(isCompleted: boolean): string[] {
  return isCompleted
    ? [COMPLETE_DOWNLOAD_ROOT, SHARED_DOWNLOAD_ROOT]
    : [INCOMPLETE_DOWNLOAD_ROOT]
}

export function resolveDeletionFilePath(
  fileName: string,
  isCompleted: boolean,
  existsAt: (path: string) => boolean
): string | null {
  for (const root of resolveDeletionTargetRoots(isCompleted)) {
    const safePath = resolveSafeFilePath(root, fileName)
    if (safePath && existsAt(safePath)) {
      return safePath
    }
  }

  return null
}
