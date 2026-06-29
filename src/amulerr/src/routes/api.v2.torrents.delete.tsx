
import { useAmule } from '#/amule'
import { skipFalsy } from '#/lib/array'
import { addDeletedHash } from '#/lib/deleted'
import { createFileRoute } from '@tanstack/react-router'
import fs from 'node:fs'

export const Route = createFileRoute('/api/v2/torrents/delete')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const formData = await request.formData()
        const hashes = formData
          .get("hashes")
          ?.toString()
          ?.toUpperCase()
          ?.split("|")
          .filter(skipFalsy)

        if (hashes?.length) {
          await useAmule(async (amule) => {
            const shared = await amule.getSharedFiles()
            const ecids = shared
              .filter(f => f.fileHash && hashes.includes(f.fileHash.toUpperCase()))
              .map(f => f.ecid).filter(skipFalsy)

            await amule.clearCompleted(ecids)
            for (const hash of hashes) {
              await amule.cancelDownload(hash)
              addDeletedHash(hash)
            }

            // If the files exist on disk, delete them physically
            for (const f of shared.filter(f => f.fileHash && hashes.includes(f.fileHash.toUpperCase()))) {
              const fullPath = f.path && f.fileName ? `${f.path}/${f.fileName}` : ''
              if (fullPath && fs.existsSync(fullPath)) {
                try {
                  console.log(`Physically deleting file: ${fullPath}`)
                  fs.rmSync(fullPath, { force: true })
                } catch (err: any) {
                  console.error(`Failed to delete physical file ${fullPath}:`, err.message)
                }
              }
            }
          })
        }

        return Response.json({})
      }
    }
  },
})
