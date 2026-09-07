import { mockInstrumentSchema, type MockInstrument } from "@meridian/schemas";

export function parseInstrumentsJson(raw: unknown): MockInstrument[] {
  const parsed = mockInstrumentSchema.array().parse(raw);
  const symbols = new Set<string>();
  for (const row of parsed) {
    if (symbols.has(row.symbol)) {
      throw new Error(`DUPLICATE_SYMBOL:${row.symbol}`);
    }
    symbols.add(row.symbol);
  }
  return parsed;
}
