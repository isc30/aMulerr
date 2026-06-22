
import { useAmule } from '#/amule'
import type { DownloadItem } from '#/amule-ec-node/AmuleClient.mjs'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/torrents/info')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const categoryTitle = url.searchParams.get("category")

        const { category, shared, downloads } = await useAmule(async (amule) => {
          const categories = await amule.getCategories()
          const category = categories.find(c => c.title === categoryTitle)
          if (!category?.id) {
            throw new Error(`Category "${categoryTitle}" not found`)
          }

          const downloads = await amule.getDownloadQueue()
          const shared = await amule.getSharedFiles()
          return {
            downloads: downloads.filter(d => d.category === category.id),
            shared: shared.filter(s => !downloads.some(d => d.fileHash === s.fileHash) && s.path?.endsWith(`/${categoryTitle}`)),
            category
          }
        })

        // qBittorrent structure
        return Response.json([
          ...downloads.map((f) => ({
            hash: f.fileHash,
            name: f.fileName,
            size: f.fileSize,
            size_done: f.fileSizeDownloaded,
            progress: Math.min(100, parseFloat(f.progress ?? '0')) / 100,
            dlspeed: f.speed,
            eta: f.speed && f.speed > 0 ? (f.fileSize - (f.fileSizeDownloaded ?? 0)) / f.speed : 8640000,
            state: statusToQbittorrentState(f),
            category: categoryTitle,
            content_path: `${category.path}/${f.fileName}`,
          })),
          ...shared.map((f) => ({
            hash: f.fileHash,
            name: f.fileName,
            size: f.fileSize,
            size_done: f.fileSize,
            progress: 1,
            dlspeed: 0,
            state: "pausedUP" as const,
            category: categoryTitle,
            content_path: `${f.path}/${f.fileName}`,
          })),
        ])
      }
    }
  },
})

function statusToQbittorrentState(
  f: DownloadItem
) {
  switch (f.status) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 10:
      return f.sourceCountXfer && f.sourceCountXfer > 0
        ? ("downloading" as const)
        : f.progress && parseFloat(f.progress) < 100
          ? ("stalledDL" as const)
          : "pausedUP" as const
    case 4:
    case 5:
    case 6:
      return "error" as const
    case 7:
      return "pausedDL" as const
    case 8:
      return "moving" as const
    case 9:
      return "pausedUP" as const
    default:
      return "stalledDL" as const
  }
}