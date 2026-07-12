import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateAndStoreWaiverPdf } from "@features/waivers/public";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import { eq, desc, and, gte, lte, sql, or, like, lt, inArray } from "drizzle-orm";
import {
  weddingBookings,
  corporateBookings,
  huntFishBookings,
  harvestRecords,
  seasonConfigs,
  portalBlockedDates,
  calendarAccessSettings,
  portalStaffAssignments,
  portalDocuments,
  waiverTemplates,
  waiverTemplateVersions,
  portalWaivers,
  portalAuditLog,
  portalNotifications,
  portalTasks,
  portalNotes,
} from "../schema";
// Cross-feature table refs — imported only via public.ts barrels
import { users } from "@features/auth/server/public";
import { members, membershipApplications, roles, resourceAccess } from "@features/membership/public";
import { inquiries } from "@features/inquiries/public";
import { bookings } from "@features/booking-engine/public";
import { waivers } from "@features/waivers/public";
import { seasonalUpdates } from "@features/updates/public";
import {
  cmsTestimonials,
  cmsFaqs,
  cmsAnnouncements,
  cmsMemberContent,
} from "@features/cms/public";
import { randomBytes, createHash } from "crypto";
import { invites } from "@features/auth/schema";
import { sendInviteEmail, sendPasswordResetNotification, sendWaiverEmail } from "@core/server/mailer";
import { storagePut, storageGetSignedUrl } from "@core/server/storage";
import { ENV } from "@core/server/env";
import { getPortalDb } from "@core/server/db";

