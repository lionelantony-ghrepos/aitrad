export const SPARKLINE_POINTS = 30;

export function appendSparkline(history: readonly number[], last: number): number[] {
  const next = [...history, last];
  if (next.length <= SPARKLINE_POINTS) {
    return next;
  }
  return next.slice(next.length - SPARKLINE_POINTS);
}
