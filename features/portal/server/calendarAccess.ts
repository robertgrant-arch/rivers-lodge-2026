/**
 * Member-facing calendar access.
 * ==============================
 * Master Calendar (members' estate calendar):
 *   - VIEW: admins, and signed-in users with an active member record whose
 *     skill group has "can view Master Calendar" switched on (set by admins in
 *     /ops calendar settings).
 *   - EDIT: admins only (enforced on the portal.calendar.* procedures in the
 *     admin router).
 *   - Admin preview: an admin previewing a skill group sees what that group
 *     would see. The preview group is only honoured for admins — anyone else
 *     is always checked against their own groups.
 *
 * My Calendar: a member's own bookings plus the estate's closed dates (dates
 * only — no titles, names or booking details).
 */
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { members, memberSkillGroups } from "@core/db/schema";
import { skillGroupCalendarAccess } from "@features/membership/public";
import { corporateBookings, huntFishBookings, portalBlockedDates, portalEvents, weddingBookings } from "../schema";

type Db = { select: (...args: any[]) => any };
type User = { id: string; role?: string | null } | null | undefined;

/** Active member record id for this user, or null. */
async function activeMemberId(db: Db, userId: string): Promise<number | null> {
  const [m] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.active, true)))
    .limit(1);
  return m?.id ?? null;
}

/** Does any of these skill groups have Master Calendar view access? */
async function groupsCanView(db: Db, skillGroupIds: number[]): Promise<boolean> {
  if (skillGroupIds.length === 0) return false;
  const grants: { canViewMasterCalendar: boolean }[] = await db
    .select({ canViewMasterCalendar: skillGroupCalendarAccess.canViewMasterCalendar })
    .from(skillGroupCalendarAccess)
    .where(inArray(skillGroupCalendarAccess.skillGroupId, skillGroupIds));
  return grants.some((g) => g.canViewMasterCalendar);
}

/** May this user view the Master Calendar? (See the rules at the top.) */
export async function canViewMasterCalendar(db: Db, user: User, previewSkillGroupId?: number): Promise<boolean> {
  if (!user?.id) return false;
  if (user.role === "admin") {
    return previewSkillGroupId ? groupsCanView(db, [previewSkillGroupId]) : true;
  }
  const memberId = await activeMemberId(db, user.id);
  if (memberId === null) return false;
  const groups: { skillGroupId: number }[] = await db
    .select({ skillGroupId: memberSkillGroups.skillGroupId })
    .from(memberSkillGroups)
    .where(eq(memberSkillGroups.memberId, memberId));
  return groupsCanView(db, groups.map((g) => g.skillGroupId));
}

