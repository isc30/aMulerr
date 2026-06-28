
import { useAmule } from '#/amule'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/torrents/deleteCategory')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const categoryTitle = formData.get("category")?.toString()

        if (categoryTitle) {
          await useAmule(async (amule) => {
            const categories = await amule.getCategories()
            const category = categories.find(c => c.title === categoryTitle)
            if (category) {
              if (!await amule.deleteCategory(category.id)) {
                throw new Error(`Failed to delete category ${categoryTitle}`)
              }
            }
          })
        }

        return Response.json({})
      }
    }
  },
})
