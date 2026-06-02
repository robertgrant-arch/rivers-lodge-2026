import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateAndStoreWaiverPdf } from "../../waivers/server/waiverPdf";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, desc, and, gte, lte, sql, or, like } from "drizzle-orm";
import {
  weddingBookings,
  corporateBookings,
  huntFishBookings,
  harvestRecords,
  seasonConfigs,
  portalBlockedDates,
  portalStaffAssignments,
  portalDocuments,
  waiverTemplates,
  portalWaivers,
  portalAuditLog,
  portalNotifications,
  portalTasks,
  portalNotes,
} from '@core/db/portal-schema';
import { users, members, membershipApplications, inquiries, bookings } from '@core/db/schema';
import { randomBytes } from "crypto";

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return drizzle(process.env.DATABASE_URL);
}

// ─── Portal Role Guards ───────────────────────────────────────────────────────
const STAFF_ROLES = ["owner", "admin", "venue_sales", "events_manager", "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance"] as const;
type StaffRole = typeof STAFF_ROLES[number];

const portalProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user.role as string;
  if (!STAFF_ROLES.includes(role as StaffRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Portal access requires a staff role" });
  }
  return next({ ctx });
});

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  }
  return next({ ctx });
});

// ─── Audit Log Helper ─────────────────────────────────────────────────────────
async function logAudit(params: {
  actingUserId: number;
  actingUserName: string;
  actionType: "create" | "update" | "delete" | "status_change" | "login" | "export" | "override";
  entityType: string;
  entityId?: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
}) {
  const db = getDb();
  await db.insert(portalAuditLog).values({
    ...params,
    entityId: params.entityId ?? null,
    fieldChanged: params.fieldChanged ?? null,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
    notes: params.notes ?? null,
  });
}

// ─── Dashboard Router ─────────────────────────────────────────────────────────
const dashboardRouter = router({
  kpis: portalProcedure.query(async () => {
    const db = getDb();
    const [weddingCount] = await db.select({ count: sql<number>`count(*)` })
      .from(weddingBookings).where(eq(weddingBookings.status, "confirmed"));
    const [corporateCount] = await db.select({ count: sql<number>`count(*)` })
      .from(corporateBookings).where(eq(corporateBookings.status, "confirmed"));
    const [huntCount] = await db.select({ count: sql<number>`count(*)` })
      .from(huntFishBookings).where(eq(huntFishBookings.status, "confirmed"));
    const [memberCount] = await db.select({ count: sql<number>`count(*)` })
      .from(members).where(eq(members.active, true));
    const [inquiryCount] = await db.select({ count: sql<number>`count(*)` })
      .from(inquiries).where(eq(inquiries.status, "new"));
    const [weddingRevenue] = await db.select({ total: sql<string>`COALESCE(SUM(contractValue), 0)` })
      .from(weddingBookings).where(eq(weddingBookings.status, "confirmed"));
    const [corporateRevenue] = await db.select({ total: sql<string>`COALESCE(SUM(contractValue), 0)` })
      .from(corporateBookings).where(eq(corporateBookings.status, "confirmed"));
    return {
      confirmedWeddings: weddingCount.count,
      confirmedCorporate: corporateCount.count,
      confirmedHuntFish: huntCount.count,
      activeMembers: memberCount.count,
      newInquiries: inquiryCount.count,
      totalConfirmedRevenue: (parseFloat(weddingRevenue.total) + parseFloat(corporateRevenue.total)).toFixed(2),
    };
  }),

  recentActivity: portalProcedure.query(async () => {
    const db = getDb();
    const recentWeddings = await db.select().from(weddingBookings)
      .orderBy(desc(weddingBookings.createdAt)).limit(5);
    const recentCorporate = await db.select().from(corporateBookings)
      .orderBy(desc(corporateBookings.createdAt)).limit(5);
    const recentInquiries = await db.select().from(inquiries)
      .orderBy(desc(inquiries.createdAt)).limit(5);
    return { recentWeddings, recentCorporate, recentInquiries };
  }),

  upcomingEvents: portalProcedure.query(async () => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const upcoming = await db.select().from(weddingBookings)
      .where(and(sql`${weddingBookings.weddingDate} >= ${today}`, eq(weddingBookings.status, "confirmed")))
      .orderBy(weddingBookings.weddingDate).limit(10);
    const upcomingCorp = await db.select().from(corporateBookings)
      .where(and(sql`${corporateBookings.arrivalDate} >= ${today}`, eq(corporateBookings.status, "confirmed")))
      .orderBy(corporateBookings.arrivalDate).limit(10);
    return { weddings: upcoming, corporate: upcomingCorp };
  }),

  notifications: portalProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(portalNotifications)
      .where(and(eq(portalNotifications.recipientUserId, ctx.user.id), eq(portalNotifications.read, false)))
      .orderBy(desc(portalNotifications.createdAt)).limit(20);
  }),

  markNotificationRead: portalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(portalNotifications)
        .set({ read: true })
        .where(and(eq(portalNotifications.id, input.id), eq(portalNotifications.recipientUserId, ctx.user.id)));
      return { success: true };
    }),

  markAllNotificationsRead: portalProcedure.mutation(async ({ ctx }) => {
    const db = getDb();
    await db.update(portalNotifications)
      .set({ read: true })
      .where(eq(portalNotifications.recipientUserId, ctx.user.id));
    return { success: true };
  }),
});

