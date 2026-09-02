/** Inclusive session end date for the mock history (doc 06 seed era). */
export const SESSION_END_DATE = "2026-07-02";

/** Target length of the daily series (~5 years of sessions). */
export const DAILY_BAR_COUNT = 1255;

export const INTRADAY_SESSION_COUNT = 5;

export const MINUTES_PER_SESSION = 390;

/** GBM year fraction uses a 252-session convention. */
export const GBM_SESSIONS_PER_YEAR = 252;

export const HISTORY_SEED = 42;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseYmd(isoDate: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`INVALID_DATE:${isoDate}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return { year, month, day };
}

function utcWeekday(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addUtcDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): {
  year: number;
  month: number;
  day: number;
} {
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

/** Anonymous Gregorian computus (UTC date of Easter Sunday). */
function easterSunday(year: number): { year: number; month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  nth: number,
): { year: number; month: number; day: number } {
  const first = utcWeekday(year, month, 1);
  const offset = (weekday - first + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  return { year, month, day };
}

function lastWeekday(
  year: number,
  month: number,
  weekday: number,
): { year: number; month: number; day: number } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastWd = utcWeekday(year, month, lastDay);
  const delta = (lastWd - weekday + 7) % 7;
  return { year, month, day: lastDay - delta };
}

function observed(year: number, month: number, day: number): string {
  const wd = utcWeekday(year, month, day);
  if (wd === 6) {
    const prev = addUtcDays(year, month, day, -1);
    return formatYmd(prev.year, prev.month, prev.day);
  }
  if (wd === 0) {
    const next = addUtcDays(year, month, day, 1);
    return formatYmd(next.year, next.month, next.day);
  }
  return formatYmd(year, month, day);
}

const holidayCache = new Map<number, Set<string>>();

function nyseHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) {
    return cached;
  }
  const easter = easterSunday(year);
  const goodFriday = addUtcDays(easter.year, easter.month, easter.day, -2);
  const mlk = nthWeekday(year, 1, 1, 3);
  const presidents = nthWeekday(year, 2, 1, 3);
  const memorial = lastWeekday(year, 5, 1);
  const labor = nthWeekday(year, 9, 1, 1);
  const thanksgiving = nthWeekday(year, 11, 4, 4);
  const set = new Set<string>([
    observed(year, 1, 1),
    formatYmd(mlk.year, mlk.month, mlk.day),
    formatYmd(presidents.year, presidents.month, presidents.day),
    formatYmd(goodFriday.year, goodFriday.month, goodFriday.day),
    formatYmd(memorial.year, memorial.month, memorial.day),
    observed(year, 6, 19),
    observed(year, 7, 4),
    formatYmd(labor.year, labor.month, labor.day),
    formatYmd(thanksgiving.year, thanksgiving.month, thanksgiving.day),
    observed(year, 12, 25),
  ]);
  holidayCache.set(year, set);
  return set;
}

export function isNyseSession(isoDate: string): boolean {
  const { year, month, day } = parseYmd(isoDate);
  const wd = utcWeekday(year, month, day);
  if (wd === 0 || wd === 6) {
    return false;
  }
  return !nyseHolidays(year).has(isoDate);
}

export function tradingDaysEndingOn(endDate: string, count: number): string[] {
  if (count <= 0) {
    return [];
  }
  const out: string[] = [];
  let cursor = parseYmd(endDate);
  while (out.length < count) {
    const iso = formatYmd(cursor.year, cursor.month, cursor.day);
    if (isNyseSession(iso)) {
      out.push(iso);
    }
    cursor = addUtcDays(cursor.year, cursor.month, cursor.day, -1);
  }
  return out.reverse();
}

export function dailyBarTs(isoDate: string): string {
  return `${isoDate}T00:00:00.000Z`;
}

/** Minute 0 is 13:30Z (09:30 EDT). Last index is 15:59 EDT / 19:59Z. */
export function minuteBarTs(isoDate: string, minuteIndex: number): string {
  const start = 13 * 60 + 30;
  const total = start + minuteIndex;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${isoDate}T${pad2(hh)}:${pad2(mm)}:00.000Z`;
}
