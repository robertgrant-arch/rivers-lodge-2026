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
import { members, messages, bookings } from "@core/db/schema";
import { eq } from "drizzle-orm";
import { calendarAccessSettings } from "../schema";
import { canViewMemberRoster, listMemberRoster } from "@features/membership/public";
import { canUseMemberCalendar, canViewMasterCalendar, loadMasterCalendar, loadUnavailableDates } from "./calendarAccess";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
/** Start ≤ end, at most ~13 months per request. */
const validRange = (r: { startDate: string; endDate: string }) =>
  r.startDate <= r.endDate && (Date.parse(r.endDate) - Date.parse(r.startDate)) / 86_400_000 <= 400;
const dateRangeFields = { startDate: isoDate, endDate: isoDate };
const dateRangeInput = z.object(dateRangeFields).refine(validRange, "Invalid date range");
const masterCalendarInput = z
  .object({ ...dateRangeFields, previewSkillGroupId: z.number().int().positive().optional() })
  .refine(validRange, "Invalid date range");

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
   * May the caller view the Master Calendar? Admins always; members when one
   * of their skill groups has view access. `previewSkillGroupId` (admin preview
   * mode) is honoured for admins only — see calendarAccess.ts.
   */
  canViewMasterCalendar: memberProcedure
    .input(z.object({ previewSkillGroupId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return false;
      return canViewMasterCalendar(db, ctx.user, input?.previewSkillGroupId);
    }),

  /**
   * Master Calendar entries (member events + blocked dates) for members whose
   * skill group allows it, and admins. Everyone else gets FORBIDDEN.
   * Read-only: editing is admin-only via portal.calendar.* in the ops portal.
   */
  masterCalendar: memberProcedure
    .input(masterCalendarInput)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      if (!(await canViewMasterCalendar(db, ctx.user, input.previewSkillGroupId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your membership doesn't include the Master Calendar." });
      }
      return loadMasterCalendar(db, input.startDate, input.endDate);
    }),

  /**
   * Estate closed dates for My Calendar (dates only). Admins and active members.
   */
  unavailableDates: memberProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      if (!(await canUseMemberCalendar(db, ctx.user))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "My Calendar is available to members only." });
      }
      return loadUnavailableDates(db, input.startDate, input.endDate);
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
