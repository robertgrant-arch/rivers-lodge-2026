/**
 * Ops Calendar (staff only)
 * =========================
 * Who may VIEW it: admins, and users with an ACTIVE employees record that is
 * in the Admin or Employee skill group (employee_skill_groups).
 *
 * Member skill groups are deliberately NOT used. Member logins carry the
 * "employee" role, and member_skill_groups have historically been filled with
 * every group (see startup-migration), so neither the role nor a member's
 * groups can identify staff.
 *
 * Who may EDIT: admins only, in /ops/calendar (portal.calendar.* procedures).
 *
 * What's on it: everything — entries for the Ops Calendar (events hidden from
 * members), Member Master Calendar events, blocked dates, weddings, corporate
 * events and hunt/fish bookings (cancelled bookings left out). Only titles,
 * dates, times and status — no client contact details.
 */
import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { employees, employeeSkillGroups, skillGroups } from "@features/membership/public";
import { corporateBookings, huntFishBookings, portalBlockedDates, portalEvents, weddingBookings } from "../schema";
import { toIsoDate } from "./calendarAccess";

type Db = { select: (...args: any[]) => any };
type User = { id: string; role?: string | null } | null | undefined;

/** Skill group slugs whose employees may view the Ops Calendar. */
export const OPS_CALENDAR_SKILL_GROUPS = ["admin", "employee"] as const;

/** May this user view the Ops Calendar? */
export async function canViewOpsCalendar(db: Db, user: User): Promise<boolean> {
  if (!user?.id) return false;
  if (user.role === "admin") return true;
  const [emp] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.userId, user.id), eq(employees.active, true)))
    .limit(1);
  if (!emp) return false;
  const groups: { slug: string }[] = await db
    .select({ slug: skillGroups.slug })
    .from(employeeSkillGroups)
    .innerJoin(skillGroups, eq(employeeSkillGroups.skillGroupId, skillGroups.id))
    .where(and(eq(employeeSkillGroups.employeeId, emp.id), eq(skillGroups.active, true)));
  return groups.some((g) => (OPS_CALENDAR_SKILL_GROUPS as readonly string[]).includes(String(g.slug).toLowerCase()));
}

export type OpsCalendarEntry = {
  key: string;
  kind: "ops_event" | "member_event" | "blocked" | "wedding" | "corporate" | "hunt_fish";
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  status: string | null;
  notes: string | null;
};

const HUNT_FISH_LABEL: Record<string, string> = {
  guided_hunt: "Guided hunt", self_guided_hunt: "Self-guided hunt", fishing: "Fishing", sporting_clays: "Sporting clays",
};

/** Turn raw rows into one sorted list of calendar entries. Pure (tested). */
export function toOpsEntries(rows: {
  events: any[]; blocked: any[]; weddings: any[]; corporate: any[]; huntFish: any[];
}): OpsCalendarEntry[] {
  const out: OpsCalendarEntry[] = [];
  const push = (e: Omit<OpsCalendarEntry, "startDate" | "endDate"> & { startDate: unknown; endDate: unknown }) => {
    const s = toIsoDate(e.startDate);
    const en = toIsoDate(e.endDate) ?? s;
    if (!s || !en) return;
    out.push({ ...e, startDate: s, endDate: en });
  };
  for (const e of rows.events) {
    const ops = !!e.hiddenFromMembers;
    push({
      key: `${ops ? "ops" : "member"}-${e.id}`, kind: ops ? "ops_event" : "member_event", id: e.id,
      title: e.title, startDate: e.startDate, endDate: e.endDate, startTime: e.startTime ?? null, endTime: e.endTime ?? null,
      allDay: e.allDay ?? true, status: null, notes: e.notes ?? null,
    });
  }
  for (const b of rows.blocked) {
    push({
      key: `blocked-${b.id}`, kind: "blocked", id: b.id, title: b.title || "Blocked",
      startDate: b.startDate, endDate: b.endDate, startTime: b.startTime ?? null, endTime: b.endTime ?? null,
      allDay: b.allDay ?? true, status: null, notes: b.reasonNotes ?? null,
    });
  }
  for (const w of rows.weddings) {
    push({
      key: `wedding-${w.id}`, kind: "wedding", id: w.id, title: `Wedding: ${w.coupleName}`,
      startDate: w.weddingDate, endDate: w.weddingDate, startTime: null, endTime: null, allDay: true, status: w.status, notes: null,
    });
  }
  for (const c of rows.corporate) {
    push({
      key: `corporate-${c.id}`, kind: "corporate", id: c.id, title: `Corporate: ${c.companyName}`,
      startDate: c.arrivalDate, endDate: c.departureDate ?? c.arrivalDate, startTime: null, endTime: null, allDay: true, status: c.status, notes: null,
    });
  }
  for (const h of rows.huntFish) {
    const what = HUNT_FISH_LABEL[h.bookingType] ?? "Hunt/Fish";
    push({
      key: `huntfish-${h.id}`, kind: "hunt_fish", id: h.id,
      title: `${what}: ${h.clientName}${h.partySize > 1 ? ` (${h.partySize})` : ""}`,
      startDate: h.bookingDate, endDate: h.bookingDate, startTime: null, endTime: null, allDay: true, status: h.status, notes: null,
    });
  }
  return out.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
}

