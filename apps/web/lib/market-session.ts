export type NyseSessionState = "OPEN" | "CLOSED";

const NY_TZ = "America/New_York";

/**
 * Placeholder NYSE calendar until PBI-006 seeds sessions.
 * Display-only; order routing still belongs to DT-HRS-01 once order-service exists.
 */
const FULL_HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
]);

const HALF_DAYS_2026 = new Set(["2026-11-27", "2026-12-24"]);

type NyParts = {
  weekday: string;
  dateKey: string;
  hour: number;
  minute: number;
  second: number;
};

function nyParts(now: Date): NyParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

export function nyseSessionState(now: Date): NyseSessionState {
  const p = nyParts(now);
  if (p.weekday === "Sat" || p.weekday === "Sun") {
    return "CLOSED";
  }
  if (FULL_HOLIDAYS_2026.has(p.dateKey)) {
    return "CLOSED";
  }
  const minutes = p.hour * 60 + p.minute;
  const open = 9 * 60 + 30;
  const close = HALF_DAYS_2026.has(p.dateKey) ? 13 * 60 : 16 * 60;
  if (minutes >= open && minutes < close) {
    return "OPEN";
  }
  return "CLOSED";
}

export function formatNyClock(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(now);
}