const getDb = getPortalDb;

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
    // Run all count/sum queries concurrently — they are independent.
    const [
      [weddingCount],
      [corporateCount],
      [huntCount],
      [memberCount],
      [inquiryCount],
      [weddingRevenue],
      [corporateRevenue],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(weddingBookings).where(eq(weddingBookings.status, "confirmed")),
      db.select({ count: sql<number>`count(*)` })
        .from(corporateBookings).where(eq(corporateBookings.status, "confirmed")),
      db.select({ count: sql<number>`count(*)` })
        .from(huntFishBookings).where(eq(huntFishBookings.status, "confirmed")),
      db.select({ count: sql<number>`count(*)` })
        .from(members).where(eq(members.active, true)),
      db.select({ count: sql<number>`count(*)` })
        .from(inquiries).where(eq(inquiries.status, "new")),
      db.select({ total: sql<string>`COALESCE(SUM(${weddingBookings.contractValue}), 0)` })
        .from(weddingBookings).where(eq(weddingBookings.status, "confirmed")),
      db.select({ total: sql<string>`COALESCE(SUM(${corporateBookings.contractValue}), 0)` })
        .from(corporateBookings).where(eq(corporateBookings.status, "confirmed")),
    ]);
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
    const [recentWeddings, recentCorporate, recentInquiries] = await Promise.all([
      db.select().from(weddingBookings).orderBy(desc(weddingBookings.createdAt)).limit(5),
      db.select().from(corporateBookings).orderBy(desc(corporateBookings.createdAt)).limit(5),
      db.select().from(inquiries).orderBy(desc(inquiries.createdAt)).limit(5),
    ]);
    return { recentWeddings, recentCorporate, recentInquiries };
  }),

  upcomingEvents: portalProcedure.query(async () => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const [upcoming, upcomingCorp] = await Promise.all([
      db.select().from(weddingBookings)
        .where(and(sql`${weddingBookings.weddingDate} >= ${today}`, eq(weddingBookings.status, "confirmed")))
        .orderBy(weddingBookings.weddingDate).limit(10),
      db.select().from(corporateBookings)
        .where(and(sql`${corporateBookings.arrivalDate} >= ${today}`, eq(corporateBookings.status, "confirmed")))
        .orderBy(corporateBookings.arrivalDate).limit(10),
    ]);
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

// ─── Payload Normalizers ──────────────────────────────────────────────────────

/**
 * Normalize blockDates insert payload to prevent database constraint violations.
 * Converts empty strings and falsy values to null for datetime and optional string fields.
 */
function normalizeInsertPayload(input: {
  startAt?: string | null;
  endAt?: string | null;
  allDay?: boolean;
  reasonNotes?: string | null;
  scope?: string;
  scopeTarget?: string | null;
}) {
  const scope = input.scope ?? "entire_property";

  return {
    // DateTime fields: empty string → null, and always null if allDay is true
    startAt: input.allDay || !input.startAt ? null : input.startAt,
    endAt: input.allDay || !input.endAt ? null : input.endAt,

    // Reason notes: empty string → null
    reasonNotes: !input.reasonNotes?.trim() ? null : input.reasonNotes.trim(),

    // Scope and scopeTarget: empty string → null, always null when scope is entire_property
    scope,
    scopeTarget: scope === "entire_property" || !input.scopeTarget?.trim()
      ? null
      : input.scopeTarget.trim(),
  };
}

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
      const startTime = Date.now();

      // All four ranges are independent — fetch concurrently.
      const [weddings, corporate, huntFish, blocked] = await Promise.all([
        db.select().from(weddingBookings)
          .where(and(
            sql`${weddingBookings.weddingDate} >= ${input.startDate}`,
            sql`${weddingBookings.weddingDate} <= ${input.endDate}`
          )),
        db.select().from(corporateBookings)
          .where(and(
            sql`${corporateBookings.arrivalDate} >= ${input.startDate}`,
            sql`${corporateBookings.departureDate} <= ${input.endDate}`
          )),
        db.select().from(huntFishBookings)
          .where(and(
            sql`${huntFishBookings.bookingDate} >= ${input.startDate}`,
            sql`${huntFishBookings.bookingDate} <= ${input.endDate}`
          )),
        db.select().from(portalBlockedDates)
          .where(and(
            sql`${portalBlockedDates.startDate} <= ${input.endDate}`,
            sql`${portalBlockedDates.endDate} >= ${input.startDate}`
          )),
      ]);

      const result = {
        weddings: weddings.map(w => ({
          ...w,
          _type: "wedding" as const,
          title: w.coupleName || null,
          kind: "wedding" as const,
          startAt: null,
          endAt: null,
          allDay: true,
        })),
        corporate: corporate.map(c => ({
          ...c,
          _type: "corporate" as const,
          title: c.companyName || null,
          kind: "corporate" as const,
          startAt: null,
          endAt: null,
          allDay: true,
        })),
        huntFish: huntFish.map(h => ({
          ...h,
          _type: "hunt_fish" as const,
          title: h.species || null,
          kind: "hunt_fish" as const,
          startAt: null,
          endAt: null,
          allDay: true,
        })),
        blocked: blocked.map(b => ({
          ...b,
          _type: "blocked" as const,
          title: b.title || null,
          kind: b.kind || "blocked" as const,
          startAt: b.startAt,
          endAt: b.endAt,
          allDay: b.allDay ?? true,
        })),
      };

      const duration = Date.now() - startTime;
      console.log(`[calendar.events] Query completed in ${duration}ms (date range: ${input.startDate} to ${input.endDate})`, {
        weddings: weddings.length,
        corporate: corporate.length,
        huntFish: huntFish.length,
        blocked: blocked.length,
        blockedTitles: blocked.map(b => b.title).slice(0, 5),
      });
      return result;
    }),

  blockDates: portalProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      title: z.string().min(1).optional(),
      kind: z.enum(["wedding", "corporate", "hunt_fish", "blocked"]).optional(),
      startAt: z.string().datetime().nullable().optional(),
      endAt: z.string().datetime().nullable().optional(),
      allDay: z.boolean().optional(),
      reason: z.enum(["maintenance", "private_use", "seasonal_closure", "buffer", "other"]).optional(),
      reasonNotes: z.string().nullable().optional(),
      scope: z.enum(["entire_property", "specific_venue", "specific_lodging"]).optional(),
      scopeTarget: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = getDb();

        // Normalize all nullable fields: empty strings → null, falsy → null
        const payload = normalizeInsertPayload(input);

        // Defensive coercion: ensure null fields stay null, never empty string
        const insert = {
          startDate: input.startDate,
          endDate: input.endDate,
          title: input.title?.trim() || null,
          kind: input.kind ?? "blocked",
          startAt: payload.startAt === "" ? null : payload.startAt,
          endAt: payload.endAt === "" ? null : payload.endAt,
          allDay: input.allDay ?? true,
          reason: input.reason ?? "other",
          reasonNotes: payload.reasonNotes === "" ? null : payload.reasonNotes,
          scope: payload.scope,
          scopeTarget: payload.scopeTarget === "" ? null : payload.scopeTarget,
          createdByUserId: ctx.user.id,
        };

        // Log the insert payload for debugging
        console.log('[blockDates] Insert payload:', JSON.stringify({
          ...insert,
          createdByUserId: '[REDACTED]',
        }, null, 2));

        const [result] = await db.insert(portalBlockedDates).values(insert as any)
          .returning({
            id: portalBlockedDates.id,
            startDate: portalBlockedDates.startDate,
            endDate: portalBlockedDates.endDate,
            title: portalBlockedDates.title,
          });

        console.log('[blockDates] Insert succeeded:', JSON.stringify({
          insertedId: result.id,
          startDate: result.startDate,
          endDate: result.endDate,
          title: result.title,
        }));

        await logAudit({
          actingUserId: ctx.user.id,
          actingUserName: ctx.user.email ?? "Staff",
          actionType: "create",
          entityType: "PortalBlockedDate",
          entityId: String(result.id),
          notes: `Blocked ${insert.startDate} to ${insert.endDate}${insert.title ? `: ${insert.title}` : ""}`,
        });

        console.log('[blockDates] Returning success to client:', { success: true, id: result.id });
        return { success: true, id: result.id };
      } catch (err) {
        console.error('[blockDates] Failed to insert:', err instanceof Error ? err.message : String(err));
        { const rootErr: any = (err as any)?.cause ?? err; const baseMsg = err instanceof Error ? err.message : String(err); const pgErr = rootErr as any; const detail = pgErr?.detail ? ` | detail: ${pgErr.detail}` : ''; const code = pgErr?.code ? ` | code: ${pgErr.code}` : ''; const constraint = pgErr?.constraint ? ` | constraint: ${pgErr.constraint}` : ''; const column = pgErr?.column ? ` | column: ${pgErr.column}` : ''; const table = pgErr?.table ? ` | table: ${pgErr.table}` : ''; const hint = pgErr?.hint ? ` | hint: ${pgErr.hint}` : '';  throw new Error(`Failed to save event: ${baseMsg}${code}${detail}${(rootErr && (rootErr as any).message && (rootErr as any).message !== (err instanceof Error ? err.message : '')) ? ` | pgMessage: ${(rootErr as any).message}` : ''}${constraint}${column}${table}${hint}`); }
      }
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
      const [[booking], notes, docs] = await Promise.all([
        db.select().from(weddingBookings).where(eq(weddingBookings.id, input.id)),
        db.select().from(portalNotes)
          .where(and(eq(portalNotes.entityType, "wedding"), eq(portalNotes.entityId, input.id)))
          .orderBy(desc(portalNotes.createdAt)),
        db.select().from(portalDocuments)
          .where(and(eq(portalDocuments.linkedEntityType, "wedding"), eq(portalDocuments.linkedEntityId, input.id))),
      ]);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
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
      const [[booking], notes] = await Promise.all([
        db.select().from(corporateBookings).where(eq(corporateBookings.id, input.id)),
        db.select().from(portalNotes)
          .where(and(eq(portalNotes.entityType, "corporate"), eq(portalNotes.entityId, input.id)))
          .orderBy(desc(portalNotes.createdAt)),
      ]);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
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
      const [[booking], harvests, notes] = await Promise.all([
        db.select().from(huntFishBookings).where(eq(huntFishBookings.id, input.id)),
        db.select().from(harvestRecords).where(eq(harvestRecords.huntFishBookingId, input.id)),
        db.select().from(portalNotes)
          .where(and(eq(portalNotes.entityType, "hunt_fish"), eq(portalNotes.entityId, input.id)))
          .orderBy(desc(portalNotes.createdAt)),
      ]);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
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
          sql`${huntFishBookings.guideUserId} IS NOT NULL`
        )).orderBy(huntFishBookings.bookingDate);
      const guideIds = Array.from(new Set(bookingsInRange.map(b => b.guideUserId).filter((id): id is string => id !== null)));
      const guides = guideIds.length > 0
        ? await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, guideIds))
        : [];
      return { bookings: bookingsInRange, guides };
    }),
});

