import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateAndStoreWaiverPdf } from "@features/waivers/public";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, gte, lte, sql, or, like, lt } from "drizzle-orm";
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
} from "../schema";
// Cross-feature table refs — imported only via public.ts barrels
import { users } from "@features/auth/server/public";
import { members, membershipApplications } from "@features/membership/public";
import { inquiries } from "@features/inquiries/public";
import { bookings } from "@features/booking-engine/public";
import { waivers } from "@features/waivers/schema";
import { seasonalUpdates } from "@features/updates/schema";
import {
  cmsTestimonials,
  cmsFaqs,
  cmsAnnouncements,
  cmsMemberContent,
} from "@features/cms/schema";
import { randomBytes, createHash } from "crypto";
import { invites } from "@features/auth/schema";
import { sendInviteEmail, sendPasswordResetNotification } from "@core/server/mailer";
import { ENV } from "@core/server/env";

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return drizzle(process.env.DATABASE_URL);
}

// ─── Portal Role Guards ───────────────────────────────────────────────────────
const STAFF_ROLES = ["admin", "member"] as const;
type StaffRole = typeof STAFF_ROLES[number];

const portalProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user.role as string;
  if (!STAFF_ROLES.includes(role as StaffRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Portal access requires a staff role" });
  }
  return next({ ctx });
});

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ─── Audit Log Helper ─────────────────────────────────────────────────────────
async function logAudit(params: {
  actingUserId: string;
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

  /**
   * dashboardSummary — single endpoint that fans out 6 queries in parallel
   * and returns one combined payload.
   *
   * Replaces the 12 independent tRPC calls the AdminDashboard previously fired
   * on mount.  The client caches this for 30 s (staleTime) so tab-switches
   * don't trigger re-fetches.
   *
   * Not included here (separate endpoints):
   *   - messages.allMessages  — parameterized by `archived` toggle
   *   - portal.dashboard.cmsTab — heavy CMS collections, lazy-loaded on demand
   */
  dashboardSummary: portalProcedure.query(async () => {
    const db = getDb();
    const [
      allBookings,
      allInquiries,
      allMembers,
      allApplications,
      allWaivers,
      allUpdates,
    ] = await Promise.all([
      db.select().from(bookings).orderBy(desc(bookings.createdAt)),
      db.select().from(inquiries).orderBy(desc(inquiries.createdAt)),
      db.select().from(members).orderBy(desc(members.createdAt)),
      db.select().from(membershipApplications).orderBy(desc(membershipApplications.createdAt)),
      db.select().from(waivers).orderBy(desc(waivers.signedAt)),
      db.select().from(seasonalUpdates).orderBy(desc(seasonalUpdates.publishedAt)),
    ]);
    return {
      bookings: allBookings,
      inquiries: allInquiries,
      members: allMembers,
      applications: allApplications,
      waivers: allWaivers,
      updates: allUpdates,
    };
  }),

  /**
   * cmsTab — fetches all four CMS collections in parallel.
   * Enabled on the client only when the user navigates to the CMS tab,
   * so it never fires on initial dashboard load.
   */
  cmsTab: portalProcedure.query(async () => {
    const db = getDb();
    const [testimonials, faqs, announcements, memberContent] = await Promise.all([
      db.select().from(cmsTestimonials).orderBy(cmsTestimonials.sortOrder),
      db.select().from(cmsFaqs).orderBy(cmsFaqs.sortOrder),
      db.select().from(cmsAnnouncements).orderBy(desc(cmsAnnouncements.createdAt)),
      db.select().from(cmsMemberContent).orderBy(desc(cmsMemberContent.publishedAt)),
    ]);
    return { testimonials, faqs, announcements, memberContent };
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
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason ?? "other",
        reasonNotes: input.reasonNotes ?? null,
        scope: input.scope ?? "entire_property",
        scopeTarget: input.scopeTarget ?? null,
        createdByUserId: ctx.user.id,
      } as any).returning({ id: portalBlockedDates.id });
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Staff",
        actionType: "create",
        entityType: "PortalBlockedDate",
        entityId: String(result.id),
        notes: `Blocked ${input.startDate} to ${input.endDate}`,
      });
      return { success: true, id: result.id };
    }),

  unblockDates: portalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(portalBlockedDates).where(eq(portalBlockedDates.id, input.id));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Staff",
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
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input.limit;
      const conditions = [];
      if (input.status) conditions.push(eq(weddingBookings.status, input.status as any));
      if (input.search) conditions.push(
        or(
          like(weddingBookings.coupleName, `%${input.search}%`),
          like(weddingBookings.contactEmail, `%${input.search}%`),
          like(weddingBookings.coordinatorName, `%${input.search}%`)
        )
      );
      if (input.cursor !== undefined) conditions.push(lt(weddingBookings.id, input.cursor));
      const rows = await db.select().from(weddingBookings)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(weddingBookings.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;
      return { items, nextCursor };
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
      } as any).returning({ id: weddingBookings.id });
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Staff",
        actionType: "create",
        entityType: "WeddingBooking",
        entityId: String(result.id),
      });
      return { id: result.id };
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
        actingUserName: ctx.user.email ?? "Staff",
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
          authorName: ctx.user.email ?? "Staff",
          entityType: "wedding",
          entityId: input.id,
          body: input.notes,
        });
      }
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Staff",
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
        authorName: ctx.user.email ?? "Staff",
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
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input.limit;
      const conditions = [];
      if (input.status) conditions.push(eq(corporateBookings.status, input.status as any));
      if (input.search) conditions.push(
        or(
          like(corporateBookings.companyName, `%${input.search}%`),
          like(corporateBookings.contactName, `%${input.search}%`),
          like(corporateBookings.contactEmail, `%${input.search}%`)
        )
      );
      if (input.cursor !== undefined) conditions.push(lt(corporateBookings.id, input.cursor));
      const rows = await db.select().from(corporateBookings)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(corporateBookings.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;
      return { items, nextCursor };
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
      } as any).returning({ id: corporateBookings.id });
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Staff",
        actionType: "create",
        entityType: "CorporateBooking",
        entityId: String(result.id),
      });
      return { id: result.id };
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
        actingUserName: ctx.user.email ?? "Staff",
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
          authorName: ctx.user.email ?? "Staff",
          entityType: "corporate",
          entityId: input.id,
          body: input.notes,
        });
      }
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Staff",
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
        authorName: ctx.user.email ?? "Staff",
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
      guideUserId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input.limit;
      const conditions = [];
      if (input.status) conditions.push(eq(huntFishBookings.status, input.status as any));
      if (input.bookingType) conditions.push(eq(huntFishBookings.bookingType, input.bookingType as any));
      if (input.guideUserId) conditions.push(eq(huntFishBookings.guideUserId, input.guideUserId));
      if (input.startDate) conditions.push(sql`${huntFishBookings.bookingDate} >= ${input.startDate}`);
      if (input.endDate) conditions.push(sql`${huntFishBookings.bookingDate} <= ${input.endDate}`);
      if (input.cursor !== undefined) conditions.push(lt(huntFishBookings.id, input.cursor));
      const rows = await db.select().from(huntFishBookings)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(huntFishBookings.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;
      return { items, nextCursor };
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
      guideUserId: z.string().optional(),
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
      } as any).returning({ id: huntFishBookings.id });
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Staff",
        actionType: "create",
        entityType: "HuntFishBooking",
        entityId: String(result.id),
      });
      return { id: result.id };
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
        actingUserName: ctx.user.email ?? "Staff",
        actionType: "status_change",
        entityType: "HuntFishBooking",
        entityId: String(input.id),
        newValue: input.status,
      });
      return { success: true };
    }),

  assignGuide: portalProcedure
    .input(z.object({ id: z.number(), guideUserId: z.string(), standLocation: z.string().optional() }))
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
      } as any).returning({ id: harvestRecords.id });
      return { id: result.id };
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
      } as any).returning({ id: seasonConfigs.id });
      return { id: result.id };
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
      const guideIds = Array.from(new Set(bookingsInRange.map(b => b.guideUserId).filter((id): id is string => id !== null)));
      const guides = guideIds.length > 0
        ? await db.select({ id: users.id, email: users.email }).from(users).where(sql`id IN (${sql.join(guideIds.map((id) => sql`${id}`), sql`, `)})`)
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
      const [result] = await db.insert(waiverTemplates).values(input as any).returning({ id: waiverTemplates.id });
      return { id: result.id };
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
      }).returning({ id: portalWaivers.id });
      return { id: result.id, signingToken: token, signingUrl: `/sign-waiver/${token}` };
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
      const [template] = waiver.templateId
        ? await db.select().from(waiverTemplates).where(eq(waiverTemplates.id, waiver.templateId))
        : [null];
      const waiverTitle = template?.templateName ?? "Liability Waiver & Release";
      const waiverContent = template?.bodyText ?? "By signing this document, you acknowledge and agree to the terms and conditions set forth by Rivers Lodge & Hunt Club. You understand and accept all risks associated with the activities at the property, including but not limited to hunting, fishing, equestrian activities, and use of all facilities. You release Rivers Lodge & Hunt Club, its owners, employees, and agents from any liability for injury, loss, or damage arising from your participation in any activities on the property.";
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
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input.limit;
      const conditions = [];
      if (input.search) conditions.push(
        like(users.email, `%${input.search}%`)
      );
      if (input.cursor !== undefined) conditions.push(lt(users.id, input.cursor));
      const rows = await db.select().from(users)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(users.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;
      return { items, nextCursor };
    }),

  get: portalProcedure
    .input(z.object({ id: z.string() }))
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
      .where(sql`role NOT IN ('member')`)
      .orderBy(users.email);
  }),

  updateRole: ownerProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(["admin", "member"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [existing] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId));
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Owner",
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
// Remove this sub-router and update the adminRouter assembly below once callers are migrated.
const membershipPortalRouter = router({
  applications: portalProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input.limit;
      const conditions = [];
      if (input.status) conditions.push(eq(membershipApplications.status, input.status as any));
      if (input.cursor !== undefined) conditions.push(lt(membershipApplications.id, input.cursor));
      const rows = await db.select().from(membershipApplications)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(membershipApplications.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;
      return { items, nextCursor };
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
        actingUserName: ctx.user.email ?? "Staff",
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
    .input(z.object({
      active: z.boolean().optional(),
      tier: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input.limit;
      const conditions = [];
      if (input.active !== undefined) conditions.push(eq(members.active, input.active));
      if (input.tier) conditions.push(eq(members.tier, input.tier as any));
      if (input.cursor !== undefined) conditions.push(lt(members.id, input.cursor));
      const rows = await db.select({ member: members, user: users }).from(members)
        .leftJoin(users, eq(members.userId, users.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(members.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.member.id ?? null) : null;
      return { items, nextCursor };
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
        actingUserName: ctx.user.email ?? "Staff",
        actionType: "update",
        entityType: "Member",
        entityId: String(id),
      });
      return { success: true };
    }),

  searchUsers: portalProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const q = `%${input.query}%`;
      return db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(like(users.email, q))
        .limit(20);
    }),

  createMember: portalProcedure
    .input(z.object({
      userId: z.string(),
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
      } as any).returning({ id: members.id });
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Staff",
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
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input.limit;
      const conditions: any[] = [eq(bookings.type, "member_stay")];
      if (input.status) conditions.push(eq(bookings.status, input.status as any));
      if (input.search) conditions.push(like(bookings.clientName, `%${input.search}%`));
      if (input.cursor !== undefined) conditions.push(lt(bookings.id, input.cursor));
      const rows = await db.select().from(bookings)
        .where(and(...conditions))
        .orderBy(desc(bookings.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;
      return { items, nextCursor };
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
        actingUserName: ctx.user.email ?? "Staff",
        actionType: "status_change",
        entityType: "MemberBooking",
        entityId: String(input.id),
        newValue: input.status,
      });
      return { success: true };
    }),
});