// ─── Calendar Router ──────────────────────────────────────────────────────────
const calendarRouter = router({
  events: portalProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      types: z.array(z.string()).optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const weddings = await db.select().from(weddingBookings)
        .where(and(
          sql`${weddingBookings.weddingDate} >= ${input.startDate}`,
          sql`${weddingBookings.weddingDate} <= ${input.endDate}`
        ));
      const corporate = await db.select().from(corporateBookings)
        .where(and(
          sql`${corporateBookings.arrivalDate} >= ${input.startDate}`,
          sql`${corporateBookings.departureDate} <= ${input.endDate}`
        ));
      const huntFish = await db.select().from(huntFishBookings)
        .where(and(
          sql`${huntFishBookings.bookingDate} >= ${input.startDate}`,
          sql`${huntFishBookings.bookingDate} <= ${input.endDate}`
        ));
      const blocked = await db.select().from(portalBlockedDates)
        .where(and(
          sql`${portalBlockedDates.startDate} <= ${input.endDate}`,
          sql`${portalBlockedDates.endDate} >= ${input.startDate}`
        ));
      return {
        weddings: weddings.map(w => ({ ...w, _type: "wedding" as const })),
        corporate: corporate.map(c => ({ ...c, _type: "corporate" as const })),
        huntFish: huntFish.map(h => ({ ...h, _type: "hunt_fish" as const })),
        blocked: blocked.map(b => ({ ...b, _type: "blocked" as const })),
      };
    }),

  blockDates: portalProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      reason: z.enum(["maintenance", "private_use", "seasonal_closure", "buffer", "other"]).optional(),
      reasonNotes: z.string().optional(),
      scope: z.enum(["entire_property", "specific_venue", "specific_lodging"]).optional(),
      scopeTarget: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [result] = await db.insert(portalBlockedDates).values({
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        reason: input.reason ?? "other",
        reasonNotes: input.reasonNotes ?? null,
        scope: input.scope ?? "entire_property",
        scopeTarget: input.scopeTarget ?? null,
        createdByUserId: ctx.user.id,
      } as any);
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "create",
        entityType: "PortalBlockedDate",
        entityId: String(result.insertId),
        notes: `Blocked ${input.startDate} to ${input.endDate}`,
      });
      return { success: true, id: result.insertId };
    }),

  unblockDates: portalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(portalBlockedDates).where(eq(portalBlockedDates.id, input.id));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "delete",
        entityType: "PortalBlockedDate",
        entityId: String(input.id),
      });
      return { success: true };
    }),
});