// ─── Waivers Router ───────────────────────────────────────────────────────────
const WAIVER_TYPES = ["general", "hunt", "fish", "sporting_clays", "event"] as const;
const DEFAULT_CONSENT =
  "I have read and understand this waiver, and I agree to its terms. I consent to signing electronically, and I understand my electronic signature is legally binding and equivalent to a handwritten signature.";
const DEFAULT_WAIVER_BODY =
  "By signing this document, you acknowledge and agree to the terms and conditions set forth by Rivers Lodge & Hunt Club. You understand and accept all risks associated with the activities at the property, including but not limited to hunting, fishing, equestrian activities, and use of all facilities. You release Rivers Lodge & Hunt Club, its owners, employees, and agents from any liability for injury, loss, or damage arising from your participation in any activities on the property.";

// Write an immutable version snapshot for a template; returns its id.
async function snapshotTemplateVersion(
  db: ReturnType<typeof getDb>,
  tpl: { id: number; version: number; templateName: string; templateType: any; bodyText: string; fileKey: string | null; fileName: string | null },
  userId: string,
): Promise<number> {
  const [row] = await db.insert(waiverTemplateVersions).values({
    templateId: tpl.id,
    version: tpl.version,
    templateName: tpl.templateName,
    templateType: tpl.templateType,
    bodyText: tpl.bodyText,
    fileKey: tpl.fileKey,
    fileName: tpl.fileName,
    createdByUserId: userId,
  }).returning({ id: waiverTemplateVersions.id });
  return row.id;
}

