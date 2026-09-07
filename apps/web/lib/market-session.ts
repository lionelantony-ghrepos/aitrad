export type { NyseSessionState } from "@meridian/mock-data";
import { NY_TZ, nyseSessionState as sessionState } from "@meridian/mock-data";

export function nyseSessionState(now: Date) {
  return sessionState(now);
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
