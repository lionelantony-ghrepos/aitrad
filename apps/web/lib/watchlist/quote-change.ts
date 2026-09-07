export function netChange(last: number, prevClose: number): number {
  return last - prevClose;
}

export function pctChange(last: number, prevClose: number): number | null {
  if (prevClose === 0) {
    return null;
  }
  return ((last - prevClose) / prevClose) * 100;
}
