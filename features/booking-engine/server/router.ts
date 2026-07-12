/**
 * Booking System tRPC Router — Rivers Lodge & Hunt Club
 *
 * Exposes all booking system procedures:
 *   - resources.*       Resource management (admin)
 *   - availability.*    Availability checking and calendar
 *   - bookings.*        Booking CRUD and state transitions
 *   - payments.*        Payment recording
 *   - leads.*           Sales pipeline management
 *   - requests.*        Reservation request management
 */

import { router, publicProcedure, protectedProcedure } from "../../_core/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc, and, ne, sql, inArray, like, lt, gt } from "drizzle-orm";
import { getDb } from "../../_core/server/db";
import { verifyCaptcha } from "@core/server/captcha";
import { getUserSkillGroups, hasSkillGroupAccess } from "../lib/skillGroups";
import {
  resources,
  resourceGroups,
  availabilityRules,
  bookingResourceAllocations,
  conflictAcknowledgments,
  paymentRecords,
  waiverRequirements,
  reservationRequests,
  leads,
  bookingStateTransitions,
} from '@core/db/booking-schema';
import { bookings, users, blockedDates } from '@core/db/schema';
import { propertyBookings, huntingProperties } from '@core/db/property-booking-schema';
import { calendarAccessSettings } from '@features/admin/schema';
import { members } from '@features/membership/schema';
import { gte, lte } from "drizzle-orm";
import {
  checkAvailability,
  checkMultipleResources,
  getCalendarAvailability,
  type Db,
} from "./availability/engine";
import {
  transitionBookingStatus,
  getAvailableTransitions,
  getStatusLabel,
  getStatusColor,
  type BookingStatus,
} from "./booking/stateMachine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requirePortalRole(ctx: { user?: { role?: string } | null }) {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const portalRoles = [
    "owner", "admin", "venue_sales", "events_manager",
    "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance",
  ];
  if (!portalRoles.includes(ctx.user.role ?? "")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Portal access required" });
  }
}

function requireOwnerOrAdmin(ctx: { user?: { role?: string } | null }) {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (!["owner", "admin"].includes(ctx.user.role ?? "")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner or admin access required" });
  }
}

// ─── Resources Router ─────────────────────────────────────────────────────────

const resourcesRouter = router({
  list: protectedProcedure
    .input(z.object({ type: z.string().optional(), groupId: z.number().optional(), activeOnly: z.boolean().default(true) }).optional())
    .query(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input?.activeOnly !== false) conditions.push(eq(resources.isActive, true));
      if (input?.type) conditions.push(eq(resources.type, input.type as typeof resources.type._.data));
      if (input?.groupId) conditions.push(eq(resources.groupId, input.groupId));
      return await db
        .select({
          id: resources.id,
          name: resources.name,
          slug: resources.slug,
          type: resources.type,
          capacity: resources.capacity,
          holdbackHoursBefore: resources.holdbackHoursBefore,
          holdbackHoursAfter: resources.holdbackHoursAfter,
          exclusiveUse: resources.exclusiveUse,
          description: resources.description,
          isActive: resources.isActive,
          groupId: resources.groupId,
          groupName: resourceGroups.name,
          groupType: resourceGroups.type,
        })
        .from(resources)
        .leftJoin(resourceGroups, eq(resources.groupId, resourceGroups.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(resources.sortOrder, resources.name);
    }),

  groups: protectedProcedure.query(async ({ ctx }) => {
    requirePortalRole(ctx);
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(resourceGroups).where(eq(resourceGroups.isActive, true)).orderBy(resourceGroups.name);
  }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      capacity: z.number().optional(),
      holdbackHoursBefore: z.number().optional(),
      holdbackHoursAfter: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireOwnerOrAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...updates } = input;
      await db.update(resources).set(updates).where(eq(resources.id, id));
      return { success: true };
    }),
});

// ─── Availability Router ──────────────────────────────────────────────────────