const waiversPortalRouter = router({
  // ─── Templates ───
  templates: portalProcedure
    .input(z.object({ includeArchived: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(waiverTemplates)
        .where(input?.includeArchived ? undefined : eq(waiverTemplates.archived, false))
        .orderBy(desc(waiverTemplates.updatedAt));
    }),

  templateGet: portalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [template] = await db.select().from(waiverTemplates).where(eq(waiverTemplates.id, input.id));
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      const versions = await db.select().from(waiverTemplateVersions)
        .where(eq(waiverTemplateVersions.templateId, input.id))
        .orderBy(desc(waiverTemplateVersions.version));
      return { template, versions };
    }),

  createTemplate: ownerProcedure
    .input(z.object({
      templateName: z.string().min(1).max(255),
      templateType: z.enum(WAIVER_TYPES).default("general"),
      description: z.string().max(2000).optional(),
      bodyText: z.string().min(1),
      fileKey: z.string().max(500).optional(),
      fileName: z.string().max(255).optional(),
      expiresInDays: z.number().int().min(1).max(3650).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [tpl] = await db.insert(waiverTemplates).values({
        templateName: input.templateName,
        templateType: input.templateType,
        description: input.description ?? null,
        bodyText: input.bodyText,
        fileKey: input.fileKey ?? null,
        fileName: input.fileName ?? null,
        expiresInDays: input.expiresInDays ?? null,
        version: 1,
        active: true,
        archived: false,
        createdByUserId: ctx.user.id,
      }).returning();
      await snapshotTemplateVersion(db, tpl, ctx.user.id);
      await logAudit({ actingUserId: ctx.user.id, actingUserName: ctx.user.email ?? "Admin", actionType: "create", entityType: "WaiverTemplate", entityId: String(tpl.id), newValue: input.templateName });
      return { id: tpl.id };
    }),

  updateTemplate: ownerProcedure
    .input(z.object({
      id: z.number(),
      templateName: z.string().min(1).max(255).optional(),
      templateType: z.enum(WAIVER_TYPES).optional(),
      description: z.string().max(2000).nullable().optional(),
      bodyText: z.string().min(1).optional(),
      fileKey: z.string().max(500).nullable().optional(),
      fileName: z.string().max(255).nullable().optional(),
      expiresInDays: z.number().int().min(1).max(3650).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [tpl] = await db.select().from(waiverTemplates).where(eq(waiverTemplates.id, input.id));
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND" });
      // Content changes create a new immutable version; metadata edits do not.
      const contentChanged =
        (input.bodyText !== undefined && input.bodyText !== tpl.bodyText) ||
        (input.fileKey !== undefined && (input.fileKey ?? null) !== tpl.fileKey) ||
        (input.templateName !== undefined && input.templateName !== tpl.templateName) ||
        (input.templateType !== undefined && input.templateType !== tpl.templateType);
      const nextVersion = contentChanged ? tpl.version + 1 : tpl.version;
      const merged = {
        templateName: input.templateName ?? tpl.templateName,
        templateType: (input.templateType ?? tpl.templateType) as any,
        description: input.description !== undefined ? input.description : tpl.description,
        bodyText: input.bodyText ?? tpl.bodyText,
        fileKey: input.fileKey !== undefined ? input.fileKey : tpl.fileKey,
        fileName: input.fileName !== undefined ? input.fileName : tpl.fileName,
        expiresInDays: input.expiresInDays !== undefined ? input.expiresInDays : tpl.expiresInDays,
        version: nextVersion,
      };
      await db.update(waiverTemplates).set(merged).where(eq(waiverTemplates.id, input.id));
      if (contentChanged) await snapshotTemplateVersion(db, { id: tpl.id, ...merged }, ctx.user.id);
      await logAudit({ actingUserId: ctx.user.id, actingUserName: ctx.user.email ?? "Admin", actionType: "update", entityType: "WaiverTemplate", entityId: String(input.id), notes: contentChanged ? `New version v${nextVersion}` : "Metadata update" });
      return { success: true, version: nextVersion };
    }),

  setTemplateActive: ownerProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(waiverTemplates).set({ active: input.active }).where(eq(waiverTemplates.id, input.id));
      await logAudit({ actingUserId: ctx.user.id, actingUserName: ctx.user.email ?? "Admin", actionType: "status_change", entityType: "WaiverTemplate", entityId: String(input.id), newValue: input.active ? "active" : "inactive" });
      return { success: true };
    }),

  archiveTemplate: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      // Never hard-delete — signed records reference historical versions. Archive only.
      await db.update(waiverTemplates).set({ archived: true, active: false }).where(eq(waiverTemplates.id, input.id));
      await logAudit({ actingUserId: ctx.user.id, actingUserName: ctx.user.email ?? "Admin", actionType: "status_change", entityType: "WaiverTemplate", entityId: String(input.id), newValue: "archived" });
      return { success: true };
    }),

  uploadDocument: ownerProcedure
    .input(z.object({
      fileName: z.string().min(1).max(255),
      contentType: z.string().max(120),
      dataBase64: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const allowed = [
        "application/pdf", "image/png", "image/jpeg",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowed.includes(input.contentType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported file type. Allowed: PDF, PNG, JPEG, DOC, DOCX." });
      }
      const buffer = Buffer.from(input.dataBase64, "base64");
      if (buffer.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Empty file" });
      if (buffer.length > 10 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "File exceeds the 10 MB limit." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
      try {
        const { key } = await storagePut(`waiver-templates/${safeName}`, buffer, input.contentType);
        return { fileKey: key, fileName: input.fileName };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "File storage is not configured. Set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY, or paste the waiver text instead." });
      }
    }),

  // ─── Sent waivers ───
  list: portalProcedure
    .input(z.object({
      status: z.string().optional(),
      templateId: z.number().optional(),
      search: z.string().optional(),
      linkedBookingType: z.string().optional(),
      linkedBookingId: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const c: any[] = [];
      if (input?.status && input.status !== "all") c.push(eq(portalWaivers.status, input.status as any));
      if (input?.templateId) c.push(eq(portalWaivers.templateId, input.templateId));
      if (input?.linkedBookingType) c.push(eq(portalWaivers.linkedBookingType, input.linkedBookingType));
      if (input?.linkedBookingId) c.push(eq(portalWaivers.linkedBookingId, input.linkedBookingId));
      if (input?.search) c.push(or(like(portalWaivers.signatoryName, `%${input.search}%`), like(portalWaivers.signatoryEmail, `%${input.search}%`)));
      if (input?.dateFrom) c.push(gte(portalWaivers.createdAt, new Date(input.dateFrom)));
      if (input?.dateTo) c.push(lte(portalWaivers.createdAt, new Date(input.dateTo)));
      return db.select().from(portalWaivers)
        .where(c.length ? and(...c) : undefined)
        .orderBy(desc(portalWaivers.createdAt)).limit(200);
    }),

  get: portalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [waiver] = await db.select().from(portalWaivers).where(eq(portalWaivers.id, input.id));
      if (!waiver) throw new TRPCError({ code: "NOT_FOUND" });
      const [template] = waiver.templateId
        ? await db.select().from(waiverTemplates).where(eq(waiverTemplates.id, waiver.templateId))
        : [null];
      const audit = await db.select().from(portalAuditLog)
        .where(and(eq(portalAuditLog.entityType, "Waiver"), eq(portalAuditLog.entityId, String(waiver.id))))
        .orderBy(desc(portalAuditLog.createdAt)).limit(50);
      return { waiver, template, audit };
    }),

  send: ownerProcedure
    .input(z.object({
      templateId: z.number(),
      recipients: z.array(z.object({
        signatoryName: z.string().min(1),
        signatoryEmail: z.string().email(),
      })).min(1).max(50),
      linkedBookingType: z.string().optional(),
      linkedBookingId: z.number().optional(),
      linkedMemberId: z.number().optional(),
      customMessage: z.string().max(2000).optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [tpl] = await db.select().from(waiverTemplates).where(eq(waiverTemplates.id, input.templateId));
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      if (!tpl.active || tpl.archived) throw new TRPCError({ code: "BAD_REQUEST", message: "Template is not active" });
      // Resolve (or create) the current immutable version snapshot.
      let [ver] = await db.select().from(waiverTemplateVersions)
        .where(and(eq(waiverTemplateVersions.templateId, tpl.id), eq(waiverTemplateVersions.version, tpl.version)))
        .limit(1);
      if (!ver) {
        const vid = await snapshotTemplateVersion(db, tpl, ctx.user.id);
        [ver] = await db.select().from(waiverTemplateVersions).where(eq(waiverTemplateVersions.id, vid));
      }
      const nowTs = new Date();
      const explicitDue = input.dueDate ? new Date(input.dueDate) : null;
      const ruleExpiry = tpl.expiresInDays ? new Date(nowTs.getTime() + tpl.expiresInDays * 86400000) : null;
      const expiresAt = explicitDue ?? ruleExpiry;
      const results: Array<{ id: number; email: string; signingUrl: string; emailSent: boolean }> = [];
      for (const r of input.recipients) {
        const token = randomBytes(32).toString("hex");
        const [row] = await db.insert(portalWaivers).values({
          templateId: tpl.id,
          templateVersionId: ver.id,
          templateVersion: ver.version,
          snapshotTitle: ver.templateName,
          snapshotBody: ver.bodyText,
          signatoryName: r.signatoryName,
          signatoryEmail: r.signatoryEmail,
          linkedBookingType: input.linkedBookingType ?? null,
          linkedBookingId: input.linkedBookingId ?? null,
          linkedMemberId: input.linkedMemberId ?? null,
          status: "sent",
          signingToken: token,
          senderUserId: ctx.user.id,
          senderName: ctx.user.email ?? "Rivers Lodge",
          customMessage: input.customMessage ?? null,
          expiresAt,
          sentAt: nowTs,
        }).returning({ id: portalWaivers.id });
        const signingUrl = `${ENV.appBaseUrl}/sign-waiver/${token}`;
        const emailSent = await sendWaiverEmail({
          to: r.signatoryEmail, signerName: r.signatoryName, waiverTitle: ver.templateName,
          signingUrl, senderName: ctx.user.email ?? "Rivers Lodge", customMessage: input.customMessage, expiresAt,
        });
        await db.update(portalWaivers).set({ deliveryStatus: emailSent ? "sent" : "not_sent" }).where(eq(portalWaivers.id, row.id));
        await logAudit({ actingUserId: ctx.user.id, actingUserName: ctx.user.email ?? "Admin", actionType: "create", entityType: "Waiver", entityId: String(row.id), notes: `Sent to ${r.signatoryEmail}${emailSent ? "" : " (email not delivered)"}` });
        results.push({ id: row.id, email: r.signatoryEmail, signingUrl, emailSent });
      }
      return { sent: results.length, results };
    }),

  resend: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [w] = await db.select().from(portalWaivers).where(eq(portalWaivers.id, input.id));
      if (!w) throw new TRPCError({ code: "NOT_FOUND" });
      if (w.status === "signed") throw new TRPCError({ code: "BAD_REQUEST", message: "Waiver already signed" });
      if (w.status === "revoked") throw new TRPCError({ code: "BAD_REQUEST", message: "Waiver was revoked" });
      const signingUrl = `${ENV.appBaseUrl}/sign-waiver/${w.signingToken}`;
      const emailSent = await sendWaiverEmail({
        to: w.signatoryEmail ?? "", signerName: w.signatoryName, waiverTitle: w.snapshotTitle ?? "Liability Waiver",
        signingUrl, senderName: ctx.user.email ?? "Rivers Lodge", customMessage: w.customMessage, expiresAt: w.expiresAt,
      });
      await db.update(portalWaivers).set({ sentAt: new Date(), status: "sent", deliveryStatus: emailSent ? "sent" : "not_sent" }).where(eq(portalWaivers.id, input.id));
      await logAudit({ actingUserId: ctx.user.id, actingUserName: ctx.user.email ?? "Admin", actionType: "update", entityType: "Waiver", entityId: String(input.id), notes: `Resent to ${w.signatoryEmail}` });
      return { success: true, emailSent, signingUrl };
    }),

  revoke: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [w] = await db.select().from(portalWaivers).where(eq(portalWaivers.id, input.id));
      if (!w) throw new TRPCError({ code: "NOT_FOUND" });
      if (w.status === "signed") throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot revoke a signed waiver" });
      await db.update(portalWaivers).set({ status: "revoked", revokedAt: new Date(), revokedByUserId: ctx.user.id }).where(eq(portalWaivers.id, input.id));
      await logAudit({ actingUserId: ctx.user.id, actingUserName: ctx.user.email ?? "Admin", actionType: "status_change", entityType: "Waiver", entityId: String(input.id), newValue: "revoked" });
      return { success: true };
    }),

  downloadUrl: portalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [w] = await db.select().from(portalWaivers).where(eq(portalWaivers.id, input.id));
      if (!w?.signedPdfKey) throw new TRPCError({ code: "NOT_FOUND", message: "No signed document available" });
      const url = await storageGetSignedUrl(w.signedPdfKey);
      return { url };
    }),

  // ─── Public signing ───
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [waiver] = await db.select().from(portalWaivers).where(eq(portalWaivers.signingToken, input.token));
      if (!waiver) throw new TRPCError({ code: "NOT_FOUND", message: "Waiver not found" });
      if (waiver.status === "revoked") throw new TRPCError({ code: "BAD_REQUEST", message: "This waiver request has been revoked" });
      if (waiver.status === "signed") throw new TRPCError({ code: "BAD_REQUEST", message: "Waiver already signed" });
      if (waiver.expiresAt && waiver.expiresAt.getTime() < Date.now()) {
        if (waiver.status !== "expired") await db.update(portalWaivers).set({ status: "expired" }).where(eq(portalWaivers.id, waiver.id));
        throw new TRPCError({ code: "BAD_REQUEST", message: "This waiver request has expired" });
      }
      // Track first view.
      if (waiver.status === "sent" && !waiver.viewedAt) {
        await db.update(portalWaivers).set({ status: "viewed", viewedAt: new Date() }).where(eq(portalWaivers.id, waiver.id));
      }
      return {
        waiver,
        title: waiver.snapshotTitle ?? "Liability Waiver & Release",
        body: waiver.snapshotBody ?? DEFAULT_WAIVER_BODY,
        consentText: DEFAULT_CONSENT,
      };
    }),

  sign: publicProcedure
    .input(z.object({
      token: z.string(),
      signatoryName: z.string().min(1).max(255),
      signatureData: z.string().max(200000).optional(),
      consentAccepted: z.boolean(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [waiver] = await db.select().from(portalWaivers).where(eq(portalWaivers.signingToken, input.token));
      if (!waiver) throw new TRPCError({ code: "NOT_FOUND" });
      if (waiver.status === "signed") throw new TRPCError({ code: "BAD_REQUEST", message: "Already signed" });
      if (waiver.status === "revoked") throw new TRPCError({ code: "BAD_REQUEST", message: "This waiver has been revoked" });
      if (waiver.expiresAt && waiver.expiresAt.getTime() < Date.now()) {
        await db.update(portalWaivers).set({ status: "expired" }).where(eq(portalWaivers.id, waiver.id));
        throw new TRPCError({ code: "BAD_REQUEST", message: "This waiver has expired" });
      }
      if (!input.consentAccepted) throw new TRPCError({ code: "BAD_REQUEST", message: "Consent is required to sign" });
      const signedAt = new Date();
      const waiverTitle = waiver.snapshotTitle ?? "Liability Waiver & Release";
      const waiverContent = waiver.snapshotBody ?? DEFAULT_WAIVER_BODY;
      let signedPdfKey: string | null = null;
      try {
        const { key } = await generateAndStoreWaiverPdf({
          waiverTitle, waiverContent,
          signatoryName: input.signatoryName,
          signatoryEmail: waiver.signatoryEmail ?? null,
          signedAt, ipAddress: input.ipAddress ?? null, waiverToken: input.token,
        });
        signedPdfKey = key;
      } catch (pdfErr) {
        console.error("[Waiver] PDF generation failed:", pdfErr);
      }
      await db.update(portalWaivers).set({
        status: "signed",
        signedAt,
        signatoryName: input.signatoryName,
        signatureName: input.signatoryName,
        signatureData: input.signatureData ?? null,
        consentAccepted: true,
        consentText: DEFAULT_CONSENT,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        ...(signedPdfKey ? { signedPdfKey } : {}),
      }).where(eq(portalWaivers.signingToken, input.token));
      await logAudit({ actingUserId: waiver.senderUserId ?? "system", actingUserName: input.signatoryName, actionType: "status_change", entityType: "Waiver", entityId: String(waiver.id), newValue: "signed", notes: `Signed by ${input.signatoryName}` });
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
      const [weddingHistory, corporateHistory] = await Promise.all([
        db.select().from(weddingBookings).where(eq(weddingBookings.contactEmail, user.email ?? "")),
        db.select().from(corporateBookings).where(eq(corporateBookings.contactEmail, user.email ?? "")),
      ]);
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
    const today = new Date().toISOString().split("T")[0];
    const [[total], [active], [inactive], [pendingRenewal]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(members),
      db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.active, true)),
      db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.active, false)),
      db.select({ count: sql<number>`count(*)` }).from(members)
        .where(and(
          eq(members.active, true),
          sql`${members.renewalDate} IS NOT NULL`,
          sql`${members.renewalDate} <= (${today}::date + INTERVAL '30 days')`,
        )),
    ]);
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
      tier: z.enum(["Designated", "Silver", "Social"]).optional(),
      roleId: z.number().optional(),
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
      tier: z.enum(["Designated", "Silver", "Social"]).default("Designated"),
      roleId: z.number(),
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
        roleId: input.roleId,
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
    const [weddingPipeline, corporatePipeline] = await Promise.all([
      db.select({
        status: weddingBookings.status,
        count: sql<number>`count(*)`,
        totalValue: sql<string>`COALESCE(SUM(${weddingBookings.contractValue}), 0)`,
      }).from(weddingBookings).groupBy(weddingBookings.status),
      db.select({
        status: corporateBookings.status,
        count: sql<number>`count(*)`,
        totalValue: sql<string>`COALESCE(SUM(${corporateBookings.contractValue}), 0)`,
      }).from(corporateBookings).groupBy(corporateBookings.status),
    ]);
    return { weddingPipeline, corporatePipeline };
  }),

  memberActivity: portalProcedure.query(async () => {
    const db = getDb();
    const [[total], byTier] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.active, true)),
      db.select({
        tier: members.tier,
        count: sql<number>`count(*)`,
      }).from(members).where(eq(members.active, true)).groupBy(members.tier),
    ]);
    return { totalActive: total.count, byTier };
  }),

  huntFishSeason: portalProcedure
    .input(z.object({ season: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      const seasonCondition = input.season ? eq(huntFishBookings.season, input.season) : undefined;
      const [bookingsByType, harvestBySpecies] = await Promise.all([
        db.select({
          bookingType: huntFishBookings.bookingType,
          count: sql<number>`count(*)`,
        }).from(huntFishBookings)
          .where(seasonCondition)
          .groupBy(huntFishBookings.bookingType),
        db.select({
          species: harvestRecords.species,
          totalCount: sql<number>`SUM(${harvestRecords.count})`,
        }).from(harvestRecords).groupBy(harvestRecords.species),
      ]);
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

// ─── Calendar Settings Router ─────────────────────────────────────────────────

// Skill group access stored as array: ["Designated", "Admin", "Employee"]
type SkillGroupAccessSettings = string[];

// Legacy format still used for UI backward compat: { Designated: true, Silver: false, ... }
type MasterCalendarAccessSettings = {
  Designated: boolean;
  Silver: boolean;
  Social: boolean;
  Admin: boolean;
  Employee: boolean;
};

type PropertyCalendarAccessSettings = Record<string, Record<string, boolean>>;

const calendarSettingsRouter = router({
  // ─── Master Calendar: Skill Group Based ───
  getMasterCalendarAccessBySkillGroup: ownerProcedure.query(async () => {
    const db = getDb();
    const result = await db
      .select()
      .from(calendarAccessSettings)
      .where(eq(calendarAccessSettings.settingKey, "master_calendar_skill_groups"));

    if (!result[0]) {
      // LOCKED DESIGN: Designated, Admin, Employee only. Silver and Social NEVER have access.
      return ["Designated", "Admin", "Employee"] as SkillGroupAccessSettings;
    }

    // Enforce lock: filter out any Silver/Social even if stored
    const stored = JSON.parse(result[0].settingValue) as string[];
    const filtered = stored.filter((sg) => sg !== "Silver" && sg !== "Social");
    return filtered as SkillGroupAccessSettings;
  }),

  updateMasterCalendarAccessBySkillGroup: ownerProcedure
    .input(z.array(z.string()))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // LOCKED DESIGN: Silver and Social can NEVER access Master Calendar
      const filtered = input.filter((sg) => sg !== "Silver" && sg !== "Social");

      await db
        .insert(calendarAccessSettings)
        .values({
          settingKey: "master_calendar_skill_groups",
          settingValue: JSON.stringify(filtered),
        })
        .onConflictDoUpdate({
          target: calendarAccessSettings.settingKey,
          set: { settingValue: JSON.stringify(filtered) },
        });

      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Admin",
        actionType: "update",
        entityType: "CalendarAccessSettings",
        fieldChanged: "master_calendar_skill_groups",
        newValue: JSON.stringify(input),
      });

      return { success: true };
    }),

  // ─── Property Calendars: Skill Group Based ───
  getPropertyCalendarAccessBySkillGroup: ownerProcedure.query(async () => {
    const db = getDb();
    const result = await db
      .select()
      .from(calendarAccessSettings)
      .where(eq(calendarAccessSettings.settingKey, "property_calendar_skill_groups"));

    if (!result[0]) {
      return {} as Record<string, SkillGroupAccessSettings>;
    }

    return JSON.parse(result[0].settingValue) as Record<string, SkillGroupAccessSettings>;
  }),

  updatePropertyCalendarAccessBySkillGroup: ownerProcedure
    .input(z.record(z.string(), z.array(z.string())))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      await db
        .insert(calendarAccessSettings)
        .values({
          settingKey: "property_calendar_skill_groups",
          settingValue: JSON.stringify(input),
        })
        .onConflictDoUpdate({
          target: calendarAccessSettings.settingKey,
          set: { settingValue: JSON.stringify(input) },
        });

      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Admin",
        actionType: "update",
        entityType: "CalendarAccessSettings",
        fieldChanged: "property_calendar_skill_groups",
        newValue: JSON.stringify(input),
      });

      return { success: true };
    }),

  // ─── Legacy Format (for UI backward compat) ───
  getMasterCalendarAccess: ownerProcedure.query(async () => {
    const db = getDb();
    const result = await db
      .select()
      .from(calendarAccessSettings)
      .where(eq(calendarAccessSettings.settingKey, "master_calendar_access"));

    if (!result[0]) {
      return {
        Designated: true,
        Silver: false,
        Social: false,
        Admin: true,
        Employee: true,
      } as MasterCalendarAccessSettings;
    }

    return JSON.parse(result[0].settingValue) as MasterCalendarAccessSettings;
  }),

  updateMasterCalendarAccess: ownerProcedure
    .input(z.record(z.string(), z.boolean()))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      await db
        .insert(calendarAccessSettings)
        .values({
          settingKey: "master_calendar_access",
          settingValue: JSON.stringify(input),
        })
        .onConflictDoUpdate({
          target: calendarAccessSettings.settingKey,
          set: { settingValue: JSON.stringify(input) },
        });

      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Admin",
        actionType: "update",
        entityType: "CalendarAccessSettings",
        fieldChanged: "master_calendar_access",
        newValue: JSON.stringify(input),
      });

      return { success: true };
    }),

  getPropertyCalendarAccess: ownerProcedure.query(async () => {
    const db = getDb();
    const result = await db
      .select()
      .from(calendarAccessSettings)
      .where(eq(calendarAccessSettings.settingKey, "property_calendar_access"));

    if (!result[0]) {
      return {} as PropertyCalendarAccessSettings;
    }

    return JSON.parse(result[0].settingValue) as PropertyCalendarAccessSettings;
  }),

  updatePropertyCalendarAccess: ownerProcedure
    .input(z.record(z.string(), z.record(z.string(), z.boolean())))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      await db
        .insert(calendarAccessSettings)
        .values({
          settingKey: "property_calendar_access",
          settingValue: JSON.stringify(input),
        })
        .onConflictDoUpdate({
          target: calendarAccessSettings.settingKey,
          set: { settingValue: JSON.stringify(input) },
        });

      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Admin",
        actionType: "update",
        entityType: "CalendarAccessSettings",
        fieldChanged: "property_calendar_access",
        newValue: JSON.stringify(input),
      });

      return { success: true };
    }),
});

