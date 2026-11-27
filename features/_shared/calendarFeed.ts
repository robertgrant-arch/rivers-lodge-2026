/**
 * Calendar feed registry
 * ======================
 * Every feature that books the estate (weddings, corporate retreats, hunting
 * groups, hunt & fish, ops/member events, blocked dates…) exports a
 * CalendarSource from its server public.ts. The sources are registered once at
 * boot (_core/server/calendarSources.ts), and the calendars read from here:
 *
 *   - Ops Calendar in the ops portal   (portal.calendar.events)
 *   - staff Ops Calendar in the portal  (memberPortal.opsCalendar)
 *   - My Calendar "unavailable" dates   (memberPortal.unavailableDates)
 *
 * A new event type shows up on every calendar just by registering a source.
 *
 * Rules applied here, for every source (so a source can't get them wrong):
 *   - An item is shown when it OVERLAPS the range:
 *       start <= rangeEnd AND end >= rangeStart
 *     (a retreat from Jan 30 to Feb 2 appears in January AND February).
 *   - Items without a start date never appear. A missing end date means a
 *     one-day item.
 *   - Cancelled and lost items never appear.
 *   - Anything not confirmed (inquiry, proposal, contract out, requested…) is
 *     flagged `tentative`; the calendars draw it dashed/lighter.
 *   - Member audiences never see details of items marked hiddenFromMembers:
 *     those come back as a bare "Unavailable" entry (dates only).
 *
 * This file is shared by server and client (types + pure helpers); it has no
 * database or React imports.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarAudience = "staff" | "member";

export type CalendarViewer = {
  userId: string | null;
  role: string | null;
  audience: CalendarAudience;
};

export type CalendarItem = {
  /** Unique across all sources, e.g. "wedding-12" or "wedding-12-rehearsal". */
  id: string;
  /** Source kind ("wedding", "corporate", "hunting_group", …). */
  kind: string;
  /** Primary key of the underlying record (for edit dialogs). */
  recordId: number;
  title: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD (inclusive) */
  endDate: string;
  allDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  status: string | null;
  /** Not confirmed yet — drawn dashed/lighter. */
  tentative: boolean;
  /** Link to the record in Ops (null when there is nothing to open). */
  href: string | null;
  hiddenFromMembers: boolean;
  /** Staff-only free text (events/blocks only — never client contact details). */
  notes?: string | null;
  /** Small kind-specific extras the ops UI needs (e.g. event type for editing). */
  extra?: Record<string, string | number | boolean | null>;
};

/** What a source returns before the shared rules run (dates may be loose). */
export type RawCalendarItem = Omit<CalendarItem, "startDate" | "endDate" | "tentative"> & {
  startDate: unknown;
  endDate?: unknown;
  tentative?: boolean;
};

export type CalendarSource = {
  kind: string;
  label: string;
  /** Hex colour for dots/legend. */
  color: string;
  /** Does this source make dates "Unavailable" on members' My Calendar? */
  marksMemberUnavailable?: boolean;
  listInRange(startDate: string, endDate: string, viewer: CalendarViewer): Promise<RawCalendarItem[]>;
};

export type CalendarSourceMeta = Pick<CalendarSource, "kind" | "label" | "color">;

// ─── Status rules ─────────────────────────────────────────────────────────────

/** Never on a calendar. */
export const EXCLUDED_STATUSES: readonly string[] = ["cancelled", "lost"];

/** Solid on the calendar. Everything else with a status is tentative. */
export const CONFIRMED_STATUSES: readonly string[] = ["confirmed", "completed", "in_progress"];

export function isExcludedStatus(status: string | null | undefined): boolean {
  return !!status && EXCLUDED_STATUSES.includes(status);
}