const availabilityRouter = router({
  check: protectedProcedure
    .input(z.object({
      resourceId: z.number(),
      allocationStart: z.coerce.date(),
      allocationEnd: z.coerce.date(),
      excludeBookingId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Read-only query — no transaction needed, pass db directly.
      return await checkAvailability(
        {
          resourceId: input.resourceId,
          allocationStart: input.allocationStart,
          allocationEnd: input.allocationEnd,
          excludeBookingId: input.excludeBookingId,
        },
        db,
      );
    }),

  checkMultiple: protectedProcedure
    .input(z.object({
      resources: z.array(z.object({
        resourceId: z.number(),
        allocationStart: z.coerce.date(),
        allocationEnd: z.coerce.date(),
      })),
      excludeBookingId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return await checkMultipleResources(
        input.resources.map((r) => ({
          resourceId: r.resourceId,
          allocationStart: r.allocationStart,
          allocationEnd: r.allocationEnd,
          excludeBookingId: input.excludeBookingId,
        })),
        db,
      );
    }),

  calendar: protectedProcedure
    .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      return await getCalendarAvailability(input.startDate, input.endDate);
    }),
});

// ─── Bookings Router ──────────────────────────────────────────────────────────

const bookingsRouter = router({
  list: protectedProcedure
    .input(z.object({
      type: z.enum(["wedding", "corporate", "member_stay", "hunt_fish"]).optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const conditions = [];
      if (input?.type) conditions.push(eq(bookings.type, input.type));
      if (input?.status) conditions.push(eq(bookings.status, input.status as typeof bookings.status._.data));
      if (input?.search) {
        conditions.push(
          sql`(${bookings.clientName} LIKE ${`%${input.search}%`} OR ${bookings.clientEmail} LIKE ${`%${input.search}%`})`
        );
      }
      const where = conditions.length ? and(...conditions) : undefined;

      // Run the count and the page fetch in parallel.
      // COUNT(*) must use the same WHERE clause as the items query so that
      // total reflects the full matching set, not just the current page.
      const [countResult, items] = await Promise.all([
        db
          .select({ count: sql<string>`count(*)` })
          .from(bookings)
          .where(where),
        db
          .select()
          .from(bookings)
          .where(where)
          .orderBy(desc(bookings.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
      ]);
      const total = Number(countResult[0]?.count ?? 0);

      // Enrich with state machine info
      return {
        items: items.map((b) => ({
          ...b,
          availableTransitions: getAvailableTransitions(b.status as BookingStatus),
          statusLabel: getStatusLabel(b.status as BookingStatus),
          statusColor: getStatusColor(b.status as BookingStatus),
        })),
        total,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.id)).limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

      // Load allocations, payments, and state history
      const [allocations, payments, history] = await Promise.all([
        db.select({
          id: bookingResourceAllocations.id,
          resourceId: bookingResourceAllocations.resourceId,
          resourceName: resources.name,
          resourceType: resources.type,
          allocationStart: bookingResourceAllocations.allocationStart,
          allocationEnd: bookingResourceAllocations.allocationEnd,
          status: bookingResourceAllocations.status,
        })
          .from(bookingResourceAllocations)
          .leftJoin(resources, eq(bookingResourceAllocations.resourceId, resources.id))
          .where(eq(bookingResourceAllocations.bookingId, input.id)),
        db.select().from(paymentRecords).where(eq(paymentRecords.bookingId, input.id)).orderBy(desc(paymentRecords.createdAt)),
        db.select({
          id: bookingStateTransitions.id,
          fromStatus: bookingStateTransitions.fromStatus,
          toStatus: bookingStateTransitions.toStatus,
          notes: bookingStateTransitions.notes,
          createdAt: bookingStateTransitions.createdAt,
          triggeredByUserId: bookingStateTransitions.triggeredByUserId,
        })
          .from(bookingStateTransitions)
          .where(eq(bookingStateTransitions.bookingId, input.id))
          .orderBy(desc(bookingStateTransitions.createdAt)),
      ]);

      const totalPaid = payments
        .filter((p) => p.status === "completed" && p.type !== "refund")
        .reduce((sum, p) => sum + parseFloat(p.amount ?? "0"), 0);

      return {
        ...booking,
        availableTransitions: getAvailableTransitions(booking.status as BookingStatus),
        statusLabel: getStatusLabel(booking.status as BookingStatus),
        statusColor: getStatusColor(booking.status as BookingStatus),
        allocations,
        payments,
        history,
        totalPaid,
      };
    }),

  create: protectedProcedure
    .input(z.object({
      type: z.enum(["wedding", "corporate", "member_stay", "hunt_fish"]),
      clientName: z.string().min(1),
      clientEmail: z.string().email().optional(),
      clientPhone: z.string().optional(),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      guestCount: z.number().optional(),
      totalRevenue: z.string().optional(),
      notes: z.string().optional(),
      userId: z.string().optional(),
      // Resource allocations to create with this booking
      resourceAllocations: z.array(z.object({
        resourceId: z.number(),
        allocationStart: z.coerce.date(),
        allocationEnd: z.coerce.date(),
      })).optional(),
      // Whether to bypass soft conflict warnings (requires acknowledgment)
      acknowledgeSoftConflicts: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return await db.transaction(async (tx) => {
        // Availability check + insert happen inside a single transaction.
        // getConflictingAllocations acquires FOR UPDATE locks, so a concurrent
        // transaction that has already passed the check but not yet committed
        // will block here until it commits — preventing double-booking.
        if (input.resourceAllocations && input.resourceAllocations.length > 0) {
          const availResult = await checkMultipleResources(
            input.resourceAllocations.map((r) => ({
              resourceId: r.resourceId,
              allocationStart: r.allocationStart,
              allocationEnd: r.allocationEnd,
            })),
            // tx (MySqlTransaction) is structurally compatible with Db but
            // the TypeScript types don't model this; cast is safe.
            tx as unknown as Db,
          );

          if (!availResult.available) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Resource conflict detected: ${availResult.hardConflicts.map((c) => c.message).join("; ")}`,
            });
          }

          if (availResult.softConflicts.length > 0 && !input.acknowledgeSoftConflicts) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Soft conflicts require acknowledgment: ${availResult.softConflicts.map((c) => c.message).join("; ")}`,
            });
          }
        }

        const toDateStr = (d: Date) => d.toISOString().split("T")[0];
        // Create the booking
        const [insertResult] = await tx.insert(bookings).values({
          type: input.type,
          clientName: input.clientName,
          clientEmail: input.clientEmail ?? null,
          clientPhone: input.clientPhone ?? null,
          startDate: toDateStr(input.startDate),
          endDate: toDateStr(input.endDate),
          guestCount: input.guestCount ?? null,
          totalRevenue: input.totalRevenue ?? null,
          depositPaid: false,
          status: "inquiry",
          notes: input.notes ?? null,
          userId: input.userId ?? null,
        }).returning({ id: bookings.id });

        const bookingId = insertResult.id;

        // Create resource allocations
        if (input.resourceAllocations && input.resourceAllocations.length > 0) {
          for (const alloc of input.resourceAllocations) {
            await tx.insert(bookingResourceAllocations).values({
              bookingId,
              resourceId: alloc.resourceId,
              allocationStart: alloc.allocationStart,
              allocationEnd: alloc.allocationEnd,
              status: "tentative",
            });
          }
        }

        // Log initial state
        await tx.insert(bookingStateTransitions).values({
          bookingId,
          fromStatus: null,
          toStatus: "inquiry",
          triggeredByUserId: ctx.user!.id,
          notes: "Booking created",
          gateChecks: JSON.stringify({}),
        });

        return { success: true, bookingId };
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      clientName: z.string().optional(),
      clientEmail: z.string().optional(),
      clientPhone: z.string().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      guestCount: z.number().optional(),
      totalRevenue: z.string().optional(),
      depositPaid: z.boolean().optional(),
      notes: z.string().optional(),
      status: z.enum(["inquiry", "confirmed", "completed", "cancelled"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, startDate, endDate, ...rest } = input;
      const updates: Record<string, string | number | boolean | Date | null | undefined> = {
        ...rest as Record<string, string | number | boolean | null | undefined>,
      };
      if (startDate) updates.startDate = startDate;
      if (endDate) updates.endDate = endDate;
      await db.update(bookings).set(updates).where(eq(bookings.id, id));
      return { success: true };
    }),

  transition: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      toStatus: z.enum([
        "inquiry", "qualified", "proposal_sent", "contract_sent",
        "deposit_received", "confirmed", "checked_in", "checked_out",
        "completed", "cancelled", "no_show",
      ]),
      notes: z.string().optional(),
      overrides: z.record(z.string(), z.boolean()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

      const result = await transitionBookingStatus(
        input.bookingId,
        booking.status as BookingStatus,
        input.toStatus,
        ctx.user!.id,
        input.notes,
        (input.overrides ?? {}) as Record<string, boolean>
      );

      // Update the booking status
      await db.update(bookings).set({ status: input.toStatus as typeof bookings.status._.data }).where(eq(bookings.id, input.bookingId));

      // Update allocation statuses
      if (input.toStatus === "confirmed") {
        await db
          .update(bookingResourceAllocations)
          .set({ status: "confirmed" })
          .where(and(eq(bookingResourceAllocations.bookingId, input.bookingId), ne(bookingResourceAllocations.status, "cancelled")));
      }
      if (input.toStatus === "cancelled") {
        await db
          .update(bookingResourceAllocations)
          .set({ status: "cancelled" })
          .where(eq(bookingResourceAllocations.bookingId, input.bookingId));
      }

      return result;
    }),

  addAllocation: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      resourceId: z.number(),
      allocationStart: z.coerce.date(),
      allocationEnd: z.coerce.date(),
      acknowledgeSoftConflicts: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return await db.transaction(async (tx) => {
        const availResult = await checkAvailability(
          {
            resourceId: input.resourceId,
            allocationStart: input.allocationStart,
            allocationEnd: input.allocationEnd,
            excludeBookingId: input.bookingId,
          },
          tx as unknown as Db,
        );

        if (!availResult.available) {
          throw new TRPCError({
            code: "CONFLICT",
            message: availResult.hardConflicts.map((c) => c.message).join("; "),
          });
        }

        if (availResult.softConflicts.length > 0 && !input.acknowledgeSoftConflicts) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Soft conflicts: ${availResult.softConflicts.map((c) => c.message).join("; ")}`,
          });
        }

        await tx.insert(bookingResourceAllocations).values({
          bookingId: input.bookingId,
          resourceId: input.resourceId,
          allocationStart: new Date(input.allocationStart),
          allocationEnd: new Date(input.allocationEnd),
          status: "tentative",
        });

        return { success: true };
      });
    }),

  removeAllocation: protectedProcedure
    .input(z.object({ allocationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(bookingResourceAllocations)
        .set({ status: "cancelled" })
        .where(eq(bookingResourceAllocations.id, input.allocationId));
      return { success: true };
    }),

  acknowledgeConflict: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      conflictRuleId: z.string(),
      relatedBookingId: z.number().optional(),
      resourceId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(conflictAcknowledgments).values({
        bookingId: input.bookingId,
        conflictRuleId: input.conflictRuleId,
        relatedBookingId: input.relatedBookingId ?? null,
        resourceId: input.resourceId ?? null,
        acknowledgedByUserId: ctx.user!.id,
        notes: input.notes ?? null,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(bookings).where(eq(bookings.id, input.id));
      return { success: true };
    }),

  // ─── Calendar Endpoints ────────────────────────────────────────────────────

  // Get list of properties the user can view calendars for based on skill groups
  accessibleProperties: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      // Get user's member record
      const memberResult = await db
        .select()
        .from(members)
        .where(eq(members.userId, ctx.user.id));

      const member = memberResult[0];
      if (!member) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not a member" });

      // Get user's skill groups
      const userSkillGroups = getUserSkillGroups(member.tier, ctx.user.role);

      // Get property calendar access settings
      const settingsResult = await db
        .select()
        .from(calendarAccessSettings)
        .where(eq(calendarAccessSettings.settingKey, "property_calendar_skill_groups"));

      let propertyAccessBySkillGroup: Record<string, string[]> = {};
      if (settingsResult[0]) {
        propertyAccessBySkillGroup = JSON.parse(settingsResult[0].settingValue);
      }

      // Filter properties: only return those where user's skill groups have access
      const accessiblePropertyIds: number[] = [];
      Object.entries(propertyAccessBySkillGroup).forEach(([propIdStr, allowedGroups]) => {
        if (hasSkillGroupAccess(userSkillGroups, allowedGroups)) {
          const propId = parseInt(propIdStr, 10);
          if (!isNaN(propId)) {
            accessiblePropertyIds.push(propId);
          }
        }
      });

      // Return minimal property info: id and name
      // If no properties are configured in access settings, return empty array (nothing is visible)
      if (accessiblePropertyIds.length === 0) {
        return [];
      }

      return [
        { id: 1, name: "Grand Lodge" },
        { id: 2, name: "River House" },
      ].filter((p) => accessiblePropertyIds.includes(p.id));
    }),

  myBookings: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      // Return only bookings for the current authenticated user
      return db
        .select()
        .from(propertyBookings)
        .where(eq(propertyBookings.userId, ctx.user.id))
        .orderBy(propertyBookings.startDate);
    }),

  masterCalendarView: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      // Check if user has access to Master Calendar
      const memberResult = await db
        .select()
        .from(members)
        .where(eq(members.userId, ctx.user.id));

      const member = memberResult[0];
      if (!member) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not a member" });

      // Get user's skill groups
      const userSkillGroups = getUserSkillGroups(member.tier, ctx.user.role);

      // Get Master Calendar access settings (new skill-group-based format)
      const settingsResult = await db
        .select()
        .from(calendarAccessSettings)
        .where(eq(calendarAccessSettings.settingKey, "master_calendar_skill_groups"));

      let allowedSkillGroups: string[] = ["Designated", "Admin", "Employee"]; // Default

      if (settingsResult[0]) {
        allowedSkillGroups = JSON.parse(settingsResult[0].settingValue);
      }

      // Check if user's skill groups grant access
      if (!hasSkillGroupAccess(userSkillGroups, allowedSkillGroups)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Master Calendar access denied" });
      }

      // Return all property bookings
      return db
        .select()
        .from(propertyBookings)
        .orderBy(propertyBookings.startDate);
    }),

  propertyCalendarView: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get user's member record
      const memberResult = await db
        .select()
        .from(members)
        .where(eq(members.userId, ctx.user.id));

      const member = memberResult[0];
      if (!member) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not a member" });

      // Get user's skill groups
      const userSkillGroups = getUserSkillGroups(member.tier, ctx.user.role);

      // Get property calendar access settings (new skill-group-based format)
      const settingsResult = await db
        .select()
        .from(calendarAccessSettings)
        .where(eq(calendarAccessSettings.settingKey, "property_calendar_skill_groups"));

      let propertyAccessBySkillGroup: Record<string, string[]> = {};
      if (settingsResult[0]) {
        propertyAccessBySkillGroup = JSON.parse(settingsResult[0].settingValue);
      }

      const allowedSkillGroupsForProperty = propertyAccessBySkillGroup[String(input.propertyId)] || [];

      // Check if user's skill groups grant access to this property
      if (!hasSkillGroupAccess(userSkillGroups, allowedSkillGroupsForProperty)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Calendar access denied for property ${input.propertyId}`,
        });
      }

      // Return bookings for this property
      return db
        .select()
        .from(propertyBookings)
        .where(eq(propertyBookings.propertyId, input.propertyId))
        .orderBy(propertyBookings.startDate);
    }),

  blockedDates: protectedProcedure
    .query(async ({ ctx }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(blockedDates).orderBy(blockedDates.date);
    }),

  addBlockedDate: protectedProcedure
    .input(z.object({
      date: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(blockedDates).values({
        date: input.date,
        reason: input.reason ?? null,
      });
      return { success: true };
    }),

  removeBlockedDate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(blockedDates).where(eq(blockedDates.id, input.id));
      return { success: true };
    }),
});

