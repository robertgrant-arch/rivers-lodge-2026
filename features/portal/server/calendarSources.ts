/**
 * Calendar sources for the bookings and calendar entries the portal schema
 * owns: weddings, corporate retreats, hunt & fish bookings, ops/member events
 * and blocked dates. Exported through ./public.ts and registered at boot in
 * _core/server/calendarSources.ts. Shared rules (overlap, cancelled/lost,
 * tentative, member redaction) live in @shared/calendarFeed.
 *
 * The SQL filters are an optimisation only — collectCalendarItems re-applies
 * every rule — but they use the same overlap test so multi-day bookings that
 * cross a month boundary are found.
 */
import { and, gte, lte, notInArray, sql, type SQLWrapper } from "drizzle-orm";
import { getPortalDb } from "@core/server/db";
import { EXCLUDED_STATUSES, type CalendarSource, type RawCalendarItem } from "@shared/calendarFeed";
import { corporateBookings, huntFishBookings, portalBlockedDates, portalEvents, weddingBookings } from "../schema";

type Db = { select: (...args: any[]) => any };
type GetDb = () => Db;

// Same colours as before on both calendars.
export const PORTAL_CALENDAR_COLORS = {
  wedding: "#7D8AA3",
  corporate: "#8E9670",
  hunt_fish: "#D9B98C",
  blocked: "#8A847A",
  member_event: "#BABAAE",
  ops_event: "#C2662A",
} as const;

const HUNT_FISH_LABEL: Record<string, string> = {
  guided_hunt: "Guided hunt", self_guided_hunt: "Self-guided hunt", fishing: "Fishing", sporting_clays: "Sporting clays",
};

const excluded = EXCLUDED_STATUSES as string[];

/**
 * status NOT IN ('cancelled','lost'), compared as text: each booking table has
 * its own enum, and Postgres rejects a value the enum doesn't have (wedding,
 * corporate and hunt/fish statuses have no 'lost').
 */
export const statusNotExcluded = (col: SQLWrapper) => notInArray(sql`${col}::text`, excluded);

// ─── Pure row → item mappers (tested) ─────────────────────────────────────────

export function weddingItems(w: {
  id: number; coupleName: string | null; weddingDate: unknown; rehearsalDate?: unknown; status: string | null;
}): RawCalendarItem[] {
  const base = {
    kind: "wedding", recordId: w.id, allDay: true, status: w.status,
    href: `/ops/weddings/${w.id}`, hiddenFromMembers: true,
  };
  const out: RawCalendarItem[] = [
    { ...base, id: `wedding-${w.id}`, title: `Wedding: ${w.coupleName ?? "Wedding"}`, startDate: w.weddingDate, endDate: w.weddingDate },
  ];
  if (w.rehearsalDate) {
    out.push({ ...base, id: `wedding-${w.id}-rehearsal`, title: `Rehearsal: ${w.coupleName ?? "Wedding"}`, startDate: w.rehearsalDate, endDate: w.rehearsalDate });
  }
  return out;
}

export function corporateItem(c: {
  id: number; companyName: string | null; arrivalDate: unknown; departureDate: unknown; status: string | null;
}): RawCalendarItem {
  return {
    id: `corporate-${c.id}`, kind: "corporate", recordId: c.id, title: `Corporate: ${c.companyName ?? "Corporate"}`,
    startDate: c.arrivalDate, endDate: c.departureDate ?? c.arrivalDate, allDay: true, status: c.status,
    href: `/ops/corporate/${c.id}`, hiddenFromMembers: true,
  };
}

export function huntFishItem(h: {
  id: number; bookingType: string | null; clientName: string | null; partySize: number | null; bookingDate: unknown; status: string | null;
}): RawCalendarItem {
  const what = HUNT_FISH_LABEL[h.bookingType ?? ""] ?? "Hunt/Fish";
  const party = (h.partySize ?? 1) > 1 ? ` (${h.partySize})` : "";
  return {
    id: `huntfish-${h.id}`, kind: "hunt_fish", recordId: h.id, title: `${what}: ${h.clientName ?? "Guest"}${party}`,
    startDate: h.bookingDate, endDate: h.bookingDate, allDay: true, status: h.status,
    href: `/ops/hunt-fish/${h.id}`, hiddenFromMembers: true,
  };
}

