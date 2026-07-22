/**
 * Member Portal Router
 * ====================
 * Member-facing tRPC procedures for the /portal/* dashboard.
 *
 * These are thin wrappers that aggregate member-relevant data from
 * the shared DB schema. Staff/admin-facing operations live in
 * features/admin/server/router.ts.
 */

import { z } from "zod";
import { router, memberProcedure } from "../../_core/server/trpc";
import { getDb } from "@core/server/db";
import { members, messages, bookings, memberSkillGroups, skillGroups } from "@core/db/schema";
import { eq, inArray } from "drizzle-orm";
import { calendarAccessSettings } from "../schema";
import { skillGroupCalendarAccess } from "@features/membership/public";

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
   * Checks if a member or preview skill group can view the master calendar.
   * If previewSkillGroupId is provided, checks that group's access (for preview mode).
   * Otherwise, checks the authenticated member's skill groups via skillGroupCalendarAccess table.
   */
  canViewMasterCalendar: memberProcedure
    .input(z.object({ previewSkillGroupId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return false;

      // If preview mode, check if the preview skill group has access
      if (input?.previewSkillGroupId) {
        const access = await db.select()
          .from(skillGroupCalendarAccess)
          .where(eq(skillGroupCalendarAccess.skillGroupId, input.previewSkillGroupId))
          .limit(1);
        return access[0]?.canViewMasterCalendar ?? false;
      }

      // Otherwise, check the authenticated member's skill groups
      const member = await db.select().from(members).where(eq(members.userId, ctx.user.id)).limit(1);
      if (!member[0]) return false;

      const memberGroupIds = await db.select({ skillGroupId: memberSkillGroups.skillGroupId })
        .from(memberSkillGroups)
        .where(eq(memberSkillGroups.memberId, member[0].id));

      if (memberGroupIds.length === 0) return false;

      const ids = memberGroupIds.map(g => g.skillGroupId);
      const hasAccess = await db.select()
        .from(skillGroupCalendarAccess)
        .where(inArray(skillGroupCalendarAccess.skillGroupId, ids))
        .limit(1);

      return hasAccess[0]?.canViewMasterCalendar ?? false;
    }),
});
