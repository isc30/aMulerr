export const ignoredCategories = new Set<string>();

export function isCategoryAllowed(categoryTitle: string): boolean {
  const allowedCategoriesEnv = process.env.ALLOWED_CATEGORIES;
  const sonarrCategory = process.env.SONARR_CATEGORY;
  const radarrCategory = process.env.RADARR_CATEGORY;

  // If no filtering environment variables are defined, allow all
  if (allowedCategoriesEnv === undefined && sonarrCategory === undefined && radarrCategory === undefined) {
    return true;
  }

  const allowed = [
    ...(allowedCategoriesEnv ? allowedCategoriesEnv.split(",").map((c: string) => c.trim()) : []),
    sonarrCategory ? sonarrCategory.trim() : "",
    radarrCategory ? radarrCategory.trim() : ""
  ].filter(Boolean);

  return allowed.includes(categoryTitle);
}