// ─── Users Admin Router ───────────────────────────────────────────────────────
const usersAdminRouter = router({
  list: ownerProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.search) conditions.push(like(users.email, `%${input.search}%`));
      return db
        .select()
        .from(users)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(users.createdAt));
    }),

  invite: ownerProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(["admin", "member"]).default("member"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const email = input.email.toLowerCase();

      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing && existing.status !== "invited") {
        throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
      }

      let userId: string;
      if (existing) {
        userId = existing.id;
        // Update role in case it changed
        if (existing.role !== input.role) {
          await db.update(users).set({ role: input.role }).where(eq(users.id, userId));
        }
        // Expire old pending invites
        await db.update(invites).set({ expiresAt: new Date() }).where(eq(invites.userId, userId));
      } else {
        userId = crypto.randomUUID();
        await db.insert(users).values({
          id: userId,
          email,
          role: input.role,
          status: "invited",
          mustChangePassword: true,
          createdAt: new Date(),
        });
      }

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      await db.insert(invites).values({
        id: crypto.randomUUID(),
        userId,
        tokenHash,
        expiresAt,
        createdBy: ctx.user.id,
      });

      const inviteUrl = `${ENV.appBaseUrl}/accept-invite?token=${rawToken}`;
      const emailSent = await sendInviteEmail(email, inviteUrl, ctx.user.email ?? "An admin");

      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Admin",
        actionType: "create",
        entityType: "UserInvite",
        entityId: userId,
        newValue: email,
      });

      return { inviteUrl, emailSent };
    }),

  resendInvite: ownerProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (user.status !== "invited") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User has already accepted their invitation" });
      }

      // Expire all existing invites for this user
      await db.update(invites).set({ expiresAt: new Date() }).where(eq(invites.userId, input.userId));

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      await db.insert(invites).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        tokenHash,
        expiresAt,
        createdBy: ctx.user.id,
      });

      const inviteUrl = `${ENV.appBaseUrl}/accept-invite?token=${rawToken}`;
      const emailSent = await sendInviteEmail(user.email ?? "", inviteUrl, ctx.user.email ?? "An admin");

      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Admin",
        actionType: "create",
        entityType: "UserInviteResend",
        entityId: input.userId,
      });

      return { inviteUrl, emailSent };
    }),

  updateRole: ownerProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(["admin", "member"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id && input.role !== "admin") {
        // Demoting self — check if last admin
        const db = getDb();
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.status, "active")));
        if (Number(count) <= 1) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot demote yourself — you are the last active admin" });
        }
      }
      const db = getDb();
      const [existing] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Admin",
        actionType: "update",
        entityType: "User",
        entityId: input.userId,
        fieldChanged: "role",
        oldValue: existing.role,
        newValue: input.role,
      });
      return { success: true };
    }),

  updateStatus: ownerProcedure
    .input(z.object({
      userId: z.string(),
      status: z.enum(["active", "disabled"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id && input.status === "disabled") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot disable your own account" });
      }
      const db = getDb();
      const [target] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });

      // Prevent disabling the last active admin
      if (input.status === "disabled" && target.role === "admin") {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.status, "active")));
        if (Number(count) <= 1) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot disable the last active admin account" });
        }
      }

      await db.update(users).set({ status: input.status }).where(eq(users.id, input.userId));
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Admin",
        actionType: "status_change",
        entityType: "User",
        entityId: input.userId,
        oldValue: target.status,
        newValue: input.status,
      });
      return { success: true };
    }),

  forcePasswordReset: ownerProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [target] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.status === "invited") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User has not yet accepted their invitation" });
      }
      await db.update(users).set({ mustChangePassword: true }).where(eq(users.id, input.userId));
      await sendPasswordResetNotification(target.email ?? "", ctx.user.email ?? "An admin");
      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Admin",
        actionType: "override",
        entityType: "User",
        entityId: input.userId,
        fieldChanged: "mustChangePassword",
        newValue: "true",
      });
      return { success: true };
    }),
});

// ─── Admin App Router ─────────────────────────────────────────────────────────
export const adminRouter = router({
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
  users: usersAdminRouter,
});

// Backward-compat alias — consumed by server/routers.ts as `portalRouter`
export { adminRouter as portalRouter };
