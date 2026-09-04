export type NamedInstrument = {
  symbol: string;
  name: string;
};

function subsequenceScore(query: string, candidate: string): number {
  let qi = 0;
  for (let i = 0; i < candidate.length && qi < query.length; i += 1) {
    if (candidate[i] === query[qi]) {
      qi += 1;
    }
  }
  return qi === query.length ? query.length / candidate.length : 0;
}

function scoreInstrument(query: string, row: NamedInstrument): number {
  const q = query.trim().toUpperCase();
  if (q.length === 0) {
    return 0;
  }
  const symbol = row.symbol.toUpperCase();
  const name = row.name.toUpperCase();
  if (symbol === q) {
    return 1000;
  }
  if (symbol.startsWith(q)) {
    return 500 + q.length;
  }
  if (symbol.includes(q)) {
    return 300 + q.length;
  }
  if (name.startsWith(q) || name.includes(q)) {
    return 200 + q.length;
  }
  const sub = subsequenceScore(q, symbol);
  if (sub > 0) {
    return 50 + sub;
  }
  return 0;
}

export function fuzzyMatchInstruments<T extends NamedInstrument>(
  query: string,
  instruments: readonly T[],
): T[] {
  return instruments
    .map((row) => ({ row, score: scoreInstrument(query, row) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.row.symbol.localeCompare(b.row.symbol))
    .map((item) => item.row);
}