const monthHref = (d: unknown) => {
  const m = /^(\d{4}-\d{2})/.exec(d instanceof Date ? d.toISOString() : String(d ?? ""));
  return m ? `/ops/calendar?month=${m[1]}` : "/ops/calendar";
};

export function eventItem(e: {
  id: number; title: string; type?: string | null; startDate: unknown; endDate: unknown; startTime?: string | null; endTime?: string | null;
  allDay?: boolean | null; notes?: string | null; hiddenFromMembers?: boolean | null;
}): RawCalendarItem {
  const ops = !!e.hiddenFromMembers;
  return {
    id: `${ops ? "ops" : "member"}-${e.id}`, kind: ops ? "ops_event" : "member_event", recordId: e.id,
    title: e.title, startDate: e.startDate, endDate: e.endDate ?? e.startDate,
    allDay: e.allDay ?? true, startTime: e.startTime ?? null, endTime: e.endTime ?? null,
    status: null, href: monthHref(e.startDate), hiddenFromMembers: ops, notes: e.notes ?? null,
    extra: { type: e.type ?? null },
  };
}

export function blockedItem(b: {
  id: number; title?: string | null; reason?: string | null; startDate: unknown; endDate: unknown; startTime?: string | null; endTime?: string | null;
  allDay?: boolean | null; reasonNotes?: string | null; hiddenFromMembers?: boolean | null;
}): RawCalendarItem {
  return {
    id: `blocked-${b.id}`, kind: "blocked", recordId: b.id, title: b.title || "Blocked",
    startDate: b.startDate, endDate: b.endDate ?? b.startDate,
    allDay: b.allDay ?? true, startTime: b.startTime ?? null, endTime: b.endTime ?? null,
    status: null, href: monthHref(b.startDate),
    // Same rule the Member Master Calendar uses: a hidden block only stays
    // hidden while it has a title to hide.
    hiddenFromMembers: !!(b.hiddenFromMembers && b.title),
    notes: b.reasonNotes ?? null,
    extra: { hasTitle: !!b.title, reason: b.reason ?? null },
  };
}

// ─── Sources ──────────────────────────────────────────────────────────────────

export function createWeddingCalendarSource(getDb: GetDb = getPortalDb): CalendarSource {
  return {
    kind: "wedding", label: "Wedding", color: PORTAL_CALENDAR_COLORS.wedding, marksMemberUnavailable: true,
    async listInRange(startDate, endDate) {
      const rows = await getDb().select({
        id: weddingBookings.id, coupleName: weddingBookings.coupleName, weddingDate: weddingBookings.weddingDate,
        rehearsalDate: weddingBookings.rehearsalDate, status: weddingBookings.status,
      }).from(weddingBookings).where(and(
        statusNotExcluded(weddingBookings.status),
        // Either the wedding or the rehearsal falls in the range.
        sql`((${weddingBookings.weddingDate} BETWEEN ${startDate} AND ${endDate}) OR (${weddingBookings.rehearsalDate} BETWEEN ${startDate} AND ${endDate}))`,
      ));
      return (rows as any[]).flatMap(weddingItems);
    },
  };
}

export function createCorporateCalendarSource(getDb: GetDb = getPortalDb): CalendarSource {
  return {
    kind: "corporate", label: "Corporate Group", color: PORTAL_CALENDAR_COLORS.corporate, marksMemberUnavailable: true,
    async listInRange(startDate, endDate) {
      const rows = await getDb().select({
        id: corporateBookings.id, companyName: corporateBookings.companyName, arrivalDate: corporateBookings.arrivalDate,
        departureDate: corporateBookings.departureDate, status: corporateBookings.status,
      }).from(corporateBookings).where(and(
        statusNotExcluded(corporateBookings.status),
        // Overlap, not containment: a retreat crossing a month boundary shows in both months.
        lte(corporateBookings.arrivalDate, endDate),
        gte(sql`coalesce(${corporateBookings.departureDate}, ${corporateBookings.arrivalDate})`, startDate),
      ));
      return (rows as any[]).map(corporateItem);
    },
  };
}

