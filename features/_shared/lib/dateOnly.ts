/**
 * Date-only values (Postgres `date` columns such as members.joinDate /
 * renewalDate) are calendar dates, not instants. The API returns them as
 * "YYYY-MM-DD" strings and they must be shown and saved exactly as stored,
 * whatever the viewer's timezone.
 *
 * Never pass them to `new Date("YYYY-MM-DD")` and format in local time: JS
 * parses that as UTC midnight, which is the previous evening anywhere in the
 * Americas, so Jul 4 displays as Jul 3. Likewise never derive "today" with
 * `toISOString().split("T")[0]`, which is the UTC date (tomorrow, during US
 * evenings).
 *
 * Pure functions, safe for client and server.
 */

/** The Lodge's local timezone (La Cygne, Kansas). */
export const LODGE_TIME_ZONE = "America/Chicago";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;

/** "YYYY-MM-DD" (or an ISO string starting with one) → the calendar part, else null. */
export function toDateOnlyString(value: string | Date | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    // A Date that came from a date-only value is midnight UTC on that date.
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  const m = DATE_ONLY.exec(value.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Value for an <input type="date"> from a stored date-only value ("" if none). */
export function toDateInputValue(value: string | Date | null | undefined): string {
  return toDateOnlyString(value) ?? "";
}

/**
 * Format a stored date-only value as e.g. "Jul 4, 2026", identical in every
 * timezone. Returns `empty` for null/blank/unparseable values.
 */
export function formatDateOnly(value: string | Date | null | undefined, empty = "—"): string {
  const iso = toDateOnlyString(value);
  if (!iso) return empty;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Today's calendar date ("YYYY-MM-DD") in the given IANA timezone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Today's calendar date ("YYYY-MM-DD") in the viewer's own timezone. */
export function todayLocal(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
