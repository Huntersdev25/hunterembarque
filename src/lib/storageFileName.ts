export function sanitizeStorageFileName(fileName: string): string {
  const trimmedName = fileName.trim();
  const lastDotIndex = trimmedName.lastIndexOf(".");

  const rawBaseName = lastDotIndex > 0 ? trimmedName.slice(0, lastDotIndex) : trimmedName;
  const rawExtension = lastDotIndex > 0 ? trimmedName.slice(lastDotIndex + 1) : "";

  const normalizeSegment = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._ -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-_.]+|[-_.]+$/g, "");

  const safeBaseName = normalizeSegment(rawBaseName).slice(0, 120) || "documento";
  const safeExtension = normalizeSegment(rawExtension).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  return safeExtension ? `${safeBaseName}.${safeExtension}` : safeBaseName;
}