// ─── Weddings Router ──────────────────────────────────────────────────────────
const weddingsPortalRouter = router({
  list: portalProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.status) conditions.push(eq(weddingBookings.status, input.status as any));
      if (input.search) conditions.push(
        or(
          like(weddingBookings.coupleName, `%${input.search}%`),
          like(weddingBookings.contactEmail, `%${input.search}%`),
          like(weddingBookings.coordinatorName, `%${input.search}%`)
        )
      );
      const query = conditions.length > 0
        ? db.select().from(weddingBookings).where(and(...conditions))
        : db.select().from(weddingBookings);
      return query.orderBy(desc(weddingBookings.createdAt)).limit(input.limit).offset(input.offset);
    }),

  get: portalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [booking] = await db.select().from(weddingBookings).where(eq(weddingBookings.id, input.id));
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      const notes = await db.select().from(portalNotes)
        .where(and(eq(portalNotes.entityType, "wedding"), eq(portalNotes.entityId, input.id)))
        .orderBy(desc(portalNotes.createdAt));
      const docs = await db.select().from(portalDocuments)
        .where(and(eq(portalDocuments.linkedEntityType, "wedding"), eq(portalDocuments.linkedEntityId, input.id)));
      return { booking, notes, docs };
    }),

  create: portalProcedure
    .input(z.object({
      coupleName: z.string().min(1),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
      weddingDate: z.string().optional(),
      guestCountEstimate: z.number().optional(),
      source: z.enum(["website", "referral", "direct", "social", "vendor"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [result] = await db.insert(weddingBookings).values({
        coupleName: input.coupleName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        weddingDate: input.weddingDate ? new Date(input.weddingDate) : null,
        guestCountEstimate: input.guestCountEstimate ?? null,
        source: input.source ?? "website",
        notes: input.notes ?? null,
        assignedUserId: ctx.user.id,
      } as any);
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "create",
        entityType: "WeddingBooking",
        entityId: String(result.insertId),
      });
      return { id: result.insertId };
    }),

  update: portalProcedure
    .input(z.object({
      id: z.number(),
      coupleName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      weddingDate: z.string().optional(),
      ceremonyVenue: z.string().optional(),
      receptionVenue: z.string().optional(),
      guestCountEstimate: z.number().optional(),
      guestCountFinal: z.number().optional(),
      ceremonyTime: z.string().optional(),
      receptionEndTime: z.string().optional(),
      rehearsalDate: z.string().optional(),
      rehearsalDinner: z.boolean().optional(),
      coordinatorName: z.string().optional(),
      coordinatorContact: z.string().optional(),
      contractValue: z.string().optional(),
      depositAmount: z.string().optional(),
      depositReceivedDate: z.string().optional(),
      balanceDueDate: z.string().optional(),
      balanceReceivedDate: z.string().optional(),
      source: z.enum(["website", "referral", "direct", "social", "vendor"]).optional(),
      referredBy: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      await db.update(weddingBookings).set(filtered as any).where(eq(weddingBookings.id, id));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "update",
        entityType: "WeddingBooking",
        entityId: String(id),
      });
      return { success: true };
    }),

  updateStatus: portalProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["inquiry", "contacted", "site_visit", "proposal_sent", "contract_out", "confirmed", "completed", "cancelled"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [existing] = await db.select({ status: weddingBookings.status }).from(weddingBookings).where(eq(weddingBookings.id, input.id));
      await db.update(weddingBookings).set({ status: input.status }).where(eq(weddingBookings.id, input.id));
      if (input.notes) {
        await db.insert(portalNotes).values({
          authorUserId: ctx.user.id,
          authorName: ctx.user.name ?? "Staff",
          entityType: "wedding",
          entityId: input.id,
          body: input.notes,
        });
      }
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "status_change",
        entityType: "WeddingBooking",
        entityId: String(input.id),
        oldValue: existing?.status,
        newValue: input.status,
      });
      return { success: true };
    }),

  addNote: portalProcedure
    .input(z.object({
      id: z.number(),
      body: z.string().min(1),
      internal: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.insert(portalNotes).values({
        authorUserId: ctx.user.id,
        authorName: ctx.user.name ?? "Staff",
        entityType: "wedding",
        entityId: input.id,
        body: input.body,
        internal: input.internal,
      });
      return { success: true };
    }),
});

