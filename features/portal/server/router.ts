/**
 * Member Portal Router
 * ====================
 * Member-facing tRPC procedures for the /portal/* dashboard.
 *
 * These are thin wrappers that aggregate member-relevant data from
 * the shared DB schema. Staff/admin-facing operations live in
 * features/admin-portal/server/router.ts.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/server/trpc";
import { getDb } from "@core/server/db";
import { members, messages, bookings } from "@core/db/schema";
import { eq } from "drizzle-orm";

// ─── Portal Router (member-facing) ────────────────────────────────────────────

export const memberPortalRouter = router({
  /**
   * Returns the authenticated member's profile + membership record.
   */
  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const member = await db.query.members?.findFirst({
      where: eq(members.userId, ctx.user.id),
    });
    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
      },
      member: member ?? null,
    };
  }),

  /**
   * Returns the authenticated member's bookings (legacy bookings table).
   */
  myBookings: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(bookings).where(eq(bookings.userId, ctx.user.id));
    return rows;
  }),

  /**
   * Returns the authenticated member's concierge messages.
   */
  myMessages: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(messages).where(eq(messages.userId, ctx.user.id));
    return rows;
  }),
});
