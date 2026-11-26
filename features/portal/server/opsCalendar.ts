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
 * What's on it: everything registered in the calendar feed — Ops Calendar
 * entries (events hidden from members), Member Master Calendar events, blocked
 * dates, weddings (and rehearsals), corporate retreats, hunting groups and
 * hunt/fish bookings. Cancelled/lost bookings are left out; unconfirmed ones
 * are flagged tentative. Only titles, dates, times and status — no client
 * contact details.
 */
import { and, eq } from "drizzle-orm";
import { employees, employeeSkillGroups, skillGroups } from "@features/membership/public";
import {
  calendarSourceMeta, collectCalendarItems, getCalendarSources,
  type CalendarItem, type CalendarSource, type CalendarSourceMeta,
} from "@shared/calendarFeed";

type Db = { select: (...args: any[]) => any };
type User = { id: string; role?: string | null } | null | undefined;

/** Skill group slugs whose employees may view the Ops Calendar. */
export const OPS_CALENDAR_SKILL_GROUPS = ["admin", "employee"] as const;

const isOpsGroupSlug = (slug: unknown) =>
  (OPS_CALENDAR_SKILL_GROUPS as readonly string[]).includes(String(slug ?? "").toLowerCase());

/**
 * May this user view the Ops Calendar?
 * Admin preview: an admin previewing a skill group sees what that group would
 * see — yes for the Admin/Employee groups, no for member groups. The preview
 * group is ignored for everyone except admins.
 */
export async function canViewOpsCalendar(db: Db, user: User, previewSkillGroupId?: number): Promise<boolean> {
  if (!user?.id) return false;
  if (user.role === "admin") {
    if (!previewSkillGroupId) return true;
    const [g] = await db
      .select({ slug: skillGroups.slug })
      .from(skillGroups)
      .where(and(eq(skillGroups.id, previewSkillGroupId), eq(skillGroups.active, true)))
      .limit(1);
    return !!g && isOpsGroupSlug(g.slug);
  }
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
  return groups.some((g) => isOpsGroupSlug(g.slug));
}

/**
 * Load the Ops Calendar for a date range from the calendar feed registry
 * (every registered source — weddings, corporate, hunting groups, hunt & fish,
 * events, blocks…). Callers must check canViewOpsCalendar first.
 */
export async function loadOpsCalendar(
  startDate: string,
  endDate: string,
  viewer: { id: string; role?: string | null },
  sources: readonly CalendarSource[] = getCalendarSources(),
): Promise<{ items: CalendarItem[]; sources: CalendarSourceMeta[] }> {
  const items = await collectCalendarItems(sources, startDate, endDate, {
    userId: viewer.id, role: viewer.role ?? null, audience: "staff",
  });
  return { items, sources: calendarSourceMeta(sources) };
}
