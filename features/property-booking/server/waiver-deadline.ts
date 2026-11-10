/**
 * Waiver Deadline & Overdue Status Computation
 * =============================================
 * The rule (all times are Lodge time, America/Chicago):
 *
 * 1. Check-in is midnight (00:00) at the start of the booking's first day.
 * 2. Lead time = check-in minus the moment the booking was made.
 * 3. The deadline is set once, from the lead time, and never moves:
 *    - booked more than 12 hours before check-in → due 12 hours before check-in
 *    - booked more than 1 hour, up to 12 hours before → due 1 hour before check-in
 *    - booked 1 hour or less before check-in (or after it) → due at check-in
 * 4. A waiver that isn't signed (pending, sent or overdue) is overdue as soon as
 *    the current time is past its deadline — possibly before check-in.
 *    A signed (completed) waiver is never overdue.
 * 5. pending/sent → overdue once the deadline passes; completed and overdue
 *    stay as they are.
 *
 * Previously the tier was chosen from the *current* time, so the deadline kept
 * moving later as check-in approached (a waiver could never become overdue
 * before check-in), and check-in was midnight in the server's timezone (UTC
 * on Render = 7 pm Central the day before).
 */

export type WaiverStatus = "pending" | "sent" | "completed" | "overdue";

export const LODGE_TIME_ZONE = "America/Chicago";

const HOUR_MS = 60 * 60 * 1000;
/** Lead time above which the normal 12-hour deadline applies. */
export const NORMAL_LEAD_HOURS = 12;
/** Lead time above which the short-notice 1-hour deadline applies. */
export const SHORT_NOTICE_LEAD_HOURS = 1;

export interface WaiverDeadlineInput {
  /** Booking's first day, "YYYY-MM-DD" (a calendar date at the Lodge). */
  checkInDate: string;
  /** When the booking was made (epoch ms). Fixes the deadline tier. */
  bookedAt: number;
  waiverStatus: WaiverStatus;
  /** Current time (epoch ms). Defaults to Date.now(). */
  now?: number;
}

export interface WaiverDeadlineResult {
  /** Check-in instant (epoch ms): midnight Lodge time on checkInDate. */
  checkIn: number;
  /** Deadline (epoch ms). */
  deadline: number;
  /** Which rule set the deadline. */
  tier: "normal" | "short_notice" | "urgent";
  /** True if not signed and now is past the deadline. */
  isOverdue: boolean;
  /** Hours from now until the deadline (negative once past). */
  hoursUntilDue: number;
}

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

/** Epoch ms of 00:00 on `dateStr` ("YYYY-MM-DD") in `timeZone`. */
export function midnightInZone(dateStr: string, timeZone: string = LODGE_TIME_ZONE): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (!m) throw new Error(`Invalid check-in date: ${dateStr}`);
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Two passes handle a DST change between the guess and the true instant.
  let ms = guess - zoneOffsetMs(guess, timeZone);
  ms = guess - zoneOffsetMs(ms, timeZone);
  return ms;
}

/** Compute the waiver deadline (fixed by lead time) and overdue state. */
export function computeWaiverDeadline(input: WaiverDeadlineInput): WaiverDeadlineResult {
  const now = input.now ?? Date.now();
  const checkIn = midnightInZone(input.checkInDate);
  const leadHours = (checkIn - input.bookedAt) / HOUR_MS;

  let tier: WaiverDeadlineResult["tier"];
  let deadline: number;
  if (leadHours > NORMAL_LEAD_HOURS) {
    tier = "normal";
    deadline = checkIn - NORMAL_LEAD_HOURS * HOUR_MS;
  } else if (leadHours > SHORT_NOTICE_LEAD_HOURS) {
    tier = "short_notice";
    deadline = checkIn - SHORT_NOTICE_LEAD_HOURS * HOUR_MS;
  } else {
    tier = "urgent";
    deadline = checkIn;
  }

  const isOverdue = input.waiverStatus !== "completed" && now > deadline;
  return { checkIn, deadline, tier, isOverdue, hoursUntilDue: (deadline - now) / HOUR_MS };
}

/**
 * Next status: pending/sent → overdue once past the deadline;
 * completed and overdue are unchanged.
 */
export function getNextWaiverStatus(input: WaiverDeadlineInput): WaiverStatus {
  const s = input.waiverStatus;
  if (s === "completed" || s === "overdue") return s;
  return computeWaiverDeadline(input).isOverdue ? "overdue" : s;
}

/** Format a deadline in Lodge time, e.g. "Aug 14, 2026 at 12:00 PM CDT". */
export function formatWaiverDeadline(deadlineMs: number): string {
  const d = new Date(deadlineMs);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: LODGE_TIME_ZONE });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: LODGE_TIME_ZONE, timeZoneName: "short" });
  return `${date} at ${time}`;
}
