/**
 * Trips Router — Hunt & Fish Slot Management + Trip Requests
 * Rivers Lodge & Hunt Club
 *
 * Namespaces:
 *   trpc.trips.slots.*      — public & admin slot management
 *   trpc.trips.requests.*   — member trip request lifecycle
 *   trpc.trips.admin.*      — staff-only management procedures
 */

import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from '@core/server/db';
import { router, publicProcedure, protectedProcedure } from '@core/server/trpc';
import { TRPCError } from "@trpc/server";
import { huntFishSlots, tripRequests } from '@core/db/booking-schema';
import { members, users } from '@core/db/schema';

// ─── Role helpers ─────────────────────────────────────────────────────────────

const PORTAL_ROLES = ["owner", "admin", "hunt_fish_ops", "staff", "membership_manager"];

function requirePortal(ctx: { user: { role: string } }) {
  if (!PORTAL_ROLES.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Portal access required" });
  }
}

async function getMemberForUser(userId: string) {
  const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  const [member] = await db.select().from(members).where(eq(members.userId, userId)).limit(1);
  return member ?? null;
}

// ─── Slots Sub-router ─────────────────────────────────────────────────────────

const slotsRouter = router({
  /**
   * Public availability calendar — returns open/partial/full slots for a date range.
   * Used by the Hunt and Fish public pages.
   */
  publicAvailability: publicProcedure
    .input(
      z.object({
        activity: z
          .enum([
            "duck", "deer", "turkey", "dove", "quail", "hog",
            "bass", "catfish", "crappie",
            "general_hunt", "general_fish", "hunt_and_fish",
          ])
          .optional(),
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(),   // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const conditions = [
        eq(huntFishSlots.isPublic, true),
        eq(huntFishSlots.isActive, true),
        sql`${huntFishSlots.slotDate} >= ${input.startDate}`,
        sql`${huntFishSlots.slotDate} <= ${input.endDate}`,
      ];
      if (input.activity) {
        conditions.push(eq(huntFishSlots.activity, input.activity) as any);
      }
      const rows = await db
        .select()
        .from(huntFishSlots)
        .where(and(...conditions))
        .orderBy(huntFishSlots.slotDate);

      return rows.map((s: typeof huntFishSlots.$inferSelect) => ({
        id: s.id,
        activity: s.activity,
        label: s.label,
        slotDate: s.slotDate,
        slotEndDate: s.slotEndDate,
        checkInTime: s.checkInTime,
        checkOutTime: s.checkOutTime,
        totalCapacity: s.totalCapacity,
        bookedCount: s.bookedCount,
        availableSpots: Math.max(0, s.totalCapacity - s.bookedCount),
        availabilityStatus:
          s.bookedCount >= s.totalCapacity
            ? ("full" as const)
            : s.bookedCount >= s.totalCapacity * 0.75
            ? ("limited" as const)
            : ("open" as const),
        season: s.season,
        pricePerPerson: s.pricePerPerson,
        regulatoryNotes: s.regulatoryNotes,
      }));
    }),

  /**
   * Admin: list all slots (active + inactive) with booking counts.
   */
  adminList: protectedProcedure
    .input(
      z.object({
        activity: z.string().optional(),
        season: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      requirePortal(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const conditions: any[] = [];
      if (input.activity) conditions.push(eq(huntFishSlots.activity, input.activity as any));
      if (input.season) conditions.push(eq(huntFishSlots.season, input.season as any));
      if (input.startDate) conditions.push(sql`${huntFishSlots.slotDate} >= ${input.startDate}`);
      if (input.endDate) conditions.push(sql`${huntFishSlots.slotDate} <= ${input.endDate}`);
      if (input.isActive !== undefined) conditions.push(eq(huntFishSlots.isActive, input.isActive));

      const rows = await db
        .select()
        .from(huntFishSlots)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(huntFishSlots.slotDate));
      return rows;
    }),

  /**
   * Admin: create a new slot.
   */
  create: protectedProcedure
    .input(
      z.object({
        activity: z.enum([
          "duck", "deer", "turkey", "dove", "quail", "hog",
          "bass", "catfish", "crappie",
          "general_hunt", "general_fish", "hunt_and_fish",
        ]),
        label: z.string().min(1).max(255),
        slotDate: z.string(),
        slotEndDate: z.string().optional(),
        checkInTime: z.string().optional(),
        checkOutTime: z.string().optional(),
        totalCapacity: z.number().int().min(1).max(50).default(6),
        season: z.enum(["spring", "summer", "fall", "winter", "year_round"]).default("fall"),
        regulatoryNotes: z.string().optional(),
        pricePerPerson: z.string().optional(),
        resourceId: z.number().optional(),
        guideNotes: z.string().optional(),
        isPublic: z.boolean().default(true),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requirePortal(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(huntFishSlots).values({
        ...input,
        createdByUserId: ctx.user.id,
        bookedCount: 0,
      } as any);
      return { success: true };
    }),

  /**
   * Admin: update a slot.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        label: z.string().min(1).max(255).optional(),
        slotDate: z.string().optional(),
        slotEndDate: z.string().nullable().optional(),
        checkInTime: z.string().nullable().optional(),
        checkOutTime: z.string().nullable().optional(),
        totalCapacity: z.number().int().min(1).max(50).optional(),
        season: z.enum(["spring", "summer", "fall", "winter", "year_round"]).optional(),
        regulatoryNotes: z.string().nullable().optional(),
        pricePerPerson: z.string().nullable().optional(),
        guideNotes: z.string().nullable().optional(),
        isPublic: z.boolean().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requirePortal(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, ...updates } = input;
      const filtered = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      await db.update(huntFishSlots).set(filtered as any).where(eq(huntFishSlots.id, id));
      return { success: true };
    }),

  /**
   * Admin: delete (soft-archive) a slot.
   */
  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requirePortal(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .update(huntFishSlots)
        .set({ isActive: false })
        .where(eq(huntFishSlots.id, input.id));
      return { success: true };
    }),
});

// ─── Trip Requests Sub-router ─────────────────────────────────────────────────

const requestsRouter = router({
  /**
   * Member: submit a trip request for a specific slot.
   */
  submit: protectedProcedure
    .input(
      z.object({
        slotId: z.number(),
        partySize: z.number().int().min(1).max(20).default(1),
        guestNames: z.array(z.string()).optional(),
        hasMinors: z.boolean().default(false),
        huntingLicenseConfirmed: z.boolean().default(false),
        fishingLicenseConfirmed: z.boolean().default(false),
        memberNotes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify slot exists and has capacity
      const [slot] = await db
        .select()
        .from(huntFishSlots)
        .where(and(eq(huntFishSlots.id, input.slotId), eq(huntFishSlots.isActive, true)))
        .limit(1);

      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found or inactive" });
      }

      const available = slot.totalCapacity - slot.bookedCount;
      if (available < input.partySize) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Only ${available} spot${available === 1 ? "" : "s"} remaining in this slot`,
        });
      }

      // Check for duplicate request
      const [existing] = await db
        .select({ id: tripRequests.id, status: tripRequests.status })
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.slotId, input.slotId),
            eq(tripRequests.userId, ctx.user.id),
            sql`status NOT IN ('cancelled', 'declined', 'no_show')`
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have an active request for this slot",
        });
      }

      // Look up member record
      const member = await getMemberForUser(ctx.user.id);

      await db.insert(tripRequests).values({
        slotId: input.slotId,
        userId: ctx.user.id,
        memberId: member?.id ?? null,
        partySize: input.partySize,
        guestNames: input.guestNames ?? null,
        hasMinors: input.hasMinors,
        huntingLicenseConfirmed: input.huntingLicenseConfirmed,
        fishingLicenseConfirmed: input.fishingLicenseConfirmed,
        memberNotes: input.memberNotes ?? null,
        status: "pending",
        paymentStatus: "not_required",
      } as any);

      return { success: true };
    }),

  /**
   * Member: list their own trip requests with slot details.
   */
  myRequests: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "confirmed", "declined", "waitlisted", "cancelled", "no_show", "completed"])
          .optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const conditions = [eq(tripRequests.userId, ctx.user.id)];
      if (input.status) conditions.push(eq(tripRequests.status, input.status));

      const rows = await db
        .select({
          request: tripRequests,
          slot: huntFishSlots,
        })
        .from(tripRequests)
        .leftJoin(huntFishSlots, eq(tripRequests.slotId, huntFishSlots.id))
        .where(and(...conditions))
        .orderBy(desc(tripRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  /**
   * Member: cancel their own pending/confirmed trip request.
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [req] = await db
        .select()
        .from(tripRequests)
        .where(and(eq(tripRequests.id, input.id), eq(tripRequests.userId, ctx.user.id)))
        .limit(1);

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip request not found" });
      }
      if (!["pending", "confirmed", "waitlisted"].includes(req.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel a request in status: " + req.status });
      }

      await db
        .update(tripRequests)
        .set({ status: "cancelled", memberNotes: input.reason ?? req.memberNotes })
        .where(eq(tripRequests.id, input.id));

      // If confirmed, decrement slot bookedCount
      if (req.status === "confirmed") {
        await db
          .update(huntFishSlots)
          .set({ bookedCount: sql`GREATEST(0, bookedCount - ${req.partySize})` })
          .where(eq(huntFishSlots.id, req.slotId));
      }

      return { success: true };
    }),

  /**
   * Admin: list all trip requests with member and slot details.
   */
  adminList: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        activity: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      requirePortal(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const conditions: any[] = [];
      if (input.status) conditions.push(eq(tripRequests.status, input.status as any));
      if (input.startDate) conditions.push(sql`${huntFishSlots.slotDate} >= ${input.startDate}`);
      if (input.endDate) conditions.push(sql`${huntFishSlots.slotDate} <= ${input.endDate}`);
      if (input.activity) conditions.push(eq(huntFishSlots.activity, input.activity as any));

      const rows = await db
        .select({
          request: tripRequests,
          slot: huntFishSlots,
          user: { id: users.id, email: users.email },
        })
        .from(tripRequests)
        .leftJoin(huntFishSlots, eq(tripRequests.slotId, huntFishSlots.id))
        .leftJoin(users, eq(tripRequests.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(tripRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  /**
   * Admin: approve/decline/waitlist a trip request.
   */
  review: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["confirmed", "declined", "waitlisted", "completed", "no_show"]),
        staffNotes: z.string().optional(),
        declineReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requirePortal(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [req] = await db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.id, input.id))
        .limit(1);

      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Trip request not found" });

      // If confirming, check capacity
      if (input.status === "confirmed" && req.status !== "confirmed") {
        const [slot] = await db
          .select()
          .from(huntFishSlots)
          .where(eq(huntFishSlots.id, req.slotId))
          .limit(1);
        if (slot && slot.bookedCount + req.partySize > slot.totalCapacity) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Slot only has ${slot.totalCapacity - slot.bookedCount} spots remaining`,
          });
        }
        // Increment bookedCount
        await db
          .update(huntFishSlots)
          .set({ bookedCount: sql`bookedCount + ${req.partySize}` })
          .where(eq(huntFishSlots.id, req.slotId));
      }

      // If un-confirming (declining/cancelling a previously confirmed request), decrement
      if (
        req.status === "confirmed" &&
        ["declined", "cancelled", "no_show"].includes(input.status)
      ) {
        await db
          .update(huntFishSlots)
          .set({ bookedCount: sql`GREATEST(0, bookedCount - ${req.partySize})` })
          .where(eq(huntFishSlots.id, req.slotId));
      }

      await db
        .update(tripRequests)
        .set({
          status: input.status,
          staffNotes: input.staffNotes ?? req.staffNotes,
          declineReason: input.declineReason ?? req.declineReason,
          reviewedByUserId: ctx.user.id,
          reviewedAt: new Date(),
        } as any)
        .where(eq(tripRequests.id, input.id));

      return { success: true };
    }),
});

// ─── Trips Router ─────────────────────────────────────────────────────────────

export const tripsRouter = router({
  slots: slotsRouter,
  requests: requestsRouter,
});