// ─── Corporate Router ─────────────────────────────────────────────────────────
const corporatePortalRouter = router({
  list: portalProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.status) conditions.push(eq(corporateBookings.status, input.status as any));
      if (input.search) conditions.push(
        or(
          like(corporateBookings.companyName, `%${input.search}%`),
          like(corporateBookings.contactName, `%${input.search}%`),
          like(corporateBookings.contactEmail, `%${input.search}%`)
        )
      );
      const query = conditions.length > 0
        ? db.select().from(corporateBookings).where(and(...conditions))
        : db.select().from(corporateBookings);
      return query.orderBy(desc(corporateBookings.createdAt)).limit(input.limit).offset(input.offset);
    }),

  get: portalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [booking] = await db.select().from(corporateBookings).where(eq(corporateBookings.id, input.id));
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      const notes = await db.select().from(portalNotes)
        .where(and(eq(portalNotes.entityType, "corporate"), eq(portalNotes.entityId, input.id)))
        .orderBy(desc(portalNotes.createdAt));
      return { booking, notes };
    }),

  create: portalProcedure
    .input(z.object({
      companyName: z.string().min(1),
      contactName: z.string().min(1),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
      eventType: z.enum(["team_retreat", "board_meeting", "incentive_trip", "company_hunt", "private_buyout", "other"]).optional(),
      arrivalDate: z.string().optional(),
      departureDate: z.string().optional(),
      attendeeCount: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [result] = await db.insert(corporateBookings).values({
        companyName: input.companyName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        eventType: input.eventType ?? "other",
        arrivalDate: input.arrivalDate ? new Date(input.arrivalDate) : null,
        departureDate: input.departureDate ? new Date(input.departureDate) : null,
        attendeeCount: input.attendeeCount ?? null,
        notes: input.notes ?? null,
        assignedUserId: ctx.user.id,
      } as any);
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "create",
        entityType: "CorporateBooking",
        entityId: String(result.insertId),
      });
      return { id: result.insertId };
    }),

  update: portalProcedure
    .input(z.object({
      id: z.number(),
      companyName: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      eventType: z.enum(["team_retreat", "board_meeting", "incentive_trip", "company_hunt", "private_buyout", "other"]).optional(),
      arrivalDate: z.string().optional(),
      departureDate: z.string().optional(),
      attendeeCount: z.number().optional(),
      cateringRequired: z.boolean().optional(),
      avRequired: z.boolean().optional(),
      contractValue: z.string().optional(),
      depositAmount: z.string().optional(),
      depositReceivedDate: z.string().optional(),
      balanceDueDate: z.string().optional(),
      balanceReceivedDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      await db.update(corporateBookings).set(filtered as any).where(eq(corporateBookings.id, id));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "update",
        entityType: "CorporateBooking",
        entityId: String(id),
      });
      return { success: true };
    }),

  updateStatus: portalProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["inquiry", "contacted", "proposal_sent", "contract_out", "confirmed", "completed", "cancelled"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(corporateBookings).set({ status: input.status }).where(eq(corporateBookings.id, input.id));
      if (input.notes) {
        await db.insert(portalNotes).values({
          authorUserId: ctx.user.id,
          authorName: ctx.user.name ?? "Staff",
          entityType: "corporate",
          entityId: input.id,
          body: input.notes,
        });
      }
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "status_change",
        entityType: "CorporateBooking",
        entityId: String(input.id),
        newValue: input.status,
      });
      return { success: true };
    }),

  addNote: portalProcedure
    .input(z.object({ id: z.number(), body: z.string().min(1), internal: z.boolean().default(true) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.insert(portalNotes).values({
        authorUserId: ctx.user.id,
        authorName: ctx.user.name ?? "Staff",
        entityType: "corporate",
        entityId: input.id,
        body: input.body,
        internal: input.internal,
      });
      return { success: true };
    }),
});

