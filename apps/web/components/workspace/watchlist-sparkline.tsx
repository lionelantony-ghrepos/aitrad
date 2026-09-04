"use client";

export function WatchlistSparkline({ points }: { points: readonly number[] }): React.JSX.Element {
  if (points.length < 2) {
    return (
      <span className="text-muted-foreground" data-testid="sparkline-empty">
        —
      </span>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const w = 72;
  const h = 20;
  const d = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * w;
      const y = h - ((value - min) / span) * h;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const up = first !== undefined && last !== undefined && last >= first;
  return (
    <svg width={w} height={h} className={up ? "text-up" : "text-down"} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}