/** No status (events, blocks) counts as confirmed. */
export function isTentativeStatus(status: string | null | undefined): boolean {
  return !!status && !CONFIRMED_STATUSES.includes(status) && !isExcludedStatus(status);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** "YYYY-MM-DD" for a date column value (string or Date), or null. */
export function toIsoDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const m = ISO_DATE.exec(String(v));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Does [start, end] overlap [rangeStart, rangeEnd]? (All inclusive, YYYY-MM-DD.) */
export function overlapsRange(start: string, end: string, rangeStart: string, rangeEnd: string): boolean {
  return start <= rangeEnd && end >= rangeStart;
}

/**
 * Every calendar date from start to end inclusive, clipped to [clipStart, clipEnd].
 * UTC arithmetic on calendar dates, so no timezone can shift a day.
 */
export function datesInRange(start: string, end: string, clipStart?: string, clipEnd?: string): string[] {
  const from = clipStart && clipStart > start ? clipStart : start;
  const to = clipEnd && clipEnd < end ? clipEnd : end;
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`).getTime();
  for (let i = 0; d.getTime() <= last && i < 1000; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Group items by every date they cover inside the range (multi-day items land on each day). */
export function itemsByDate<T extends { startDate: string; endDate: string }>(
  items: T[], rangeStart?: string, rangeEnd?: string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    for (const d of datesInRange(it.startDate, it.endDate, rangeStart, rangeEnd)) {
      const list = map.get(d);
      if (list) list.push(it);
      else map.set(d, [it]);
    }
  }
  return map;
}

// ─── Normalising ──────────────────────────────────────────────────────────────

/**
 * Apply the shared rules to one raw item. Returns null when the item must not
 * appear (no date, cancelled/lost, outside the range).
 */
export function normalizeCalendarItem(raw: RawCalendarItem, rangeStart: string, rangeEnd: string): CalendarItem | null {
  if (isExcludedStatus(raw.status)) return null;
  const start = toIsoDate(raw.startDate);
  if (!start) return null;
  let end = toIsoDate(raw.endDate) ?? start;
  if (end < start) end = start; // bad data: departure before arrival → one day
  if (!overlapsRange(start, end, rangeStart, rangeEnd)) return null;
  return {
    ...raw,
    startDate: start,
    endDate: end,
    tentative: raw.tentative ?? isTentativeStatus(raw.status),
  };
}

/** What a member may see of an item. Details of hidden items are replaced by "Unavailable". */
export function redactForMembers(item: CalendarItem): CalendarItem {
  if (!item.hiddenFromMembers) return item;
  return {
    id: `unavailable-${item.id}`,
    kind: "unavailable",
    recordId: 0,
    title: "Unavailable",
    startDate: item.startDate,
    endDate: item.endDate,
    allDay: true,
    startTime: null,
    endTime: null,
    status: null,
    tentative: false,
    href: null,
    hiddenFromMembers: true,
  };
}

export function sortCalendarItems(items: CalendarItem[]): CalendarItem[] {
  return items.sort((a, b) =>
    a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

/**
 * Read every source for a range and apply the shared rules. A source that
 * throws is logged and skipped, so one broken feature can't blank the calendar.
 */
export async function collectCalendarItems(
  sources: readonly CalendarSource[],
  startDate: string,
  endDate: string,
  viewer: CalendarViewer,
): Promise<CalendarItem[]> {
  const batches = await Promise.all(sources.map(async (s) => {
    try {
      return await s.listInRange(startDate, endDate, viewer);
    } catch (err) {
      console.error(`[calendarFeed] source "${s.kind}" failed:`, err);
      return [];
    }
  }));
  const out: CalendarItem[] = [];
  for (const raw of batches.flat()) {
    const item = normalizeCalendarItem(raw, startDate, endDate);
    if (!item) continue;
    out.push(viewer.audience === "member" ? redactForMembers(item) : item);
  }
  return sortCalendarItems(out);
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const registry = new Map<string, CalendarSource>();

/** Register (or replace) a source. Registration order is the legend order. */
export function registerCalendarSource(source: CalendarSource): void {
  registry.set(source.kind, source);
}

export function getCalendarSources(): CalendarSource[] {
  return Array.from(registry.values());
}

export function calendarSourceMeta(sources: readonly CalendarSource[] = getCalendarSources()): CalendarSourceMeta[] {
  return sources.map(({ kind, label, color }) => ({ kind, label, color }));
}

/** Tests only. */
export function clearCalendarSources(): void {
  registry.clear();
}