// ─── Hunt & Fish Router ───────────────────────────────────────────────────────
const huntFishPortalRouter = router({
  list: portalProcedure
    .input(z.object({
      status: z.string().optional(),
      bookingType: z.string().optional(),
      guideUserId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.status) conditions.push(eq(huntFishBookings.status, input.status as any));
      if (input.bookingType) conditions.push(eq(huntFishBookings.bookingType, input.bookingType as any));
      if (input.guideUserId) conditions.push(eq(huntFishBookings.guideUserId, input.guideUserId));
      if (input.startDate) conditions.push(sql`${huntFishBookings.bookingDate} >= ${input.startDate}`);
      if (input.endDate) conditions.push(sql`${huntFishBookings.bookingDate} <= ${input.endDate}`);
      const query = conditions.length > 0
        ? db.select().from(huntFishBookings).where(and(...conditions))
        : db.select().from(huntFishBookings);
      return query.orderBy(huntFishBookings.bookingDate).limit(input.limit);
    }),

  get: portalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [booking] = await db.select().from(huntFishBookings).where(eq(huntFishBookings.id, input.id));
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      const harvests = await db.select().from(harvestRecords).where(eq(harvestRecords.huntFishBookingId, input.id));
      const notes = await db.select().from(portalNotes)
        .where(and(eq(portalNotes.entityType, "hunt_fish"), eq(portalNotes.entityId, input.id)))
        .orderBy(desc(portalNotes.createdAt));
      return { booking, harvests, notes };
    }),

  create: portalProcedure
    .input(z.object({
      bookingType: z.enum(["guided_hunt", "self_guided_hunt", "fishing", "sporting_clays"]),
      species: z.enum(["whitetail", "waterfowl", "turkey", "bass", "catfish", "crappie", "clays", "other"]).optional(),
      clientType: z.enum(["member", "corporate_group", "guest"]).optional(),
      clientName: z.string().min(1),
      clientEmail: z.string().email().optional(),
      bookingDate: z.string(),
      startTime: z.string().optional(),
      partySize: z.number().optional(),
      guideUserId: z.number().optional(),
      standLocation: z.string().optional(),
      season: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [result] = await db.insert(huntFishBookings).values({
        bookingType: input.bookingType,
        species: input.species ?? "other",
        clientType: input.clientType ?? "member",
        clientName: input.clientName,
        clientEmail: input.clientEmail ?? null,
        bookingDate: new Date(input.bookingDate),
        startTime: input.startTime ?? null,
        partySize: input.partySize ?? 1,
        guideUserId: input.guideUserId ?? null,
        standLocation: input.standLocation ?? null,
        season: input.season ?? null,
        notes: input.notes ?? null,
      } as any);
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "create",
        entityType: "HuntFishBooking",
        entityId: String(result.insertId),
      });
      return { id: result.insertId };
    }),

  updateStatus: portalProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["requested", "confirmed", "in_progress", "completed", "cancelled"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(huntFishBookings).set({ status: input.status }).where(eq(huntFishBookings.id, input.id));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "status_change",
        entityType: "HuntFishBooking",
        entityId: String(input.id),
        newValue: input.status,
      });
      return { success: true };
    }),

  assignGuide: portalProcedure
    .input(z.object({ id: z.number(), guideUserId: z.number(), standLocation: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(huntFishBookings).set({
        guideUserId: input.guideUserId,
        standLocation: input.standLocation ?? null,
      }).where(eq(huntFishBookings.id, input.id));
      return { success: true };
    }),

  addHarvest: portalProcedure
    .input(z.object({
      huntFishBookingId: z.number(),
      species: z.string(),
      count: z.number().default(1),
      details: z.string().optional(),
      guideNotes: z.string().optional(),
      harvestDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [result] = await db.insert(harvestRecords).values({
        huntFishBookingId: input.huntFishBookingId,
        species: input.species,
        count: input.count,
        details: input.details ?? null,
        guideNotes: input.guideNotes ?? null,
        harvestDate: new Date(input.harvestDate),
      } as any);
      return { id: result.insertId };
    }),

  seasons: portalProcedure.query(async () => {
    const db = getDb();
    return db.select().from(seasonConfigs).orderBy(desc(seasonConfigs.openDate));
  }),

  createSeason: portalProcedure
    .input(z.object({
      seasonName: z.string(),
      species: z.enum(["whitetail", "waterfowl", "turkey", "bass", "catfish", "crappie", "clays", "all"]),
      openDate: z.string(),
      closeDate: z.string(),
      dailyBagLimit: z.number().optional(),
      seasonBagLimit: z.number().optional(),
      guideRate: z.string().optional(),
      memberNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(seasonConfigs).values({
        seasonName: input.seasonName,
        species: input.species,
        openDate: new Date(input.openDate),
        closeDate: new Date(input.closeDate),
        dailyBagLimit: input.dailyBagLimit ?? null,
        seasonBagLimit: input.seasonBagLimit ?? null,
        guideRate: input.guideRate ?? null,
        memberNotes: input.memberNotes ?? null,
      } as any);
      return { id: result.insertId };
    }),

  guideSchedule: portalProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const bookingsInRange = await db.select().from(huntFishBookings)
        .where(and(
          sql`${huntFishBookings.bookingDate} >= ${input.startDate}`,
          sql`${huntFishBookings.bookingDate} <= ${input.endDate}`,
          sql`guideUserId IS NOT NULL`
        )).orderBy(huntFishBookings.bookingDate);
      const guideIds = Array.from(new Set(bookingsInRange.map(b => b.guideUserId).filter((id): id is number => id !== null)));
      const guides = guideIds.length > 0
        ? await db.select({ id: users.id, name: users.name }).from(users).where(sql`id IN (${sql.join(guideIds.map((id) => sql`${id}`), sql`, `)})`)
        : [];
      return { bookings: bookingsInRange, guides };
    }),
});

