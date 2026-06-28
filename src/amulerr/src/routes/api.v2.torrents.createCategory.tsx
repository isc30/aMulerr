
import { useAmule } from '#/amule'
import { ignoredCategories, isCategoryAllowed } from '#/lib/categories'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/torrents/createCategory')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const categoryTitle = formData.get("category")?.toString()

        if (categoryTitle) {
          if (!isCategoryAllowed(categoryTitle)) {
            console.log(`Ignoring creation of category "${categoryTitle}" (not in allowed list)`);
            ignoredCategories.add(categoryTitle);
            return Response.json({})
          }

          await useAmule(async (amule) => {

            const dummyCategory = Math.random().toString(36).substring(2)
            const dummyCategoryId = (await amule.createCategory(dummyCategory)).categoryId!

            const categories = await amule.getCategories()
            await amule.deleteCategory(dummyCategoryId)

            const defaultPath = categories.find(c => c.id === dummyCategoryId)?.path
            const category = categories.find(c => c.title === categoryTitle)

            if (category) {
              if (!await amule.updateCategory(category.id, categoryTitle, `${defaultPath}/${categoryTitle}`, "amulerr")) {
                throw new Error(`Failed to update category ${categoryTitle}`)
              }
            } else {
              if (!await amule.createCategory(categoryTitle, `${defaultPath}/${categoryTitle}`, "amulerr")) {
                throw new Error(`Failed to create category ${categoryTitle}`)
              }
            }
          })
        }

        return Response.json({})
      }
    }
  },
})