// ─── Payments Router ──────────────────────────────────────────────────────────

const paymentsRouter = router({
  record: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      type: z.enum(["deposit", "balance", "addon", "refund", "credit"]),
      amount: z.string(),
      method: z.enum(["stripe", "check", "wire", "cash", "credit_card", "other"]).optional(),
      notes: z.string().optional(),
      paidAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(paymentRecords).values({
        bookingId: input.bookingId,
        type: input.type,
        amount: input.amount,
        method: input.method ?? null,
        status: "completed",
        notes: input.notes ?? null,
        recordedByUserId: ctx.user!.id,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      });

      // If it's a deposit, mark the booking as deposit paid
      if (input.type === "deposit") {
        await db.update(bookings).set({ depositPaid: true }).where(eq(bookings.id, input.bookingId));
      }

      return { success: true };
    }),

  list: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) return [];
      return await db
        .select()
        .from(paymentRecords)
        .where(eq(paymentRecords.bookingId, input.bookingId))
        .orderBy(desc(paymentRecords.createdAt));
    }),
});

// ─── Leads Router ─────────────────────────────────────────────────────────────

const leadsRouter = router({
  list: protectedProcedure
    .input(z.object({
      businessLine: z.string().optional(),
      status: z.string().optional(),
      assignedToUserId: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input?.businessLine) conditions.push(eq(leads.businessLine, input.businessLine as typeof leads.businessLine._.data));
      if (input?.status) conditions.push(eq(leads.status, input.status as typeof leads.status._.data));
      if (input?.assignedToUserId) conditions.push(eq(leads.assignedToUserId, input.assignedToUserId));
      if (input?.search) {
        conditions.push(sql`(${leads.contactName} LIKE ${`%${input.search}%`} OR ${leads.contactEmail} LIKE ${`%${input.search}%`})`);
      }
      return await db
        .select()
        .from(leads)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(leads.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      businessLine: z.enum(["wedding", "corporate", "member_stay", "hunt", "fish", "hunt_and_fish", "membership", "other"]),
      contactName: z.string().min(1),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
      companyOrCoupleName: z.string().optional(),
      requestedStartDate: z.coerce.date().optional(),
      requestedEndDate: z.coerce.date().optional(),
      estimatedGuestCount: z.number().optional(),
      estimatedBudget: z.string().optional(),
      source: z.enum(["website_form", "referral", "direct", "social", "event", "other"]).default("direct"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const toDateStr = (d: Date) => d.toISOString().split("T")[0];
      const { requestedStartDate, requestedEndDate, ...rest } = input;
      await db.insert(leads).values({
        ...rest,
        requestedStartDate: requestedStartDate ? toDateStr(requestedStartDate) : null,
        requestedEndDate: requestedEndDate ? toDateStr(requestedEndDate) : null,
        assignedToUserId: ctx.user!.id,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "contacted", "qualified", "proposal_sent", "negotiating", "converted", "lost", "unqualified"]).optional(),
      assignedToUserId: z.string().optional(),
      notes: z.string().optional(),
      lostReason: z.string().optional(),
      followUpDate: z.string().optional(),
      lastContactedAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, followUpDate, lastContactedAt, ...rest } = input;
      await db.update(leads).set({
        ...(rest as Parameters<typeof db.update>[0] extends infer T ? T : never),
        ...(followUpDate ? { followUpDate: new Date(followUpDate) } : {}),
        ...(lastContactedAt ? { lastContactedAt: new Date(lastContactedAt) } : {}),
      } as Parameters<ReturnType<typeof db.update<typeof leads>>['set']>[0]).where(eq(leads.id, id));
      return { success: true };
    }),

  convert: protectedProcedure
    .input(z.object({ leadId: z.number(), bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(leads).set({ status: "converted", convertedBookingId: input.bookingId }).where(eq(leads.id, input.leadId));
      return { success: true };
    }),
});

// ─── Reservation Requests Router ──────────────────────────────────────────────

const requestsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      businessLine: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input?.status) conditions.push(eq(reservationRequests.status, input.status as typeof reservationRequests.status._.data));
      if (input?.businessLine) conditions.push(eq(reservationRequests.businessLine, input.businessLine as typeof reservationRequests.businessLine._.data));
      if (input?.search) {
        conditions.push(sql`(${reservationRequests.contactName} LIKE ${`%${input.search}%`} OR ${reservationRequests.contactEmail} LIKE ${`%${input.search}%`})`);
      }
      return await db
        .select()
        .from(reservationRequests)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(reservationRequests.createdAt));
    }),

  // Public endpoint — anyone can submit a reservation request
  submit: publicProcedure
    .input(z.object({
      businessLine: z.enum(["wedding", "corporate", "member_stay", "hunt", "fish", "hunt_and_fish", "other"]),
      contactName: z.string().min(1),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
      requestedStart: z.coerce.date(),
      requestedEnd: z.coerce.date(),
      guestCount: z.number().optional(),
      eventType: z.string().optional(),
      specialRequests: z.string().optional(),
      budgetRange: z.string().optional(),
      hearAboutUs: z.string().optional(),
      captchaToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      await verifyCaptcha(input.captchaToken);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const toDateStr = (d: Date) => d.toISOString().split("T")[0];
      await db.insert(reservationRequests).values({
        source: "public_form",
        businessLine: input.businessLine,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        requestedStart: toDateStr(input.requestedStart),
        requestedEnd: toDateStr(input.requestedEnd),
        guestCount: input.guestCount ?? null,
        eventType: input.eventType ?? null,
        specialRequests: input.specialRequests ?? null,
        budgetRange: input.budgetRange ?? null,
        hearAboutUs: input.hearAboutUs ?? null,
        status: "new",
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "contacted", "qualified", "proposal_sent", "converted", "rejected", "lost"]).optional(),
      assignedToUserId: z.string().optional(),
      notes: z.string().optional(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...updates } = input;
      await db.update(reservationRequests).set(updates).where(eq(reservationRequests.id, id));
      return { success: true };
    }),

  convert: protectedProcedure
    .input(z.object({ requestId: z.number(), bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requirePortalRole(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(reservationRequests)
        .set({ status: "converted", convertedBookingId: input.bookingId })
        .where(eq(reservationRequests.id, input.requestId));
      return { success: true };
    }),

  // Member-facing: returns only the current authenticated user's own submitted requests
  myRequests: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return await db
        .select()
        .from(reservationRequests)
        .where(eq(reservationRequests.contactEmail, ctx.user.email ?? ""))
        .orderBy(desc(reservationRequests.createdAt));
    }),
});

// ─── Public Booking Router ───────────────────────────────────────────────────

const publicBookingRouter = router({
  getBlockedDates: publicProcedure
    .input(z.object({
      year: z.number().min(2020).max(2040),
      month: z.number().min(1).max(12).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const pad = (n: number) => String(n).padStart(2, "0");
      const startDate = input.month
        ? `${input.year}-${pad(input.month)}-01`
        : `${input.year}-01-01`;
      const endDate = input.month
        ? `${input.year}-${pad(input.month)}-${new Date(input.year, input.month, 0).getDate()}`
        : `${input.year}-12-31`;
      const rows = await db
        .select({ date: blockedDates.date, reason: blockedDates.reason })
        .from(blockedDates)
        .where(
          and(
            gte(blockedDates.date, startDate),
            lte(blockedDates.date, endDate)
          )
        );
      return rows;
    }),
});

// ─── Root Booking Router ──────────────────────────────────────────────────────

export const bookingRouter = router({
  resources: resourcesRouter,
  availability: availabilityRouter,
  bookings: bookingsRouter,
  payments: paymentsRouter,
  leads: leadsRouter,
  requests: requestsRouter,
  public: publicBookingRouter,
});
