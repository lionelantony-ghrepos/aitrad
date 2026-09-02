export function functionsUrl(baseUrl: string, slug: string): string {
  const origin = baseUrl.replace(/\/+$/, "");
  return `${origin}/functions/${slug}`;
}
