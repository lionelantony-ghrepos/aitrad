export function isPaletteHotkey(e: { key: string; ctrlKey: boolean; metaKey: boolean }): boolean {
  return e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey);
}