/** May this user use My Calendar? Admins, or an active member record. */
export async function canUseMemberCalendar(db: Db, user: User): Promise<boolean> {
  if (!user?.id) return false;
  if (user.role === "admin") return true;
  return (await activeMemberId(db, user.id)) !== null;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** "YYYY-MM-DD" for a date column value (string or Date), or null. */
export function toIsoDate(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const m = ISO_DATE.exec(String(v));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * Every calendar date from start to end inclusive, as "YYYY-MM-DD", clipped to
 * [clipStart, clipEnd]. Works on calendar dates (UTC arithmetic), so no
 * timezone can shift a day.
 */
export function expandDates(start: unknown, end: unknown, clipStart: string, clipEnd: string): string[] {
  const s = toIsoDate(start);
  const e = toIsoDate(end) ?? s;
  if (!s || !e) return [];
  const from = s > clipStart ? s : clipStart;
  const to = e < clipEnd ? e : clipEnd;
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`).getTime();
  for (let i = 0; d.getTime() <= last && i < 1000; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Events members may see: anything not marked hidden from members. */
export function memberVisibleEvents<T extends { hiddenFromMembers?: boolean | null }>(rows: T[]): T[] {
  return rows.filter((e) => !e.hiddenFromMembers);
}

/** Blocks members may see: same rule the Master Calendar page used (hidden titled blocks are skipped). */
export function memberVisibleBlocks<T extends { hiddenFromMembers?: boolean | null; title?: string | null }>(rows: T[]): T[] {
  return rows.filter((b) => !(b.hiddenFromMembers && b.title));
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Master Calendar entries for members (only the fields the page shows). */
export async function loadMasterCalendar(db: Db, startDate: string, endDate: string) {
  const [events, blocks] = await Promise.all([
    db.select({
      id: portalEvents.id,
      title: portalEvents.title,
      type: portalEvents.type,
      startDate: portalEvents.startDate,
      endDate: portalEvents.endDate,
      startTime: portalEvents.startTime,
      endTime: portalEvents.endTime,
      allDay: portalEvents.allDay,
      notes: portalEvents.notes,
      hiddenFromMembers: portalEvents.hiddenFromMembers,
    })
      .from(portalEvents)
      .where(and(lte(portalEvents.startDate, endDate), gte(portalEvents.endDate, startDate), eq(portalEvents.hiddenFromMembers, false))),
    db.select({
      id: portalBlockedDates.id,
      title: portalBlockedDates.title,
      startDate: portalBlockedDates.startDate,
      endDate: portalBlockedDates.endDate,
      startTime: portalBlockedDates.startTime,
      endTime: portalBlockedDates.endTime,
      allDay: portalBlockedDates.allDay,
      reasonNotes: portalBlockedDates.reasonNotes,
      hiddenFromMembers: portalBlockedDates.hiddenFromMembers,
    })
      .from(portalBlockedDates)
      .where(and(lte(portalBlockedDates.startDate, endDate), gte(portalBlockedDates.endDate, startDate))),
  ]);
  return {
    events: memberVisibleEvents(events as any[]).map(({ hiddenFromMembers: _h, ...e }) => e),
    // Blocks are shown as "Blocked"; the title is only used for the visibility rule.
    blocked: memberVisibleBlocks(blocks as any[]).map(({ hiddenFromMembers: _h, title: _t, ...b }) => b),
  };
}

/**
 * Dates the estate is unavailable, for My Calendar: weddings, corporate
 * events, hunt/fish bookings and blocked dates. Dates only.
 */
export async function loadUnavailableDates(db: Db, startDate: string, endDate: string): Promise<string[]> {
  const [weddings, corporate, huntFish, blocked] = await Promise.all([
    db.select({ d: weddingBookings.weddingDate }).from(weddingBookings)
      .where(and(gte(weddingBookings.weddingDate, startDate), lte(weddingBookings.weddingDate, endDate))),
    db.select({ s: corporateBookings.arrivalDate, e: corporateBookings.departureDate }).from(corporateBookings)
      .where(and(lte(corporateBookings.arrivalDate, endDate), gte(corporateBookings.departureDate, startDate))),
    db.select({ d: huntFishBookings.bookingDate }).from(huntFishBookings)
      .where(and(gte(huntFishBookings.bookingDate, startDate), lte(huntFishBookings.bookingDate, endDate))),
    db.select({ s: portalBlockedDates.startDate, e: portalBlockedDates.endDate }).from(portalBlockedDates)
      .where(and(lte(portalBlockedDates.startDate, endDate), gte(portalBlockedDates.endDate, startDate))),
  ]);
  const dates = new Set<string>();
  for (const w of weddings as { d: unknown }[]) expandDates(w.d, w.d, startDate, endDate).forEach((x) => dates.add(x));
  for (const h of huntFish as { d: unknown }[]) expandDates(h.d, h.d, startDate, endDate).forEach((x) => dates.add(x));
  for (const c of corporate as { s: unknown; e: unknown }[]) expandDates(c.s, c.e, startDate, endDate).forEach((x) => dates.add(x));
  for (const b of blocked as { s: unknown; e: unknown }[]) expandDates(b.s, b.e, startDate, endDate).forEach((x) => dates.add(x));
  return Array.from(dates).sort();
}
