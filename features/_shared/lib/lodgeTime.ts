/**
 * Lodge-time instants (America/Chicago), independent of the server's timezone.
 * Check-in/arrival for a booking is 00:00 Lodge time on its first day.
 */
import { LODGE_TIME_ZONE } from "./dateOnly";

/** Offset (ms) of `timeZone` from UTC at instant `ms` (e.g. −5 h for CDT). */
function zoneOffsetMs(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Epoch ms of 00:00 on `dateStr` ("YYYY-MM-DD") in `timeZone` (default Lodge time). */
export function lodgeMidnight(dateStr: string, timeZone: string = LODGE_TIME_ZONE): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (!m) throw new Error(`Invalid date: ${dateStr}`);
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  let ms = guess - zoneOffsetMs(guess, timeZone);
  ms = guess - zoneOffsetMs(ms, timeZone);
  return ms;
}

/** "YYYY-MM-DD" of `date` plus `days`. */
export function addDaysYmd(date: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return d.toISOString().slice(0, 10);
}