// ─── Access Control Router ───────────────────────────────────────────────────
const accessControlRouter = router({
  // Get all roles
  listRoles: ownerProcedure.query(async () => {
    const db = getDb();
    return await db.select().from(roles).orderBy(roles.sortOrder);
  }),

  // Get resource access for a specific resource
  getResourceAccess: ownerProcedure
    .input(z.object({
      resourceType: z.string(),
      resourceId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const access = await db
        .select({
          id: resourceAccess.id,
          roleId: resourceAccess.roleId,
          canViewAndBook: resourceAccess.canViewAndBook,
        })
        .from(resourceAccess)
        .where(and(
          eq(resourceAccess.resourceType, input.resourceType),
          eq(resourceAccess.resourceId, input.resourceId)
        ));
      return access;
    }),

  // Update resource access for a role
  updateResourceAccess: ownerProcedure
    .input(z.object({
      resourceType: z.string(),
      resourceId: z.string(),
      roleId: z.number(),
      canViewAndBook: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Upsert: update if exists, insert if not
      const existing = await db
        .select({ id: resourceAccess.id })
        .from(resourceAccess)
        .where(and(
          eq(resourceAccess.resourceType, input.resourceType),
          eq(resourceAccess.resourceId, input.resourceId),
          eq(resourceAccess.roleId, input.roleId)
        ))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(resourceAccess)
          .set({ canViewAndBook: input.canViewAndBook })
          .where(eq(resourceAccess.id, existing[0].id));
      } else {
        await db.insert(resourceAccess).values({
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          roleId: input.roleId,
          canViewAndBook: input.canViewAndBook,
        });
      }
      return { success: true };
    }),

  // Check if user can access a resource (based on their member role)
  canAccessResource: protectedProcedure
    .input(z.object({
      resourceType: z.string(),
      resourceId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();

      // Get the member record for this user
      const member = await db
        .select()
        .from(members)
        .where(eq(members.userId, ctx.user.id))
        .limit(1);

      if (!member.length) {
        // Non-members can't access
        return { canAccess: false };
      }

      const memberRole = member[0].roleId;
      if (!memberRole) {
        // No role assigned
        return { canAccess: false };
      }

      // Check if there's an access entry for this resource and role
      const access = await db
        .select()
        .from(resourceAccess)
        .where(and(
          eq(resourceAccess.resourceType, input.resourceType),
          eq(resourceAccess.resourceId, input.resourceId),
          eq(resourceAccess.roleId, memberRole)
        ))
        .limit(1);

      return { canAccess: access.length > 0 && access[0].canViewAndBook };
    }),
});

// ─── Admin App Router ─────────────────────────────────────────────────────────
export const adminRouter = router({
  dashboard: dashboardRouter,
  calendar: calendarRouter,
  calendarSettings: calendarSettingsRouter,
  accessControl: accessControlRouter,
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
