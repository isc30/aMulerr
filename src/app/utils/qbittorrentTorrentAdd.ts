export function parseTorrentAddOptions(formData: FormData) {
  const category = formData.get("category")?.toString() ?? ""
  const paused =
    formData.get("paused")?.toString().trim().toLowerCase() === "true" ||
    formData.get("stopped")?.toString().trim().toLowerCase() === "true"

  return { category, paused }
}