// ─── Waivers Router ───────────────────────────────────────────────────────────
const waiversPortalRouter = router({
  templates: portalProcedure.query(async () => {
    const db = getDb();
    return db.select().from(waiverTemplates).where(eq(waiverTemplates.active, true));
  }),

  createTemplate: ownerProcedure
    .input(z.object({
      templateName: z.string(),
      templateType: z.enum(["general", "hunt", "fish", "sporting_clays", "event"]),
      bodyText: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(waiverTemplates).values(input as any);
      return { id: result.insertId };
    }),

  list: portalProcedure
    .input(z.object({
      status: z.string().optional(),
      linkedBookingType: z.string().optional(),
      linkedBookingId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.status) conditions.push(eq(portalWaivers.status, input.status as any));
      if (input.linkedBookingType) conditions.push(eq(portalWaivers.linkedBookingType, input.linkedBookingType));
      if (input.linkedBookingId) conditions.push(eq(portalWaivers.linkedBookingId, input.linkedBookingId));
      const query = conditions.length > 0
        ? db.select().from(portalWaivers).where(and(...conditions))
        : db.select().from(portalWaivers);
      return query.orderBy(desc(portalWaivers.createdAt)).limit(100);
    }),

  send: portalProcedure
    .input(z.object({
      templateId: z.number(),
      signatoryName: z.string(),
      signatoryEmail: z.string().email(),
      linkedBookingType: z.string().optional(),
      linkedBookingId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const token = randomBytes(32).toString("hex");
      const [result] = await db.insert(portalWaivers).values({
        templateId: input.templateId,
        signatoryName: input.signatoryName,
        signatoryEmail: input.signatoryEmail,
        linkedBookingType: input.linkedBookingType ?? null,
        linkedBookingId: input.linkedBookingId ?? null,
        status: "sent",
        signingToken: token,
        sentAt: new Date(),
      });
      return { id: result.insertId, signingToken: token, signingUrl: `/sign-waiver/${token}` };
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [waiver] = await db.select().from(portalWaivers).where(eq(portalWaivers.signingToken, input.token));
      if (!waiver) throw new TRPCError({ code: "NOT_FOUND", message: "Waiver not found or expired" });
      if (waiver.status === "signed") throw new TRPCError({ code: "BAD_REQUEST", message: "Waiver already signed" });
      const [template] = waiver.templateId
        ? await db.select().from(waiverTemplates).where(eq(waiverTemplates.id, waiver.templateId))
        : [null];
      return { waiver, template };
    }),

  sign: publicProcedure
    .input(z.object({
      token: z.string(),
      signatoryName: z.string(),
      ipAddress: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [waiver] = await db.select().from(portalWaivers).where(eq(portalWaivers.signingToken, input.token));
      if (!waiver) throw new TRPCError({ code: "NOT_FOUND" });
      if (waiver.status === "signed") throw new TRPCError({ code: "BAD_REQUEST", message: "Already signed" });
      const signedAt = new Date();
      // Fetch template content for PDF generation
      const [template] = waiver.templateId
        ? await db.select().from(waiverTemplates).where(eq(waiverTemplates.id, waiver.templateId))
        : [null];
      const waiverTitle = template?.templateName ?? "Liability Waiver & Release";
      const waiverContent = template?.bodyText ?? "By signing this document, you acknowledge and agree to the terms and conditions set forth by Rivers Lodge & Hunt Club. You understand and accept all risks associated with the activities at the property, including but not limited to hunting, fishing, equestrian activities, and use of all facilities. You release Rivers Lodge & Hunt Club, its owners, employees, and agents from any liability for injury, loss, or damage arising from your participation in any activities on the property.";
      // Generate and store signed PDF (non-blocking — signing succeeds even if PDF fails)
      let signedPdfKey: string | null = null;
      try {
        const { key } = await generateAndStoreWaiverPdf({
          waiverTitle,
          waiverContent,
          signatoryName: input.signatoryName,
          signatoryEmail: waiver.signatoryEmail ?? null,
          signedAt,
          ipAddress: input.ipAddress ?? null,
          waiverToken: input.token,
        });
        signedPdfKey = key;
      } catch (pdfErr) {
        console.error("[Waiver] PDF generation failed:", pdfErr);
      }
      await db.update(portalWaivers).set({
        status: "signed",
        signedAt,
        signatoryName: input.signatoryName,
        ipAddress: input.ipAddress ?? null,
        ...(signedPdfKey ? { signedPdfKey } : {}),
      }).where(eq(portalWaivers.signingToken, input.token));
      return { success: true, pdfKey: signedPdfKey };
    }),
});

// ─── Customers Router ─────────────────────────────────────────────────────────
const customersPortalRouter = router({
  list: portalProcedure
    .input(z.object({ search: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.search) {
        return db.select().from(users)
          .where(or(
            like(users.name, `%${input.search}%`),
            like(users.email, `%${input.search}%`)
          ))
          .limit(input.limit);
      }
      return db.select().from(users).orderBy(desc(users.createdAt)).limit(input.limit);
    }),

  get: portalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, input.id));
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const weddingHistory = await db.select().from(weddingBookings)
        .where(eq(weddingBookings.contactEmail, user.email ?? ""));
      const corporateHistory = await db.select().from(corporateBookings)
        .where(eq(corporateBookings.contactEmail, user.email ?? ""));
      return { user, weddingHistory, corporateHistory };
    }),
});