export function createHuntFishCalendarSource(getDb: GetDb = getPortalDb): CalendarSource {
  return {
    kind: "hunt_fish", label: "Hunt/Fish", color: PORTAL_CALENDAR_COLORS.hunt_fish, marksMemberUnavailable: true,
    async listInRange(startDate, endDate) {
      const rows = await getDb().select({
        id: huntFishBookings.id, bookingType: huntFishBookings.bookingType, clientName: huntFishBookings.clientName,
        partySize: huntFishBookings.partySize, bookingDate: huntFishBookings.bookingDate, status: huntFishBookings.status,
      }).from(huntFishBookings).where(and(
        statusNotExcluded(huntFishBookings.status),
        gte(huntFishBookings.bookingDate, startDate), lte(huntFishBookings.bookingDate, endDate),
      ));
      return (rows as any[]).map(huntFishItem);
    },
  };
}

/** Ops events (hidden from members) and Member Master Calendar events, from one table. */
function loadEvents(getDb: GetDb, startDate: string, endDate: string) {
  return getDb().select({
    id: portalEvents.id, title: portalEvents.title, type: portalEvents.type, startDate: portalEvents.startDate, endDate: portalEvents.endDate,
    startTime: portalEvents.startTime, endTime: portalEvents.endTime, allDay: portalEvents.allDay,
    notes: portalEvents.notes, hiddenFromMembers: portalEvents.hiddenFromMembers,
  }).from(portalEvents).where(and(lte(portalEvents.startDate, endDate), gte(portalEvents.endDate, startDate)));
}

export function createOpsEventCalendarSource(getDb: GetDb = getPortalDb): CalendarSource {
  return {
    kind: "ops_event", label: "Ops Event", color: PORTAL_CALENDAR_COLORS.ops_event,
    async listInRange(startDate, endDate) {
      return ((await loadEvents(getDb, startDate, endDate)) as any[]).filter((e) => !!e.hiddenFromMembers).map(eventItem);
    },
  };
}

export function createMemberEventCalendarSource(getDb: GetDb = getPortalDb): CalendarSource {
  return {
    kind: "member_event", label: "Member Event", color: PORTAL_CALENDAR_COLORS.member_event,
    async listInRange(startDate, endDate) {
      return ((await loadEvents(getDb, startDate, endDate)) as any[]).filter((e) => !e.hiddenFromMembers).map(eventItem);
    },
  };
}

export function createBlockedCalendarSource(getDb: GetDb = getPortalDb): CalendarSource {
  return {
    kind: "blocked", label: "Hold/Block", color: PORTAL_CALENDAR_COLORS.blocked, marksMemberUnavailable: true,
    async listInRange(startDate, endDate) {
      const rows = await getDb().select({
        id: portalBlockedDates.id, title: portalBlockedDates.title, reason: portalBlockedDates.reason,
        startDate: portalBlockedDates.startDate, endDate: portalBlockedDates.endDate,
        startTime: portalBlockedDates.startTime, endTime: portalBlockedDates.endTime, allDay: portalBlockedDates.allDay,
        reasonNotes: portalBlockedDates.reasonNotes, hiddenFromMembers: portalBlockedDates.hiddenFromMembers,
      }).from(portalBlockedDates)
        .where(and(lte(portalBlockedDates.startDate, endDate), gte(portalBlockedDates.endDate, startDate)));
      return (rows as any[]).map(blockedItem);
    },
  };
}

export const weddingCalendarSource = createWeddingCalendarSource();
export const corporateCalendarSource = createCorporateCalendarSource();
export const huntFishCalendarSource = createHuntFishCalendarSource();
export const opsEventCalendarSource = createOpsEventCalendarSource();
export const memberEventCalendarSource = createMemberEventCalendarSource();
export const blockedCalendarSource = createBlockedCalendarSource();
