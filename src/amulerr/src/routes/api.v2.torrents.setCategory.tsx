
import { useAmule } from '#/amule'
import { isCategoryAllowed } from '#/lib/categories'
import { skipFalsy } from '#/lib/array'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/torrents/setCategory')({
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
        const categoryTitle = formData.get("category")?.toString()

        if (categoryTitle && hashes?.length) {
          if (!isCategoryAllowed(categoryTitle)) {
            console.log(`Ignoring setCategory for "${categoryTitle}" (not in allowed list)`);
            return Response.json({})
          }

          await useAmule(async (amule) => {
            const categories = await amule.getCategories()
            const categoryId = categories.find(c => c.title === categoryTitle)?.id
            if (!categoryId) {
              throw new Error(`Category ${categoryTitle} not found`)
            }

            for (const hash of hashes) {
              if (!await amule.setFileCategory(hash, categoryId)) {
                throw new Error(`Failed to set category for torrent ${hash}`)
              }
            }
          })
        }

        return Response.json({})
      }
    }
  },
})

