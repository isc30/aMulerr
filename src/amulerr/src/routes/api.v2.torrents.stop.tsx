
import { useAmule } from '#/amule'
import { skipFalsy } from '#/lib/array'
import { createFileRoute } from '@tanstack/react-router'

// https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#stop-torrents
export const Route = createFileRoute('/api/v2/torrents/stop')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const hashes = formData
          .get("hashes")
          ?.toString()
          ?.toUpperCase()
          ?.split("|")
          .filter(skipFalsy)

        if (hashes?.length) {
          await useAmule(async (amule) => {
            for (const hash of hashes) {
              await amule.pauseDownload(hash)
            }
          })
        }

        return new Response("Ok", { status: 200 })
      }
    }
  },
})
