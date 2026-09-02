export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/workspace",
): string {
  if (!value) {
    return fallback;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
