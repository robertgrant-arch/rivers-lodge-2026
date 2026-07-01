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
import { members, messages, bookings } from "@core/db/schema";
import { eq } from "drizzle-orm";

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
});
