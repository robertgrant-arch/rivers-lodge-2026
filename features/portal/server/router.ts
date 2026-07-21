/**
 * Member Portal Router
 * ====================
 * Member-facing tRPC procedures for the /portal/* dashboard.
 *
 * These are thin wrappers that aggregate member-relevant data from
 * the shared DB schema. Staff/admin-facing operations live in
 * features/admin/server/router.ts.
 */

import { router, memberProcedure } from "../../_core/server/trpc";
import { getDb } from "@core/server/db";
import { members, messages, bookings, memberSkillGroups, skillGroups } from "@core/db/schema";
import { eq } from "drizzle-orm";
import { calendarAccessSettings } from "../schema";

// ─── Portal Router (member-facing) ────────────────────────────────────────────

export const memberPortalRouter = router({
  /**
   * Returns the authenticated member's profile + membership record.
   */
  myProfile: memberProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const member = db
      ? (await db.select().from(members).where(eq(members.userId, ctx.user.id)).limit(1))[0] ?? null
      : null;
    return {
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        role: ctx.user.role,
      },
      member,
    };
  }),

  /**
   * Returns the authenticated member's bookings (legacy bookings table).
   */
  myBookings: memberProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(bookings).where(eq(bookings.userId, ctx.user.id));
    return rows;
  }),

  /**
   * Returns the authenticated member's concierge messages.
   */
  myMessages: memberProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(messages).where(eq(messages.fromUserId, ctx.user.id));
    return rows;
  }),

  /**
   * Checks if the authenticated member can view the master calendar based on their skill groups.
   */
  canViewMasterCalendar: memberProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return false;

    const member = await db.select().from(members).where(eq(members.userId, ctx.user.id)).limit(1);
    if (!member[0]) return false;

    const memberGroups = await db.select({ name: skillGroups.name })
      .from(memberSkillGroups)
      .innerJoin(skillGroups, eq(memberSkillGroups.skillGroupId, skillGroups.id))
      .where(eq(memberSkillGroups.memberId, member[0].id));

    const groupNames = memberGroups.map(g => g.name);
    if (groupNames.length === 0) return false;

    const accessSettings = await db.select()
      .from(calendarAccessSettings)
      .where(eq(calendarAccessSettings.settingKey, "master_calendar_skill_groups"))
      .limit(1);

    if (!accessSettings[0]) {
      const defaults = ["Designated", "Admin", "Employee"];
      return groupNames.some(name => defaults.includes(name));
    }

    const allowedGroups = JSON.parse(accessSettings[0].settingValue) as string[];
    return groupNames.some(name => allowedGroups.includes(name));
  }),
});
