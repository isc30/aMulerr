export const ignoredCategories = new Set<string>();

export function isCategoryAllowed(categoryTitle: string): boolean {
  const allowedCategoriesEnv = process.env.ALLOWED_CATEGORIES;

  // If no filtering environment variables are defined, allow all
  if (allowedCategoriesEnv === undefined) {
    return true;
  }

  const allowed = allowedCategoriesEnv.split(",").map((c: string) => c.trim()).filter(Boolean);

  return allowed.includes(categoryTitle);
}