/** Load the Ops Calendar for a date range. Callers must check canViewOpsCalendar first. */
export async function loadOpsCalendar(db: Db, startDate: string, endDate: string): Promise<OpsCalendarEntry[]> {
  const [events, blocked, weddings, corporate, huntFish] = await Promise.all([
    db.select({
      id: portalEvents.id, title: portalEvents.title, startDate: portalEvents.startDate, endDate: portalEvents.endDate,
      startTime: portalEvents.startTime, endTime: portalEvents.endTime, allDay: portalEvents.allDay,
      notes: portalEvents.notes, hiddenFromMembers: portalEvents.hiddenFromMembers,
    }).from(portalEvents)
      .where(and(lte(portalEvents.startDate, endDate), gte(portalEvents.endDate, startDate))),
    db.select({
      id: portalBlockedDates.id, title: portalBlockedDates.title, startDate: portalBlockedDates.startDate, endDate: portalBlockedDates.endDate,
      startTime: portalBlockedDates.startTime, endTime: portalBlockedDates.endTime, allDay: portalBlockedDates.allDay,
      reasonNotes: portalBlockedDates.reasonNotes,
    }).from(portalBlockedDates)
      .where(and(lte(portalBlockedDates.startDate, endDate), gte(portalBlockedDates.endDate, startDate))),
    db.select({ id: weddingBookings.id, coupleName: weddingBookings.coupleName, weddingDate: weddingBookings.weddingDate, status: weddingBookings.status })
      .from(weddingBookings)
      .where(and(gte(weddingBookings.weddingDate, startDate), lte(weddingBookings.weddingDate, endDate), ne(weddingBookings.status, "cancelled"))),
    db.select({
      id: corporateBookings.id, companyName: corporateBookings.companyName, arrivalDate: corporateBookings.arrivalDate,
      departureDate: corporateBookings.departureDate, status: corporateBookings.status,
    }).from(corporateBookings)
      // A booking without a departure date is a one-day event on its arrival date.
      .where(and(lte(corporateBookings.arrivalDate, endDate), gte(sql`coalesce(${corporateBookings.departureDate}, ${corporateBookings.arrivalDate})`, startDate), ne(corporateBookings.status, "cancelled"))),
    db.select({
      id: huntFishBookings.id, bookingType: huntFishBookings.bookingType, clientName: huntFishBookings.clientName,
      partySize: huntFishBookings.partySize, bookingDate: huntFishBookings.bookingDate, status: huntFishBookings.status,
    }).from(huntFishBookings)
      .where(and(gte(huntFishBookings.bookingDate, startDate), lte(huntFishBookings.bookingDate, endDate), ne(huntFishBookings.status, "cancelled"))),
  ]);
  return toOpsEntries({ events, blocked, weddings, corporate, huntFish });
}