// ─── Employees Router ─────────────────────────────────────────────────────────
const employeesPortalRouter = router({
  list: ownerProcedure.query(async () => {
    const db = getDb();
    return db.select().from(users)
      .where(sql`role NOT IN ('user', 'member')`)
      .orderBy(users.name);
  }),

  updateRole: ownerProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["owner", "admin", "venue_sales", "events_manager", "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance", "member", "user"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [existing] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId));
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Owner",
        actionType: "update",
        entityType: "User",
        entityId: String(input.userId),
        fieldChanged: "role",
        oldValue: existing?.role,
        newValue: input.role,
      });
      return { success: true };
    }),
});

// ─── Membership Portal Router ─────────────────────────────────────────────────
// TODO(membership-extraction): EXTRACTED to features/membership/server/router.ts
// These procedures have been merged into membershipRouter in the feature module.
// Remove this sub-router and update the portalRouter assembly below once callers are migrated.
const membershipPortalRouter = router({
  applications: portalProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.status) {
        return db.select().from(membershipApplications)
          .where(eq(membershipApplications.status, input.status as any))
          .orderBy(desc(membershipApplications.createdAt));
      }
      return db.select().from(membershipApplications).orderBy(desc(membershipApplications.createdAt));
    }),

  updateApplicationStatus: portalProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "approved", "declined"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(membershipApplications)
        .set({ status: input.status })
        .where(eq(membershipApplications.id, input.id));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "status_change",
        entityType: "MembershipApplication",
        entityId: String(input.id),
        newValue: input.status,
        notes: input.notes,
      });
      return { success: true };
    }),

  stats: portalProcedure.query(async () => {
    const db = getDb();
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(members);
    const [active] = await db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.active, true));
    const [inactive] = await db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.active, false));
    const today = new Date().toISOString().split("T")[0];
    const [pendingRenewal] = await db.select({ count: sql<number>`count(*)` }).from(members)
      .where(sql`active = true AND renewalDate IS NOT NULL AND renewalDate <= DATE_ADD(${today}, INTERVAL 30 DAY)`);
    return { total: total.count, active: active.count, inactive: inactive.count, pendingRenewal: pendingRenewal.count, expired: inactive.count };
  }),
  members: portalProcedure
    .input(z.object({ active: z.boolean().optional(), tier: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.active !== undefined) conditions.push(eq(members.active, input.active));
      if (input.tier) conditions.push(eq(members.tier, input.tier as any));
      const query = conditions.length > 0
        ? db.select({ member: members, user: users }).from(members)
            .leftJoin(users, eq(members.userId, users.id))
            .where(and(...conditions))
        : db.select({ member: members, user: users }).from(members)
            .leftJoin(users, eq(members.userId, users.id));
      return query.orderBy(desc(members.createdAt));
    }),

  updateMember: portalProcedure
    .input(z.object({
      id: z.number(),
      tier: z.enum(["standard", "premier", "founding"]).optional(),
      active: z.boolean().optional(),
      renewalDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      await db.update(members).set(filtered as any).where(eq(members.id, id));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "update",
        entityType: "Member",
        entityId: String(id),
      });
      return { success: true };
    }),

  // Search users by name or email (for the Add Member form)
  searchUsers: portalProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const q = `%${input.query}%`;
      return db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(or(like(users.name, q), like(users.email, q)))
        .limit(20);
    }),

  // Create a new member record linked to an existing user
  createMember: portalProcedure
    .input(z.object({
      userId: z.number(),
      tier: z.enum(["standard", "premier", "founding"]).default("standard"),
      memberNumber: z.string().optional(),
      joinDate: z.string().optional(),
      renewalDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.userId, input.userId)).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "This user already has a member record" });
      let memberNumber = input.memberNumber;
      if (!memberNumber) {
        const year = new Date().getFullYear();
        const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(members);
        memberNumber = `RL-${year}-${String(Number(count) + 1).padStart(4, "0")}`;
      }
      const [newMember] = await db.insert(members).values({
        userId: input.userId,
        tier: input.tier,
        memberNumber,
        active: true,
        joinDate: input.joinDate ?? new Date().toISOString().split("T")[0],
        renewalDate: input.renewalDate ?? null,
        notes: input.notes ?? null,
      } as any).$returningId();
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "create",
        entityType: "Member",
        entityId: String(newMember.id),
        notes: `Created member ${memberNumber} (tier: ${input.tier})`,
      });
      return { success: true, memberId: newMember.id, memberNumber };
    }),
});

