/**
 * Property Booking Router
 * =======================
 * Enterprise-grade hunting property booking backend.
 *
 * Namespaces:
 *   properties.*         — Public property listing and detail
 *   bookings.*           — Member self-booking (protected)
 *   admin.properties.*   — Admin property CRUD (admin only)
 *   admin.bookings.*     — Admin booking management (admin only)
 *   admin.inventory.*    — Availability inventory management (admin only)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from '@core/server/trpc';
import { getDb } from '@core/server/db';
import { storagePut } from '@core/server/storage';
import {
  huntingProperties,
  propertySeasons,
  propertyBookingRules,
  propertyPricing,
  propertyDateInventory,
  propertyBookings,
  bookingAddOns,
  bookingPayments,
  bookingAuditLog,
  harvestReports,
  propertyBlockedDates,
  bookingWaitlist,
  propertyImages,
  propertyAmenities,
  propertyActivities,
} from '@core/db/property-booking-schema';
import { members } from '@core/db/schema';
import { eq, and, gte, lte, sql, desc, asc, or, isNull, ne } from "drizzle-orm";
import { nanoid } from "nanoid";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = () => Date.now();

/** Generate a human-readable booking reference: RL-2026-00042 */
async function generateBookingRef(db: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RL-${year}-`;
  const result = await db!
    .select({ id: propertyBookings.id })
    .from(propertyBookings)
    .orderBy(desc(propertyBookings.id))
    .limit(1);
  const nextNum = (result[0]?.id ?? 0) + 1;
  return `${prefix}${String(nextNum).padStart(5, "0")}`;
}

/** Append an audit log entry */
async function auditLog(
  db: any,
  bookingId: number,
  action: string,
  performedByUserId: number,
  fromValue?: unknown,
  toValue?: unknown,
  notes?: string,
) {
  await db!.insert(bookingAuditLog).values({
    bookingId,
    action,
    fromValue: fromValue !== undefined ? JSON.stringify(fromValue) : null,
    toValue: toValue !== undefined ? JSON.stringify(toValue) : null,
    performedByUserId,
    performedAt: now(),
    notes: notes ?? null,
  } as any);
}

/** Update the property_date_inventory counter atomically (slot-aware) */
async function updateInventory(
  db: any,
  propertyId: number,
  date: string,
  timeSlot: "AM" | "PM" | "ALL_DAY" | "OVERNIGHT",
  delta: number, // +1 for booking, -1 for cancellation
) {
  // Slot-aware inventory update:
  // - Increment the appropriate slot counter (amBookedCount, pmBookedCount, allDayBookedCount, overnightBookedCount)
  // - Recalculate status:
  //   - 'full' ONLY if: ALL_DAY or OVERNIGHT exists, OR both AM and PM are at capacity
  //   - 'open' otherwise (no legacy 'partial' tier)
  // - Keep bookedCount as sum of all slot counts for backward compat

  const [prop] = await db!
    .select({ maxHunters: huntingProperties.maxHunters })
    .from(huntingProperties)
    .where(eq(huntingProperties.id, propertyId))
    .limit(1);
  const capacity = prop?.maxHunters ?? 2;

  const [existing] = await db!
    .select({
      amBookedCount: propertyDateInventory.amBookedCount,
      pmBookedCount: propertyDateInventory.pmBookedCount,
      allDayBookedCount: propertyDateInventory.allDayBookedCount,
      overnightBookedCount: propertyDateInventory.overnightBookedCount,
    })
    .from(propertyDateInventory)
    .where(and(eq(propertyDateInventory.propertyId, propertyId), eq(propertyDateInventory.date, date)))
    .limit(1);

  // Calculate new slot counts
  const amCount = Math.max(0, (existing?.amBookedCount ?? 0) + (timeSlot === "AM" ? delta : 0));
  const pmCount = Math.max(0, (existing?.pmBookedCount ?? 0) + (timeSlot === "PM" ? delta : 0));
  const allDayCount = Math.max(0, (existing?.allDayBookedCount ?? 0) + (timeSlot === "ALL_DAY" ? delta : 0));
  const overnightCount = Math.max(0, (existing?.overnightBookedCount ?? 0) + (timeSlot === "OVERNIGHT" ? delta : 0));
  const totalBooked = amCount + pmCount + allDayCount + overnightCount;

  // Determine status based on exclusive slot model:
  // Full only if: (1) ALL_DAY or OVERNIGHT booking exists, OR (2) both AM and PM have bookings
  let status: "open" | "full";
  if (allDayCount > 0 || overnightCount > 0) {
    // ALL_DAY or OVERNIGHT exists = entire day full
    status = "full";
  } else if (amCount > 0 && pmCount > 0) {
    // Both AM and PM booked = entire day full (exclusive slots)
    status = "full";
  } else {
    // One or both half-day slots open = day still bookable
    status = "open";
  }

  await db!
    .insert(propertyDateInventory)
    .values({
      propertyId,
      date,
      capacity,
      bookedCount: totalBooked,
      amBookedCount: amCount,
      pmBookedCount: pmCount,
      allDayBookedCount: allDayCount,
      overnightBookedCount: overnightCount,
      status,
      version: 0,
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: [propertyDateInventory.propertyId, propertyDateInventory.date],
      set: {
        capacity,
        bookedCount: totalBooked,
        amBookedCount: amCount,
        pmBookedCount: pmCount,
        allDayBookedCount: allDayCount,
        overnightBookedCount: overnightCount,
        status,
        version: sql`${propertyDateInventory.version} + 1`,
        updatedAt: now(),
      },
    });
}

/** Get a member record for the current user, throwing if not found */
async function requireMember(db: any, userId: string) {
  const rows = await db!.select().from(members).where(eq(members.userId, userId)).limit(1);
  if (!rows[0]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Active membership required to book hunting properties.",
    });
  }
  if (!rows[0].active) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your membership is currently inactive. Please contact the lodge.",
    });
  }
  return rows[0];
}

/** Admin guard */
function requireAdmin(role: string) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
}

// ─── Backfill Migration Helpers ───────────────────────────────────────────────

/** Backfill null bookingModes with safe defaults (for PR #57 compatibility) */
async function backfillBookingModes(db: any): Promise<number> {
  const properties = await db
    .select({ id: huntingProperties.id })
    .from(huntingProperties)
    .where(isNull(huntingProperties.bookingModes));

  let updated = 0;
  for (const prop of properties) {
    await db
      .update(huntingProperties)
      .set({ bookingModes: ["AM", "PM"], updatedAt: now() })
      .where(eq(huntingProperties.id, prop.id));
    updated++;
  }
  return updated;
}

/** Backfill null overnightEnabled with true (for PR #57 compatibility) */
async function backfillOvernightEnabled(db: any): Promise<number> {
  const properties = await db
    .select({ id: huntingProperties.id })
    .from(huntingProperties)
    .where(isNull(huntingProperties.overnightEnabled));

  let updated = 0;
  for (const prop of properties) {
    await db
      .update(huntingProperties)
      .set({ overnightEnabled: true, updatedAt: now() })
      .where(eq(huntingProperties.id, prop.id));
    updated++;
  }
  return updated;
}

// ─── Input Schemas ────────────────────────────────────────────────────────────

const createBookingInput = z.object({
  propertyId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.number().int().min(1).max(20),
  activity: z.enum([
    "deer", "duck", "turkey", "quail", "dove", "hog",
    "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish", "scouting",
  ]),
  timeSlot: z.enum(["AM", "PM", "ALL_DAY", "OVERNIGHT"]).optional(),
  guestNames: z.array(z.string().max(100)).optional(),
  hasMinors: z.boolean().optional(),
  huntingLicenseConfirmed: z.boolean().optional(),
  fishingLicenseConfirmed: z.boolean().optional(),
  memberNotes: z.string().max(1000).optional(),
  idempotencyKey: z.string().uuid(),
  addOns: z.array(z.object({
    type: z.enum(["guide", "atv", "dog_handler", "cleaning", "meals", "ammo", "gear_rental", "photography", "other"]),
    description: z.string().max(200).optional(),
    quantity: z.number().int().min(1).default(1),
  })).optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const propertyBookingRouter = router({

  // ── Public: Property Listing ───────────────────────────────────────────────

  properties: router({

    /** List all active properties, optionally filtered by activity */
    list: publicProcedure
      .input(z.object({
        activity: z.string().optional(),
        type: z.string().optional(),
        includeInactive: z.boolean().optional(),
      }).optional())
      .query(async ({ input }: { input: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const conditions = [];
        if (!input?.includeInactive) conditions.push(eq(huntingProperties.active, true));
        if (input?.type) conditions.push(eq(huntingProperties.type, input.type as any));

        const props = await db
          .select()
          .from(huntingProperties)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(asc(huntingProperties.sortOrder), asc(huntingProperties.name));

        // Fetch activities from join table and cover images
        const propIds = props.map((p: any) => p.id);
        const [images, activitiesData] = await Promise.all([
          propIds.length
            ? db
                .select()
                .from(propertyImages)
                .where(and(
                  sql`${propertyImages.propertyId} IN (${sql.join(propIds.map((id: any) => sql`${id}`), sql`, `)})`,
                  eq(propertyImages.type, "cover"),
                  eq(propertyImages.active, true),
                ))
            : [],
          propIds.length
            ? db
                .select()
                .from(propertyActivities)
                .where(sql`${propertyActivities.propertyId} IN (${sql.join(propIds.map((id: any) => sql`${id}`), sql`, `)})`)
            : [],
        ]);

        const imageMap = new Map(images.map((img: any) => [img.propertyId, img.url]));
        const activitiesMap = new Map<number, string[]>();
        for (const act of activitiesData) {
          const arr = activitiesMap.get(act.propertyId) ?? [];
          arr.push(act.activity);
          activitiesMap.set(act.propertyId, arr);
        }

        // Filter by activity if requested (check join table, not primaryActivity)
        let result = props;
        if (input?.activity) {
          result = props.filter((p: any) => {
            const acts = activitiesMap.get(p.id) ?? [];
            return acts.includes(input.activity);
          });
        }

        // Normalize response: provide safe defaults for nullable JSON fields
        return result.map((p: any) => ({
          ...p,
          activities: activitiesMap.get(p.id) ?? [],
          coverImageUrl: p.coverImageUrl ?? imageMap.get(p.id) ?? null,
          bookingModes: Array.isArray(p.bookingModes) ? p.bookingModes : ["AM", "PM"],
          secondaryActivities: Array.isArray(p.secondaryActivities) ? p.secondaryActivities : null,
          maxWaterfowlHunters: p.maxWaterfowlHunters ?? null,
          maxTotalPeople: p.maxTotalPeople ?? null,
          overnightEnabled: p.overnightEnabled ?? true,
        }));
      }),

    /** List all available activities for properties */
    activities: publicProcedure
      .query(async () => {
        const activityEnum = [
          "deer", "duck", "turkey", "quail", "dove", "hog",
          "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
        ];
        return activityEnum.map((value) => ({
          value,
          label: value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        }));
      }),

    /** Get a single property by ID with full details */
    detail: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }: { input: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const [property] = await db
          .select()
          .from(huntingProperties)
          .where(eq(huntingProperties.id, input.id))
          .limit(1);

        if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

        const [rules, seasons, amenities, images, activitiesData] = await Promise.all([
          db.select().from(propertyBookingRules).where(eq(propertyBookingRules.propertyId, input.id)).limit(1),
          db.select().from(propertySeasons)
            .where(and(eq(propertySeasons.propertyId, input.id), eq(propertySeasons.active, true)))
            .orderBy(asc(propertySeasons.startDate)),
          db.select().from(propertyAmenities).where(eq(propertyAmenities.propertyId, input.id)),
          db.select().from(propertyImages)
            .where(and(eq(propertyImages.propertyId, input.id), eq(propertyImages.active, true)))
            .orderBy(asc(propertyImages.sortOrder)),
          db.select().from(propertyActivities).where(eq(propertyActivities.propertyId, input.id)),
        ]);

        const activities = activitiesData.map((a: any) => a.activity);

        // Normalize response: provide safe defaults for nullable fields
        const normalized = {
          ...property,
          activities,
          bookingModes: Array.isArray(property.bookingModes) ? property.bookingModes : ["AM", "PM"],
          secondaryActivities: Array.isArray(property.secondaryActivities) ? property.secondaryActivities : null,
          maxWaterfowlHunters: property.maxWaterfowlHunters ?? null,
          maxTotalPeople: property.maxTotalPeople ?? null,
          overnightEnabled: property.overnightEnabled ?? true,
        };

        return { property: normalized, rules: rules[0] ?? null, seasons, amenities, images };
      }),

    /** Get availability for a property over a date range */
    availability: publicProcedure
      .input(z.object({
        propertyId: z.number().int().positive(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }))
      .query(async ({ input }: { input: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const [property] = await db
          .select({ id: huntingProperties.id, maxHunters: huntingProperties.maxHunters })
          .from(huntingProperties)
          .where(eq(huntingProperties.id, input.propertyId))
          .limit(1);

        if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

        // Get active seasons for this property
        const seasons = await db
          .select()
          .from(propertySeasons)
          .where(and(
            eq(propertySeasons.propertyId, input.propertyId),
            eq(propertySeasons.active, true),
          ));

        // Build a set of in-season date strings (union of all active seasons)
        const inSeasonDates = new Set<string>();
        const seasonByDate = new Map<string, string>(); // date → season name
        for (const s of seasons) {
          const sStart = new Date(s.startDate);
          const sEnd = new Date(s.endDate);
          // Normalize to UTC midnight to avoid timezone drift
          sStart.setUTCHours(0, 0, 0, 0);
          sEnd.setUTCHours(0, 0, 0, 0);
          let d = new Date(sStart);
          while (d <= sEnd) {
            const ds = d.toISOString().split("T")[0];
            inSeasonDates.add(ds);
            seasonByDate.set(ds, s.name);
            d.setUTCDate(d.getUTCDate() + 1);
          }
        }
        // If no seasons defined, all dates are open (no restriction)
        const hasSeasons = seasons.length > 0;

        // Get inventory rows for the date range
        const inventory = await db
          .select()
          .from(propertyDateInventory)
          .where(and(
            eq(propertyDateInventory.propertyId, input.propertyId),
            gte(propertyDateInventory.date, input.startDate as any),
            lte(propertyDateInventory.date, input.endDate as any),
          ));

        // Get blocked dates for this property (or all-property blocks)
        const blocked = await db
          .select()
          .from(propertyBlockedDates)
          .where(and(
            or(
              eq(propertyBlockedDates.propertyId, input.propertyId),
              isNull(propertyBlockedDates.propertyId),
            ),
            lte(propertyBlockedDates.startDate, input.endDate as any),
            gte(propertyBlockedDates.endDate, input.startDate as any),
          ));

        // Build a set of blocked date strings
        const blockedDates = new Set<string>();
        for (const b of blocked) {
          let d = new Date(b.startDate);
          const end = new Date(b.endDate);
          while (d <= end) {
            blockedDates.add(d.toISOString().split("T")[0]);
            d.setDate(d.getDate() + 1);
          }
        }

        const inventoryMap = new Map(inventory.map((row: any) => [
          typeof row.date === "string" ? row.date : (row.date as Date).toISOString().split("T")[0],
          row,
        ]));

        // Helper: compute per-slot status
        // Compute per-slot status
        // Exclusive slot model: each slot can accommodate at most ONE booking group.
        // Capacity (maxHunters) only limits headcount within that one group, NOT slot occupancy.
        // So any confirmed booking marks the slot as 'full', regardless of capacity.
        function getSlotStatus(inv: any, slotKey: "amBookedCount" | "pmBookedCount" | "allDayBookedCount" | "overnightBookedCount"): "open" | "full" {
          // If any booking exists for this slot, it's full (exclusive to that group)
          return (inv?.[slotKey] ?? 0) > 0 ? "full" : "open";
        }

        // Generate a day-by-day availability array with per-slot status
        const result: Array<{
          date: string;
          status: "open" | "full" | "blocked" | "closed";
          amStatus: "open" | "full";
          pmStatus: "open" | "full";
          allDayStatus: "open" | "full";
          overnightStatus: "open" | "full";
          capacity: number;
          bookedCount: number;
          availableSpots: number;
          seasonName?: string;
        }> = [];

        let cursor = new Date(input.startDate);
        const end = new Date(input.endDate);

        while (cursor <= end) {
          // Use UTC methods (getUTCDate, toISOString) to ensure consistent date extraction
          // regardless of server timezone. This guarantees dates match client-side calendar keys.
          const dateStr = cursor.toISOString().split("T")[0];
          const inv = inventoryMap.get(dateStr);
          const isBlocked = blockedDates.has(dateStr);
          const isInSeason = !hasSeasons || inSeasonDates.has(dateStr);
          const seasonName = seasonByDate.get(dateStr);
          // Use inventory capacity if valid (> 0), otherwise fall back to property's maxHunters
          const cap = (inv?.capacity && inv.capacity > 0) ? inv.capacity : property.maxHunters;

          if (!isInSeason) {
            // Out of season — closed, not bookable
            result.push({
              date: dateStr,
              status: "closed",
              amStatus: "open",
              pmStatus: "open",
              allDayStatus: "open",
              overnightStatus: "open",
              capacity: 0,
              bookedCount: 0,
              availableSpots: 0,
            });
          } else if (isBlocked) {
            // Blocked — all slots blocked
            result.push({
              date: dateStr,
              status: "blocked",
              amStatus: "open",
              pmStatus: "open",
              allDayStatus: "open",
              overnightStatus: "open",
              capacity: 0,
              bookedCount: 0,
              availableSpots: 0,
              seasonName,
            });
          } else if (inv) {
            // Compute per-slot status (exclusive model: any booking → full)
            const amStatus = getSlotStatus(inv, "amBookedCount");
            const pmStatus = getSlotStatus(inv, "pmBookedCount");
            const allDayStatus = getSlotStatus(inv, "allDayBookedCount");
            const overnightStatus = getSlotStatus(inv, "overnightBookedCount");

            // Compute aggregate status: use per-slot status directly (no legacy "partial" tier)
            let aggregateStatus: "open" | "full" | "blocked" | "closed";
            if (inv.status === "blocked" || inv.status === "closed") {
              aggregateStatus = inv.status;
            } else if ((inv.capacity == null || inv.capacity <= 0) && inv.bookedCount === 0) {
              aggregateStatus = "open";
            } else if (inv.status === "full") {
              aggregateStatus = "full";
            } else {
              aggregateStatus = "open";
            }

            result.push({
              date: dateStr,
              status: aggregateStatus,
              amStatus,
              pmStatus,
              allDayStatus,
              overnightStatus,
              capacity: cap, // Use effective capacity (maxHunters if inv capacity is invalid)
              bookedCount: inv.bookedCount,
              availableSpots: Math.max(0, cap - inv.bookedCount),
              seasonName,
            });
          } else {
            // No inventory row = open at full capacity
            result.push({
              date: dateStr,
              status: "open",
              amStatus: "open",
              pmStatus: "open",
              allDayStatus: "open",
              overnightStatus: "open",
              capacity: property.maxHunters,
              bookedCount: 0,
              availableSpots: property.maxHunters,
              seasonName,
            });
          }

          // Increment cursor using UTC methods to ensure consistent date iteration
          // regardless of server timezone (prevents off-by-one-day bugs)
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        return result;
      }),

    /** Get availability for all active properties over a date range (for the property browser) */
    allAvailability: publicProcedure
      .input(z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        activity: z.string().optional(),
      }))
      .query(async ({ input }: { input: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const conditions = [eq(huntingProperties.active, true)];
        if (input.activity) conditions.push(eq(huntingProperties.primaryActivity, input.activity as any));

        const props = await db
          .select({ id: huntingProperties.id, maxHunters: huntingProperties.maxHunters })
          .from(huntingProperties)
          .where(and(...conditions));

        if (!props.length) return {};

        const propIds = props.map((p: any) => p.id);
        const capacityMap = new Map(props.map((p: any) => [p.id, p.maxHunters]));

        const inventory = await db
          .select()
          .from(propertyDateInventory)
          .where(and(
            sql`${propertyDateInventory.propertyId} IN (${sql.join(propIds.map((id: any) => sql`${id}`), sql`, `)})`,
            gte(propertyDateInventory.date, input.startDate as any),
            lte(propertyDateInventory.date, input.endDate as any),
          ));

        // Group by propertyId → date → status
        const result: Record<number, Record<string, { status: string; available: number }>> = {};
        for (const row of inventory) {
          const dateStr = typeof row.date === "string" ? row.date : (row.date as Date).toISOString().split("T")[0];
          if (!result[row.propertyId]) result[row.propertyId] = {};
          result[row.propertyId][dateStr] = {
            status: row.status,
            available: Math.max(0, row.capacity - row.bookedCount),
          };
        }

        // Fill in open dates for properties with no inventory row
        for (const prop of props) {
          if (!result[prop.id]) result[prop.id] = {};
        }

        return result;
      }),
  }),

  // ── Member: Self-Booking ───────────────────────────────────────────────────

  bookings: router({

    /** Create a new booking */
    create: protectedProcedure
      .input(createBookingInput)
      .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        // requireMember is an auth/authorization check — run outside the
        // transaction so a missing membership throws early without consuming
        // a connection from the pool.
        const member = await requireMember(db, ctx.user.id);

        return await db.transaction(async (tx) => {
          // ── Idempotency (inside tx so the re-check is serialised) ──────────
          const existing = await tx
            .select({ id: propertyBookings.id, bookingRef: propertyBookings.bookingRef })
            .from(propertyBookings)
            .where(eq(propertyBookings.idempotencyKey, input.idempotencyKey))
            .limit(1);
          if (existing[0]) {
            return { bookingId: existing[0].id, bookingRef: existing[0].bookingRef, alreadyExisted: true };
          }

          // ── Load property and rules ────────────────────────────────────────
          const [property] = await tx
            .select()
            .from(huntingProperties)
            .where(and(eq(huntingProperties.id, input.propertyId), eq(huntingProperties.active, true)))
            .limit(1);
          if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found or inactive." });

          const [rules] = await tx
            .select()
            .from(propertyBookingRules)
            .where(eq(propertyBookingRules.propertyId, input.propertyId))
            .limit(1);

          // NOTE: Property access control now driven by propertySkillGroupAccess table.
          // Tier-based access checks removed; use skill group membership to determine property access.

          // ── Time slot validation ──────────────────────────────────────────
          const bookingModes = Array.isArray(property.bookingModes) ? property.bookingModes : ["AM", "PM"];
          const overnightEnabled = property.overnightEnabled ?? true;
          let timeSlot = input.timeSlot ?? "ALL_DAY";

          // Validate requested timeSlot against property's allowed modes
          if (timeSlot === "OVERNIGHT") {
            if (!overnightEnabled) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "This property does not support overnight bookings.",
              });
            }
          } else if (timeSlot === "AM" || timeSlot === "PM") {
            if (!bookingModes.includes(timeSlot)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `This property does not support ${timeSlot} bookings. Available slots: ${bookingModes.join(", ")}.`,
              });
            }
          }
          // ALL_DAY is always allowed if bookingModes includes AM and PM

          // ── Party size ────────────────────────────────────────────────────
          // Activity-aware validation: hunting activities check maxHunters,
          // non-hunting activities check maxGuests
          const huntingActivities = ["deer", "duck", "turkey", "quail", "dove", "hog", "mixed_hunt", "hunt_and_fish", "scouting"];
          const isHuntingActivity = huntingActivities.includes(input.activity);

          if (isHuntingActivity) {
            const maxCapacity = property.maxHunters ?? 0;
            if (input.partySize > maxCapacity) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `This property allows a maximum of ${maxCapacity} hunter${maxCapacity === 1 ? '' : 's'}.`,
              });
            }
          } else {
            const maxCapacity = property.maxGuests ?? 0;
            if (input.partySize > maxCapacity) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `This property allows a maximum of ${maxCapacity} guest${maxCapacity === 1 ? '' : 's'}.`,
              });
            }
          }

          // ── Blocked dates ─────────────────────────────────────────────────
          const blockedCheck = await tx
            .select()
            .from(propertyBlockedDates)
            .where(and(
              or(
                eq(propertyBlockedDates.propertyId, input.propertyId),
                isNull(propertyBlockedDates.propertyId),
              ),
              lte(propertyBlockedDates.startDate, input.endDate as any),
              gte(propertyBlockedDates.endDate, input.startDate as any),
            ))
            .limit(1);
          if (blockedCheck[0]) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "One or more of the requested dates are blocked. Please choose different dates.",
            });
          }

          // ── Per-date inventory check — FOR UPDATE ─────────────────────────
          // Locking inventory rows prevents two concurrent bookings from both
          // reading "open" and both proceeding to insert.  The second
          // transaction blocks on FOR UPDATE until the first commits.
          let cursor = new Date(input.startDate);
          const endDate = new Date(input.endDate);
          while (cursor <= endDate) {
            const dateStr = cursor.toISOString().split("T")[0];
            const [inv] = await tx
              .select({
                status: propertyDateInventory.status,
                capacity: propertyDateInventory.capacity,
                bookedCount: propertyDateInventory.bookedCount,
              })
              .from(propertyDateInventory)
              .where(and(
                eq(propertyDateInventory.propertyId, input.propertyId),
                eq(propertyDateInventory.date, dateStr as any),
              ))
              .for("update")
              .limit(1);

            if (inv && inv.status === "full") {
              throw new TRPCError({
                code: "CONFLICT",
                message: `${dateStr} is fully booked. Please choose different dates or join the waitlist.`,
              });
            }
            if (inv && inv.status === "blocked") {
              throw new TRPCError({
                code: "CONFLICT",
                message: `${dateStr} is not available for booking.`,
              });
            }
            cursor.setDate(cursor.getDate() + 1);
          }

          // ── Member double-booking check — FOR UPDATE ───────────────────────
          // Lock the member's existing booking rows so a concurrent submission
          // can't slip past this check before either commit.
          const conflictCheck = await tx
            .select({ id: propertyBookings.id, bookingRef: propertyBookings.bookingRef })
            .from(propertyBookings)
            .where(and(
              eq(propertyBookings.memberId, member.id),
              sql`${propertyBookings.status} NOT IN ('cancelled', 'declined', 'no_show')`,
              lte(propertyBookings.startDate, input.endDate as any),
              gte(propertyBookings.endDate, input.startDate as any),
            ))
            .for("update")
            .limit(1);
          if (conflictCheck[0]) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `You already have a booking (${conflictCheck[0].bookingRef}) overlapping these dates.`,
            });
          }

          // ── All checks passed — write ──────────────────────────────────────
          const start = new Date(input.startDate);
          const end = new Date(input.endDate);
          const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          const requiresApproval = rules?.requiresApproval ?? false;
          const status = requiresApproval ? "pending_approval" : "confirmed";

          const bookingRef = await generateBookingRef(tx as any);

          const insertResult = await tx.insert(propertyBookings).values({
            bookingRef,
            idempotencyKey: input.idempotencyKey,
            memberId: member.id,
            userId: ctx.user.id,
            propertyId: input.propertyId,
            startDate: input.startDate as any,
            endDate: input.endDate as any,
            totalDays,
            partySize: input.partySize,
            guestNames: input.guestNames ?? null,
            hasMinors: input.hasMinors ?? false,
            activity: input.activity,
            timeSlot: timeSlot as any,
            huntingLicenseConfirmed: input.huntingLicenseConfirmed ?? false,
            fishingLicenseConfirmed: input.fishingLicenseConfirmed ?? false,
            status,
            requiresApproval,
            totalAmount: "0",
            depositAmount: "0",
            depositPaid: "0",
            balanceDue: "0",
            memberNotes: input.memberNotes ?? null,
            createdAt: now(),
            updatedAt: now(),
          } as any).returning({ id: propertyBookings.id });

          if (!insertResult[0]?.id) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to retrieve booking ID after insertion",
            });
          }
          const bookingId = insertResult[0].id;

          if (input.addOns?.length) {
            await tx.insert(bookingAddOns).values(
              input.addOns.map((ao: any) => ({
                bookingId,
                type: ao.type,
                description: ao.description ?? null,
                quantity: ao.quantity,
                unitPrice: "0",
                totalPrice: "0",
                createdAt: now(),
              } as any)),
            );
          }

          if (status === "confirmed") {
            let d = new Date(input.startDate);
            const e = new Date(input.endDate);
            let dayCount = 0;
            const totalRangeDays = Math.round((e.getTime() - new Date(input.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

            while (d <= e) {
              const dateStr = d.toISOString().split("T")[0];
              let slotToUpdate = timeSlot as any;

              // For overnight bookings spanning multiple dates, differentiate first/last/middle dates
              if (timeSlot === "OVERNIGHT" && totalRangeDays > 1) {
                if (dayCount === 0) {
                  // First date: overnight takes the PM slot
                  slotToUpdate = "PM";
                } else if (dayCount === totalRangeDays - 1) {
                  // Last date: overnight takes the AM slot
                  slotToUpdate = "AM";
                } else {
                  // Middle dates: overnight takes the entire day
                  slotToUpdate = "ALL_DAY";
                }
              }

              await updateInventory(tx, input.propertyId, dateStr, slotToUpdate, 1);
              d.setDate(d.getDate() + 1);
              dayCount++;
            }
          }

          await auditLog(tx, bookingId, "booking_created", ctx.user.id, null, { status, bookingRef });

          return { bookingId, bookingRef, status, alreadyExisted: false };
        });
      }),

    /** List the current member's bookings */
    myBookings: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }).optional())
      .query(async ({ ctx, input }: { ctx: any; input: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const member = await requireMember(db, ctx.user.id);

        const conditions = [eq(propertyBookings.memberId, member.id)];
        if (input?.status) conditions.push(eq(propertyBookings.status, input.status as any));

        const bookings = await db
          .select()
          .from(propertyBookings)
          .where(and(...conditions))
          .orderBy(desc(propertyBookings.startDate))
          .limit(input?.limit ?? 20)
          .offset(input?.offset ?? 0);

        // Attach property names
        const propIds = Array.from(new Set(bookings.map((b: any) => b.propertyId)));
        const props = propIds.length
          ? await db
              .select({ id: huntingProperties.id, name: huntingProperties.name, shortName: huntingProperties.shortName, coverImageUrl: huntingProperties.coverImageUrl })
              .from(huntingProperties)
              .where(sql`${huntingProperties.id} IN (${sql.join(propIds.map((id: any) => sql`${id}`), sql`, `)})`)
          : [];
        const propMap = new Map(props.map((p: any) => [p.id, p]));

        return bookings.map((b: any) => ({
          ...b,
          property: propMap.get(b.propertyId) ?? null,
        }));
      }),

    /** Get a single booking by ID (member can only see their own) */
    detail: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }: { ctx: any; input: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const member = await requireMember(db, ctx.user.id);

        const [booking] = await db
          .select()
          .from(propertyBookings)
          .where(and(
            eq(propertyBookings.id, input.id),
            eq(propertyBookings.memberId, member.id),
          ))
          .limit(1);

        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });

        const [property, addOns, payments, auditLogs] = await Promise.all([
          db.select().from(huntingProperties).where(eq(huntingProperties.id, booking.propertyId)).limit(1),
          db.select().from(bookingAddOns).where(eq(bookingAddOns.bookingId, booking.id)),
          db.select().from(bookingPayments).where(eq(bookingPayments.bookingId, booking.id)).orderBy(desc(bookingPayments.createdAt)),
          db.select().from(bookingAuditLog).where(eq(bookingAuditLog.bookingId, booking.id)).orderBy(asc(bookingAuditLog.performedAt)),
        ]);

        return { booking, property: property[0] ?? null, addOns, payments, auditLogs };
      }),

    /** Cancel a booking */
    cancel: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        reason: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const member = await requireMember(db, ctx.user.id);

        const [booking] = await db
          .select()
          .from(propertyBookings)
          .where(and(
            eq(propertyBookings.id, input.id),
            eq(propertyBookings.memberId, member.id),
          ))
          .limit(1);

        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });

        if (["cancelled", "completed", "no_show", "declined"].includes(booking.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This booking cannot be cancelled." });
        }

        const prevStatus = booking.status;
        const cancelledAt = now();

        await db
          .update(propertyBookings)
          .set({
            status: "cancelled",
            cancelledAt,
            cancellationReason: input.reason ?? null,
            cancelledByUserId: ctx.user.id,
            updatedAt: cancelledAt,
          } as any)
          .where(eq(propertyBookings.id, input.id));

        // Release inventory — decrement slot counts for all dates in the booking
        // Only for statuses where inventory was incremented (confirmed, checked_in)
        // All other cancellations (pending_approval, declined) never reserved inventory
        const statusesWithReservedInventory = ["confirmed", "checked_in"];
        if (statusesWithReservedInventory.includes(prevStatus)) {
          let d = new Date(booking.startDate);
          const e = new Date(booking.endDate);
          let dayCount = 0;
          const totalRangeDays = Math.round((e.getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

          while (d <= e) {
            const dateStr = d.toISOString().split("T")[0];
            let slotToRelease = booking.timeSlot as any;

            // For overnight bookings spanning multiple dates, use matching slot logic from creation
            if (booking.timeSlot === "OVERNIGHT" && totalRangeDays > 1) {
              if (dayCount === 0) {
                // First date: overnight took the PM slot
                slotToRelease = "PM";
              } else if (dayCount === totalRangeDays - 1) {
                // Last date: overnight took the AM slot
                slotToRelease = "AM";
              } else {
                // Middle dates: overnight took the entire day
                slotToRelease = "ALL_DAY";
              }
            }

            // For backward-compatibility: check if old booking has overnightBookedCount but slot-specific counts are 0
            // If so, decrement overnightBookedCount instead of the slot-specific count
            const [inv] = await db
              .select({
                amBookedCount: propertyDateInventory.amBookedCount,
                pmBookedCount: propertyDateInventory.pmBookedCount,
                allDayBookedCount: propertyDateInventory.allDayBookedCount,
                overnightBookedCount: propertyDateInventory.overnightBookedCount,
              })
              .from(propertyDateInventory)
              .where(and(eq(propertyDateInventory.propertyId, booking.propertyId), eq(propertyDateInventory.date, dateStr)))
              .limit(1);

            let finalSlotToRelease = slotToRelease;
            if (booking.timeSlot === "OVERNIGHT" && inv) {
              // Check if this is an old booking: overnightBookedCount > 0 and the slot we're trying to decrement is 0
              const slotCount =
                (slotToRelease === "PM" ? inv.pmBookedCount : 0) ||
                (slotToRelease === "AM" ? inv.amBookedCount : 0) ||
                (slotToRelease === "ALL_DAY" ? inv.allDayBookedCount : 0) ||
                0;
              if (slotCount === 0 && inv.overnightBookedCount > 0) {
                finalSlotToRelease = "OVERNIGHT";
              }
            }

            await updateInventory(db, booking.propertyId, dateStr, finalSlotToRelease, -1);
            d.setDate(d.getDate() + 1);
            dayCount++;
          }
        }

        await auditLog(db, input.id, "booking_cancelled", ctx.user.id, prevStatus, "cancelled", input.reason);

        return { success: true };
      }),

    /** Join the waitlist for a property on a specific date */
    joinWaitlist: protectedProcedure
      .input(z.object({
        propertyId: z.number().int().positive(),
        requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        partySize: z.number().int().min(1).max(20).default(1),
        activity: z.string().optional(),
        memberNotes: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const member = await requireMember(db, ctx.user.id);

        // Check not already on waitlist
        const existing = await db
          .select({ id: bookingWaitlist.id })
          .from(bookingWaitlist)
          .where(and(
            eq(bookingWaitlist.memberId, member.id),
            eq(bookingWaitlist.propertyId, input.propertyId),
            eq(bookingWaitlist.requestedDate, input.requestedDate as any),
            sql`${bookingWaitlist.status} IN ('waiting', 'notified')`,
          ))
          .limit(1);

        if (existing[0]) {
          throw new TRPCError({ code: "CONFLICT", message: "You are already on the waitlist for this date." });
        }

        await db.insert(bookingWaitlist).values({
          memberId: member.id,
          userId: ctx.user.id,
          propertyId: input.propertyId,
          requestedDate: input.requestedDate as any,
          partySize: input.partySize,
          activity: (input.activity as any) ?? null,
          status: "waiting",
          memberNotes: input.memberNotes ?? null,
          createdAt: now(),
        } as any);

        return { success: true };
      }),

    /** Submit a harvest report */
    submitHarvestReport: protectedProcedure
      .input(z.object({
        bookingId: z.number().int().positive(),
        huntDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        activity: z.enum([
          "deer", "duck", "turkey", "quail", "dove", "hog",
          "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
        ]),
        harvested: z.boolean(),
        species: z.string().max(80).optional(),
        count: z.number().int().min(1).optional(),
        weightLbs: z.number().positive().optional(),
        antlerPoints: z.number().int().min(0).optional(),
        antlerSpread: z.number().positive().optional(),
        weatherConditions: z.string().max(100).optional(),
        temperatureF: z.number().int().optional(),
        notes: z.string().max(2000).optional(),
        photoUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const member = await requireMember(db, ctx.user.id);

        const [booking] = await db
          .select()
          .from(propertyBookings)
          .where(and(
            eq(propertyBookings.id, input.bookingId),
            eq(propertyBookings.memberId, member.id),
          ))
          .limit(1);

        if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });

        const ts = now();
        const dueBy = ts + 7 * 24 * 60 * 60 * 1000;

        await db.insert(harvestReports).values({
          bookingId: input.bookingId,
          memberId: member.id,
          propertyId: booking.propertyId,
          huntDate: input.huntDate as any,
          activity: input.activity,
          harvested: input.harvested,
          species: input.species ?? null,
          count: input.count ?? (input.harvested ? 1 : 0),
          weightLbs: input.weightLbs ? String(input.weightLbs) : null,
          antlerPoints: input.antlerPoints ?? null,
          antlerSpread: input.antlerSpread ? String(input.antlerSpread) : null,
          weatherConditions: input.weatherConditions ?? null,
          temperatureF: input.temperatureF ?? null,
          notes: input.notes ?? null,
          photoUrl: input.photoUrl ?? null,
          submittedAt: ts,
          dueBy,
          isOverdue: false,
          createdAt: ts,
        } as any);

        return { success: true };
      }),
  }),

  // ── Admin: Property & Booking Management ──────────────────────────────────

  admin: router({

    properties: router({

      /** Create a new property */
      create: protectedProcedure
        .input(z.object({
          name: z.string().min(2).max(120),
          slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
          shortName: z.string().max(40).optional(),
          type: z.enum(["stand", "blind", "field", "pond", "creek", "food_plot", "zone", "lodge"]),
          primaryActivity: z.enum([
            "deer", "duck", "turkey", "quail", "dove", "hog",
            "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
          ]).optional(),
          secondaryActivities: z.array(z.string()).optional(),
          activities: z.array(z.enum([
            "deer", "duck", "turkey", "quail", "dove", "hog",
            "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
          ])).optional(),
          description: z.string().optional(),
          shortDescription: z.string().max(280).optional(),
          acreage: z.number().positive().optional(),
          maxHunters: z.number().int().min(0).max(50).default(2),
          maxDeerHunters: z.number().int().min(0).default(0),
          maxWaterfowlHunters: z.number().int().min(0).optional(),
          maxUplandHunters: z.number().int().min(0).default(0),
          maxGuests: z.number().int().min(0).default(0),
          maxTotalPeople: z.number().int().min(0).optional(),
          bookingModes: z.array(z.enum(["AM", "PM", "Overnight"])).optional(),
          overnightEnabled: z.boolean().optional(),
          hasHeatedBlind: z.boolean().optional(),
          hasAtvAccess: z.boolean().optional(),
          hasWaterAccess: z.boolean().optional(),
          hasElectricity: z.boolean().optional(),
          hasCellService: z.boolean().optional(),
          gpsLat: z.number().optional(),
          gpsLng: z.number().optional(),
          locationNotes: z.string().max(300).optional(),
          coverImageUrl: z.string().url().optional(),
          mapImageUrl: z.string().url().optional(),
          mapUrl: z.string().url().optional(),
          gateCode: z.string().max(255).optional(),
          active: z.boolean().default(true),
          featuredOnPublicSite: z.boolean().default(true),
          sortOrder: z.number().int().default(0),
        }))
        .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
          try {
            requireAdmin(ctx.user.role);

            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

            const ts = now();
            const insertValues = {
              ...input,
              primaryActivity: input.primaryActivity ?? null,
              secondaryActivities: input.secondaryActivities ?? null,
              acreage: input.acreage ?? null,
              gpsLat: input.gpsLat ?? null,
              gpsLng: input.gpsLng ?? null,
              coverImageUrl: input.coverImageUrl ?? null,
              mapImageUrl: input.mapImageUrl ?? null,
              mapUrl: input.mapUrl ?? null,
              gateCode: input.gateCode ?? null,
              maxDeerHunters: input.maxDeerHunters ?? 0,
              maxWaterfowlHunters: input.maxWaterfowlHunters ?? null,
              maxUplandHunters: input.maxUplandHunters ?? 0,
              maxGuests: input.maxGuests ?? 0,
              maxTotalPeople: input.maxTotalPeople ?? null,
              bookingModes: input.bookingModes ?? ["AM", "PM"],
              overnightEnabled: input.overnightEnabled ?? true,
              shortName: input.shortName ?? null,
              shortDescription: input.shortDescription ?? null,
              description: input.description ?? null,
              locationNotes: input.locationNotes ?? null,
              hasHeatedBlind: input.hasHeatedBlind ?? false,
              hasAtvAccess: input.hasAtvAccess ?? false,
              hasWaterAccess: input.hasWaterAccess ?? false,
              hasElectricity: input.hasElectricity ?? false,
              hasCellService: input.hasCellService ?? true,
              createdAt: ts,
              updatedAt: ts,
            };

            const result = await db.insert(huntingProperties).values(insertValues as any).returning();

            // Extract inserted ID from Drizzle result
            // With .returning(), result is an array of inserted rows
            const insertedRow = result?.[0];
            const propertyId = insertedRow?.id;

            if (!propertyId) {
              console.error("[admin.properties.create] propertyId extraction failed. Result structure:", JSON.stringify(result));
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to extract property ID from insert result: received ${JSON.stringify(result)}`
              });
            }

            // Save selected activities to join table
            if (input.activities && input.activities.length > 0) {
              const activityRows = input.activities.map((activity: string) => ({
                propertyId,
                activity,
              }));
              await db.insert(propertyActivities).values(activityRows as any);
            }

            // Create default booking rules
            await db.insert(propertyBookingRules).values({
              propertyId,
              advanceBookingDays: 6,
              minAdvanceHours: 24,
              maxConsecutiveDays: 3,
              maxDaysPerSeason: 10,
              requiresApproval: false,
              allowGuests: true,
              maxGuestsPerBooking: 1,
              guestCountsAgainstAllotment: true,
              cancellationHours: 24,
              lateCancellationFee: "0",
              harvestReportRequired: true,
              harvestReportDays: 7,
              blockBookingsIfReportOverdue: true,
              openingDaysUseLottery: false,
              lotteryOpeningDays: 2,
              overbookingPercent: 0,
              updatedAt: ts,
            } as any);
            return { propertyId };
          } catch (error) {
            console.error("[admin.properties.create] CAUGHT ERROR:");
            console.error("  type:", error?.constructor?.name);
            console.error("  message:", error instanceof Error ? error.message : String(error));
            console.error("  stack:", error instanceof Error ? error.stack : "N/A");

            const pgCode = (error as any)?.code;
            const pgDetail = (error as any)?.detail;
            const pgMessage = (error as any)?.message;

            if (pgCode) console.error("  PostgreSQL code:", pgCode);
            if (pgDetail) console.error("  PostgreSQL detail:", pgDetail);

            if (error instanceof TRPCError) throw error;

            // Parse PostgreSQL error codes for user-friendly messages
            let userMessage = "Failed to create property";
            if (pgCode === "23502") {
              const match = pgDetail?.match(/Key \((\w+)\)=/) || [];
              const field = match[1] || "unknown field";
              userMessage = `Missing required field: ${field}`;
            } else if (pgCode === "23514") {
              userMessage = "One or more field values failed validation constraints";
            } else if (pgCode === "22P02") {
              userMessage = "Invalid value for enum field (type, activity, etc.)";
            } else if (pgCode === "23505") {
              userMessage = "Property slug already exists";
            } else if (pgMessage) {
              userMessage = pgMessage;
            }

            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: userMessage,
            });
          }
        }),

      /** Update a property */
      update: protectedProcedure
        .input(z.object({
          id: z.number().int().positive(),
          name: z.string().min(2).max(120).optional(), slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
          shortName: z.string().max(40).optional(),
          description: z.string().optional(),
          shortDescription: z.string().max(280).optional(),
          maxHunters: z.number().int().min(0).max(50).optional(),
          maxDeerHunters: z.number().int().min(0).optional(),
          maxWaterfowlHunters: z.number().int().min(0).optional(),
          maxUplandHunters: z.number().int().min(0).optional(),
          maxGuests: z.number().int().min(0).optional(),
          maxTotalPeople: z.number().int().min(0).optional(),
          bookingModes: z.array(z.enum(["AM", "PM", "Overnight"])).optional(),
          overnightEnabled: z.boolean().optional(),
          active: z.boolean().optional(),
          featuredOnPublicSite: z.boolean().optional(),
          sortOrder: z.number().int().optional(),
          coverImageUrl: z.string().url().optional(),
          mapImageUrl: z.string().url().optional(),
          mapUrl: z.string().url().optional(),
          gateCode: z.string().max(255).optional(),
          locationNotes: z.string().max(300).optional(),
          hasHeatedBlind: z.boolean().optional(),
          hasAtvAccess: z.boolean().optional(),
          hasWaterAccess: z.boolean().optional(),
          hasElectricity: z.boolean().optional(),
          hasCellService: z.boolean().optional(),
          activities: z.array(z.enum([
            "deer", "duck", "turkey", "quail", "dove", "hog",
            "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
          ])).optional(),
        }))
        .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
          requireAdmin(ctx.user.role);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

          const { id, activities, ...updates } = input;
          await db
            .update(huntingProperties)
            .set({ ...updates, updatedAt: now() } as any)
            .where(eq(huntingProperties.id, id));

          // Update activities if provided
          if (activities !== undefined) {
            // Delete existing activities for this property
            await db.delete(propertyActivities).where(eq(propertyActivities.propertyId, id));

            // Insert new activities
            if (activities.length > 0) {
              const activityRows = activities.map((activity: string) => ({
                propertyId: id,
                activity,
              }));
              await db.insert(propertyActivities).values(activityRows as any);
            }
          }

          return { success: true };
        }),

      /** Update booking rules for a property */
      updateRules: protectedProcedure
        .input(z.object({
          propertyId: z.number().int().positive(),
          advanceBookingDays: z.number().int().min(0).max(365).optional(),
          minAdvanceHours: z.number().int().min(0).max(168).optional(),
          maxConsecutiveDays: z.number().int().min(1).max(30).optional(),
          maxDaysPerSeason: z.number().int().min(1).max(365).optional(),
          requiresApproval: z.boolean().optional(),
          allowGuests: z.boolean().optional(),
          maxGuestsPerBooking: z.number().int().min(0).max(10).optional(),
          cancellationHours: z.number().int().min(0).max(168).optional(),
          harvestReportRequired: z.boolean().optional(),
          harvestReportDays: z.number().int().min(1).max(30).optional(),
          blockBookingsIfReportOverdue: z.boolean().optional(),
          tierAccess: z.record(z.string(), z.boolean()).optional(),
          notes: z.string().max(1000).optional(),
        }))
        .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
          requireAdmin(ctx.user.role);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

          const { propertyId, ...updates } = input;
          await db
            .update(propertyBookingRules)
            .set({ ...updates, updatedAt: now() } as any)
            .where(eq(propertyBookingRules.propertyId, propertyId));

          return { success: true };
        }),

      /** Block dates for a property */
      blockDates: protectedProcedure
        .input(z.object({
          propertyId: z.number().int().positive().optional(),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          reason: z.enum(["maintenance", "private_event", "wildlife_management", "weather", "staff_use", "lease_restriction", "other"]).optional(),
          reasonNotes: z.string().max(300).optional(),
          isPubliclyVisible: z.boolean().default(true),
        }))
        .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
          requireAdmin(ctx.user.role);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

          await db.insert(propertyBlockedDates).values({
            propertyId: input.propertyId ?? null,
            startDate: input.startDate as any,
            endDate: input.endDate as any,
            reason: input.reason ?? "other",
            reasonNotes: input.reasonNotes ?? null,
            isPubliclyVisible: input.isPubliclyVisible,
            createdByUserId: ctx.user.id,
            createdAt: now(),
          } as any);

          // Mark every day in the range as blocked in one batched upsert.
          // (Was a per-day loop of raw MySQL `ON DUPLICATE KEY UPDATE` — an N+1
          // that is also invalid on Postgres.)
          if (input.propertyId) {
            const rows: Array<typeof propertyDateInventory.$inferInsert> = [];
            const e = new Date(input.endDate);
            for (let d = new Date(input.startDate); d <= e; d.setDate(d.getDate() + 1)) {
              rows.push({
                propertyId: input.propertyId,
                date: d.toISOString().split("T")[0],
                capacity: 0,
                bookedCount: 0,
                status: "blocked",
                version: 0,
                updatedAt: now(),
              });
            }
            if (rows.length > 0) {
              await db.insert(propertyDateInventory).values(rows).onConflictDoUpdate({
                target: [propertyDateInventory.propertyId, propertyDateInventory.date],
                set: { status: "blocked", version: sql`${propertyDateInventory.version} + 1`, updatedAt: now() },
              });
            }
          }

          return { success: true };
        }),

      /** Permanently delete a property (admin only). Refuses if bookings exist. */ delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }: { ctx: any; input: any }) => { requireAdmin(ctx.user.role); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" }); const { id } = input; const [existing] = await db.select({ id: huntingProperties.id }).from(huntingProperties).where(eq(huntingProperties.id, id)).limit(1); if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." }); const [hasBooking] = await db.select({ id: propertyBookings.id }).from(propertyBookings).where(eq(propertyBookings.propertyId, id)).limit(1); if (hasBooking) throw new TRPCError({ code: "CONFLICT", message: "This property has bookings and cannot be deleted. Set it to Inactive instead." }); await db.delete(propertyActivities).where(eq(propertyActivities.propertyId, id)); await db.delete(propertyAmenities).where(eq(propertyAmenities.propertyId, id)); await db.delete(propertyImages).where(eq(propertyImages.propertyId, id)); await db.delete(propertyBookingRules).where(eq(propertyBookingRules.propertyId, id)); await db.delete(propertySeasons).where(eq(propertySeasons.propertyId, id)); await db.delete(propertyPricing).where(eq(propertyPricing.propertyId, id)); await db.delete(propertyDateInventory).where(eq(propertyDateInventory.propertyId, id)); await db.delete(propertyBlockedDates).where(eq(propertyBlockedDates.propertyId, id)); await db.delete(bookingWaitlist).where(eq(bookingWaitlist.propertyId, id)); await db.delete(huntingProperties).where(eq(huntingProperties.id, id)); return { success: true }; }), /** Upload property map file (PDF, PNG, JPG) */
      uploadMap: protectedProcedure
        .input(z.object({
          fileData: z.string(), // base64 encoded file
          fileName: z.string().max(255),
          contentType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
        }))
        .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
          requireAdmin(ctx.user.role);

          // Decode base64
          const buffer = Buffer.from(input.fileData, 'base64');

          // Upload to S3
          const { url } = await storagePut(
            `properties/maps/${Date.now()}-${input.fileName}`,
            buffer,
            input.contentType,
          );

          return { mapUrl: url };
        }),

      /** Maintenance: Backfill null bookingModes and overnightEnabled (for PR #57 compat) */
      backfillDefaults: protectedProcedure
        .mutation(async ({ ctx }: { ctx: any }) => {
          requireAdmin(ctx.user.role);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

          const modesUpdated = await backfillBookingModes(db);
          const overnightUpdated = await backfillOvernightEnabled(db);

          return {
            success: true,
            backfilled: {
              bookingModes: modesUpdated,
              overnightEnabled: overnightUpdated,
            },
          };
        }),
    }),

    bookings: router({

      /** List all bookings (admin view) */
      list: protectedProcedure
        .input(z.object({
          status: z.string().optional(),
          propertyId: z.number().int().positive().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
        }).optional())
        .query(async ({ ctx, input }: { ctx: any; input: any }) => {
          requireAdmin(ctx.user.role);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

          const conditions = [];
          if (input?.status) conditions.push(eq(propertyBookings.status, input.status as any));
          if (input?.propertyId) conditions.push(eq(propertyBookings.propertyId, input.propertyId));
          if (input?.startDate) conditions.push(gte(propertyBookings.startDate, input.startDate as any));
          if (input?.endDate) conditions.push(lte(propertyBookings.endDate, input.endDate as any));

          const bookings = await db
            .select()
            .from(propertyBookings)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(propertyBookings.startDate))
            .limit(input?.limit ?? 50)
            .offset(input?.offset ?? 0);

          const propIds = Array.from(new Set(bookings.map((b: any) => b.propertyId)));
          const props = propIds.length
            ? await db
                .select({ id: huntingProperties.id, name: huntingProperties.name, shortName: huntingProperties.shortName })
                .from(huntingProperties)
                .where(sql`${huntingProperties.id} IN (${sql.join(propIds.map((id: any) => sql`${id}`), sql`, `)})`)
            : [];
          const propMap = new Map(props.map((p: any) => [p.id, p]));

          return bookings.map((b: any) => ({ ...b, property: propMap.get(b.propertyId) ?? null }));
        }),

      /** Approve a pending booking */
      approve: protectedProcedure
        .input(z.object({
          id: z.number().int().positive(),
          staffNotes: z.string().max(1000).optional(),
        }))
        .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
          requireAdmin(ctx.user.role);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

          const [booking] = await db
            .select()
            .from(propertyBookings)
            .where(eq(propertyBookings.id, input.id))
            .limit(1);

          if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });
          if (booking.status !== "pending_approval") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending_approval bookings can be approved." });
          }

          const ts = now();
          await db
            .update(propertyBookings)
            .set({
              status: "confirmed",
              approvedByUserId: ctx.user.id,
              approvedAt: ts,
              staffNotes: input.staffNotes ?? booking.staffNotes,
              updatedAt: ts,
            } as any)
            .where(eq(propertyBookings.id, input.id));

          // Update inventory
          let d = new Date(booking.startDate);
          const e = new Date(booking.endDate);
          while (d <= e) {
            await updateInventory(db, booking.propertyId, d.toISOString().split("T")[0], booking.timeSlot as any, 1);
            d.setDate(d.getDate() + 1);
          }

          await auditLog(db, input.id, "booking_approved", ctx.user.id, "pending_approval", "confirmed");

          return { success: true };
        }),

      /** Decline a pending booking */
      decline: protectedProcedure
        .input(z.object({
          id: z.number().int().positive(),
          reason: z.string().max(500),
        }))
        .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
          requireAdmin(ctx.user.role);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

          const ts = now();
          await db
            .update(propertyBookings)
            .set({
              status: "declined",
              declinedAt: ts,
              declineReason: input.reason,
              updatedAt: ts,
            } as any)
            .where(eq(propertyBookings.id, input.id));

          await auditLog(db, input.id, "booking_declined", ctx.user.id, "pending_approval", "declined", input.reason);

          return { success: true };
        }),

      /** Update booking status (check-in, complete, no-show) */
      updateStatus: protectedProcedure
        .input(z.object({
          id: z.number().int().positive(),
          status: z.enum(["checked_in", "completed", "no_show"]),
          staffNotes: z.string().max(1000).optional(),
        }))
        .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
          requireAdmin(ctx.user.role);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

          const [booking] = await db
            .select()
            .from(propertyBookings)
            .where(eq(propertyBookings.id, input.id))
            .limit(1);

          if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });

          const prevStatus = booking.status;
          const ts = now();

          await db
            .update(propertyBookings)
            .set({
              status: input.status,
              staffNotes: input.staffNotes ?? booking.staffNotes,
              updatedAt: ts,
            } as any)
            .where(eq(propertyBookings.id, input.id));

          await auditLog(db, input.id, "status_changed", ctx.user.id, prevStatus, input.status, input.staffNotes);

          return { success: true };
        }),

      /** Record a payment */
      recordPayment: protectedProcedure
        .input(z.object({
          bookingId: z.number().int().positive(),
          type: z.enum(["deposit", "balance", "refund", "adjustment", "late_cancellation_fee"]),
          amount: z.number().positive(),
          method: z.enum(["stripe", "cash", "check", "comp", "credit", "other"]),
          notes: z.string().max(500).optional(),
        }))
        .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
          requireAdmin(ctx.user.role);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

          await db.insert(bookingPayments).values({
            bookingId: input.bookingId,
            type: input.type,
            amount: String(input.amount),
            currency: "USD",
            method: input.method,
            status: "completed",
            recordedByUserId: ctx.user.id,
            notes: input.notes ?? null,
            createdAt: now(),
          } as any);

          await auditLog(db, input.bookingId, "payment_recorded", ctx.user.id, null, { type: input.type, amount: input.amount, method: input.method });

          return { success: true };
        }),
    }),
  }),

  // ── Admin: Properties (dedicated admin endpoint for ops portal) ──────────────

  adminProperties: router({

    /** List all properties (admin view) — with full details for admin ops */
    list: protectedProcedure
      .input(z.object({
        includeInactive: z.boolean().optional(),
      }).optional())
      .query(async ({ ctx, input }: { ctx: any; input: any }) => {
        requireAdmin(ctx.user.role);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const conditions = [];
        if (!input?.includeInactive) conditions.push(eq(huntingProperties.active, true));

        const props = await db
          .select()
          .from(huntingProperties)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(asc(huntingProperties.sortOrder), asc(huntingProperties.name));

        // Fetch activities for all properties from join table
        const propIds = props.map((p: any) => p.id);
        const activitiesData = propIds.length
          ? await db
              .select()
              .from(propertyActivities)
              .where(sql`${propertyActivities.propertyId} IN (${sql.join(propIds.map((id: any) => sql`${id}`), sql`, `)})`)
          : [];

        const activitiesMap = new Map<number, string[]>();
        for (const act of activitiesData) {
          const arr = activitiesMap.get(act.propertyId) ?? [];
          arr.push(act.activity);
          activitiesMap.set(act.propertyId, arr);
        }

        // Normalize response: provide safe defaults for nullable JSON fields
        return props.map((p: any) => ({
          ...p,
          activities: activitiesMap.get(p.id) ?? [],
          bookingModes: Array.isArray(p.bookingModes) ? p.bookingModes : ["AM", "PM"],
          secondaryActivities: Array.isArray(p.secondaryActivities) ? p.secondaryActivities : null,
          maxWaterfowlHunters: p.maxWaterfowlHunters ?? null,
          maxTotalPeople: p.maxTotalPeople ?? null,
          overnightEnabled: p.overnightEnabled ?? true,
        }));
      }),
  }),
});
