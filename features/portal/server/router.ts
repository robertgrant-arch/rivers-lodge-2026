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
import { TRPCError } from "@trpc/server";
import { router, memberProcedure } from "../../_core/server/trpc";
import { getDb } from "@core/server/db";
import { members, messages, bookings, memberSkillGroups, skillGroups } from "@core/db/schema";
import { eq, inArray } from "drizzle-orm";
import { calendarAccessSettings } from "../schema";
import { skillGroupCalendarAccess, canViewMemberRoster, listMemberRoster } from "@features/membership/public";

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
   * Uses skillGroupCalendarAccess table (ID-based access control).
   * If previewSkillGroupId is provided, checks that group (for preview mode).
   * Otherwise, checks the authenticated member's skill groups.
   */
  canViewMasterCalendar: memberProcedure
    .input(z.object({ previewSkillGroupId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return false;

      let skillGroupIds: number[] = [];

      // If preview mode, use the provided skill group ID directly
      if (input?.previewSkillGroupId) {
        skillGroupIds = [input.previewSkillGroupId];
      } else {
        // Otherwise, get the authenticated member's skill group IDs
        const member = await db.select().from(members).where(eq(members.userId, ctx.user.id)).limit(1);
        if (!member[0]) return false;

        const memberGroups = await db.select({ skillGroupId: memberSkillGroups.skillGroupId })
          .from(memberSkillGroups)
          .where(eq(memberSkillGroups.memberId, member[0].id));

        skillGroupIds = memberGroups.map(g => g.skillGroupId);
        if (skillGroupIds.length === 0) return false;
      }

      // Check if any of the user's skill groups have master calendar access
      const grants = await db.select({ canViewMasterCalendar: skillGroupCalendarAccess.canViewMasterCalendar })
        .from(skillGroupCalendarAccess)
        .where(inArray(skillGroupCalendarAccess.skillGroupId, skillGroupIds));

      return grants.some(g => g.canViewMasterCalendar);
    }),

  /**
   * Membership Roster: each active member's name, phone and login email,
   * sorted by name. Admins and users with an active member record only —
   * everyone else gets FORBIDDEN, so contact details never reach a caller
   * the UI would have hidden them from. (Admin preview mode works because the
   * previewing admin is the signed-in user.)
   */
  roster: memberProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    if (!(await canViewMemberRoster(db, ctx.user))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "The Membership Roster is available to members only." });
    }
    return listMemberRoster(db);
  }),
});