// ─── Audit Log Router ─────────────────────────────────────────────────────────
const auditLogRouter = router({
  list: ownerProcedure
    .input(z.object({
      entityType: z.string().optional(),
      actionType: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.entityType) conditions.push(eq(portalAuditLog.entityType, input.entityType));
      if (input.actionType) conditions.push(eq(portalAuditLog.actionType, input.actionType as any));
      const query = conditions.length > 0
        ? db.select().from(portalAuditLog).where(and(...conditions))
        : db.select().from(portalAuditLog);
      return query.orderBy(desc(portalAuditLog.createdAt)).limit(input.limit).offset(input.offset);
    }),
});

// ─── Analytics Router ─────────────────────────────────────────────────────────
const analyticsRouter = router({
  pipeline: portalProcedure.query(async () => {
    const db = getDb();
    const weddingPipeline = await db.select({
      status: weddingBookings.status,
      count: sql<number>`count(*)`,
      totalValue: sql<string>`COALESCE(SUM(contractValue), 0)`,
    }).from(weddingBookings).groupBy(weddingBookings.status);

    const corporatePipeline = await db.select({
      status: corporateBookings.status,
      count: sql<number>`count(*)`,
      totalValue: sql<string>`COALESCE(SUM(contractValue), 0)`,
    }).from(corporateBookings).groupBy(corporateBookings.status);

    return { weddingPipeline, corporatePipeline };
  }),

  memberActivity: portalProcedure.query(async () => {
    const db = getDb();
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.active, true));
    const byTier = await db.select({
      tier: members.tier,
      count: sql<number>`count(*)`,
    }).from(members).where(eq(members.active, true)).groupBy(members.tier);
    return { totalActive: total.count, byTier };
  }),

  huntFishSeason: portalProcedure
    .input(z.object({ season: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      const seasonCondition = input.season ? eq(huntFishBookings.season, input.season) : undefined;
      const bookingsByType = await db.select({
        bookingType: huntFishBookings.bookingType,
        count: sql<number>`count(*)`,
      }).from(huntFishBookings)
        .where(seasonCondition)
        .groupBy(huntFishBookings.bookingType);

      const harvestBySpecies = await db.select({
        species: harvestRecords.species,
        totalCount: sql<number>`SUM(count)`,
      }).from(harvestRecords).groupBy(harvestRecords.species);

      return { bookingsByType, harvestBySpecies };
    }),
});

// ─── Member Bookings Router ─────────────────────────────────────────────────
const memberBookingsRouter = router({
  list: portalProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions: ReturnType<typeof eq>[] = [eq(bookings.type, "member_stay")];
      if (input.status) conditions.push(eq(bookings.status, input.status as any));
      if (input.search) conditions.push(like(bookings.clientName, `%${input.search}%`) as any);
      return db.select().from(bookings).where(and(...conditions)).orderBy(desc(bookings.startDate)).limit(100);
    }),
  updateStatus: portalProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["inquiry", "confirmed", "completed", "cancelled"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const updates: Record<string, unknown> = { status: input.status };
      if (input.notes) updates.notes = input.notes;
      await db.update(bookings).set(updates as any).where(eq(bookings.id, input.id));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.name ?? "Staff",
        actionType: "status_change",
        entityType: "MemberBooking",
        entityId: String(input.id),
        newValue: input.status,
      });
      return { success: true };
    }),
});

// ─── Portal App Router ────────────────────────────────────────────────────────
export const portalRouter = router({
  dashboard: dashboardRouter,
  calendar: calendarRouter,
  weddings: weddingsPortalRouter,
  corporate: corporatePortalRouter,
  huntFish: huntFishPortalRouter,
  memberBookings: memberBookingsRouter,
  waivers: waiversPortalRouter,
  customers: customersPortalRouter,
  employees: employeesPortalRouter,
  membership: membershipPortalRouter,
  auditLog: auditLogRouter,
  analytics: analyticsRouter,
});
