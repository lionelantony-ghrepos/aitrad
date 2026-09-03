import { nyseTradingSessions, type MarketCalendarRow } from "./calendar";

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function marketCalendarSeedRows(year = 2026): MarketCalendarRow[] {
  return nyseTradingSessions(year);
}

export function marketCalendarInsertSql(year = 2026): string {
  const rows = marketCalendarSeedRows(year);
  const values = rows
    .map(
      (row) =>
        `(${sqlString(row.session_date)}::date, ${sqlString(row.venue)}, ${sqlString(row.session_kind)}, ${row.open_minute}, ${row.close_minute})`,
    )
    .join(",\n  ");
  return `INSERT INTO public.market_calendar (session_date, venue, session_kind, open_minute, close_minute)
VALUES
  ${values}
ON CONFLICT (venue, session_date) DO UPDATE SET
  session_kind = EXCLUDED.session_kind,
  open_minute = EXCLUDED.open_minute,
  close_minute = EXCLUDED.close_minute;`;
}
