/** Maps score in [-1, 1] to a mix of terminal up/down tokens (not a policy threshold). */
export function sentimentMixPct(score: number): number {
  const clamped = Math.min(1, Math.max(-1, score));
  return Math.round(((clamped + 1) / 2) * 100);
}

export function sentimentTone(score: number): "up" | "down" | "neutral" {
  if (score > 0) {
    return "up";
  }
  if (score < 0) {
    return "down";
  }
  return "neutral";
}
