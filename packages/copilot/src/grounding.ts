/** Figures that must appear in tool JSON. Years like 2026 are ignored. */
const FIGURE_RE = /\$?\d+(?:,\d{3})*(?:\.\d+)?%?/g;

export function extractFigures(text: string): string[] {
  const found = text.match(FIGURE_RE) ?? [];
  return found.filter((token) => {
    const digits = token.replace(/[^\d]/g, "");
    if (digits.length === 4 && digits.startsWith("20")) {
      return false;
    }
    return digits.length > 0;
  });
}

export function ungroundedFigures(text: string, toolPayloads: readonly unknown[]): string[] {
  const haystack = toolPayloads
    .map((row) => JSON.stringify(row))
    .join(" ")
    .toLowerCase();
  return extractFigures(text).filter((figure) => {
    const normalized = figure.replace(/[$,%]/g, "").toLowerCase();
    return !haystack.includes(normalized);
  });
}

export function assertGroundedOrThrow(text: string, toolPayloads: readonly unknown[]): void {
  const bad = ungroundedFigures(text, toolPayloads);
  if (bad.length > 0) {
    throw new Error(`UNTOOLED_FIGURES:${bad.join(",")}`);
  }
}
