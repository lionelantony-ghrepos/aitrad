export const packageName = "@meridian/indicators" as const;

export type OhlcvLike = {
  h: number;
  l: number;
  c: number;
  v: number;
};

export function sma(values: readonly number[], period: number): Array<number | null> {
  if (period < 1) {
    return values.map(() => null);
  }
  const out: Array<number | null> = [];
  let windowSum = 0;
  for (let i = 0; i < values.length; i += 1) {
    const point = values[i];
    if (point === undefined) {
      out.push(null);
      continue;
    }
    windowSum += point;
    if (i >= period) {
      const drop = values[i - period];
      windowSum -= drop ?? 0;
    }
    if (i < period - 1) {
      out.push(null);
    } else {
      out.push(windowSum / period);
    }
  }
  return out;
}

export function ema(values: readonly number[], period: number): Array<number | null> {
  if (period < 1) {
    return values.map(() => null);
  }
  const k = 2 / (period + 1);
  const out: Array<number | null> = [];
  let prev: number | null = null;
  let seedSum = 0;
  for (let i = 0; i < values.length; i += 1) {
    const point = values[i];
    if (point === undefined) {
      out.push(null);
      continue;
    }
    if (i < period - 1) {
      seedSum += point;
      out.push(null);
      continue;
    }
    if (prev === null) {
      seedSum += point;
      prev = seedSum / period;
      out.push(prev);
      continue;
    }
    prev = point * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function vwap(bars: readonly OhlcvLike[]): Array<number | null> {
  const out: Array<number | null> = [];
  let pv = 0;
  let vol = 0;
  for (const bar of bars) {
    const typical = (bar.h + bar.l + bar.c) / 3;
    pv += typical * bar.v;
    vol += bar.v;
    out.push(vol === 0 ? null : pv / vol);
  }
  return out;
}

export function rsi(closes: readonly number[], period: number): Array<number | null> {
  if (period < 1) {
    return closes.map(() => null);
  }
  const out: Array<number | null> = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < closes.length; i += 1) {
    if (i === 0) {
      out.push(null);
      continue;
    }
    const prevClose = closes[i - 1];
    const close = closes[i];
    if (prevClose === undefined || close === undefined) {
      out.push(null);
      continue;
    }
    const change = close - prevClose;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    if (i < period) {
      avgGain += gain;
      avgLoss += loss;
      out.push(null);
      continue;
    }
    if (i === period) {
      avgGain = (avgGain + gain) / period;
      avgLoss = (avgLoss + loss) / period;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) {
      out.push(avgGain === 0 ? 50 : 100);
    } else {
      const rs = avgGain / avgLoss;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}
