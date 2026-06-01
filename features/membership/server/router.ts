// Membership feature router — merged from two sources:
//   • server/routers.ts (membershipRouter) — public application flow + admin management via adminProcedure
//   • server/portalRouter.ts (membershipPortalRouter) — staff management via portalProcedure
// TODO(membership-extraction): Remove the inline membershipRouter from server/routers.ts
//   and remove membershipPortalRouter from server/portalRouter.ts once callers are updated.

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import { notifyOwner } from "../../_core/server/notification";
import * as dal from "./dal";
import { members, users, membershipApplications } from "../../_core/db/schema";

// ─── Role Guards ──────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

const STAFF_ROLES = [
  "owner", "admin", "venue_sales", "events_manager", "membership_manager",
  "hunt_fish_ops", "hospitality", "staff", "finance",
] as const;
type StaffRole = typeof STAFF_ROLES[number];

const portalProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user.role as string;
  if (!STAFF_ROLES.includes(role as StaffRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Portal access requires a staff role" });
  }
  return next({ ctx });
});

// ─── Inline DB helper (mirrors portalRouter pattern) ──────────────────────────

function getPortalDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return drizzle(process.env.DATABASE_URL);
}

// ─── Audit Log (portalRouter-local helper) ────────────────────────────────────
// TODO(membership-extraction): Extract this shared helper once portalRouter is
// decomposed; for now we inline it to avoid circular imports.
import { portalAuditLog } from "../../_core/db/portal-schema";

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
  const db = getPortalDb();
  await db.insert(portalAuditLog).values({
    ...params,
    entityId: params.entityId ?? null,
    fieldChanged: params.fieldChanged ?? null,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
    notes: params.notes ?? null,
  });
}

// ─── Membership Router ────────────────────────────────────────────────────────

export const membershipRouter = router({
  // ── Public application flow (from server/routers.ts → membershipRouter) ────

  submitApplication: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        interests: z.string().optional(),
        referral: z.string().optional(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await dal.createMembershipApplication(input);
      await notifyOwner({
        title: `New membership application from ${input.name}`,
        content: `Email: ${input.email}\nPhone: ${input.phone ?? "—"}\nCity: ${input.city ?? "—"}, ${input.state ?? "—"}\nInterests: ${input.interests ?? "—"}\nReferral: ${input.referral ?? "—"}\n\n${input.message ?? ""}`,
      });
      return { success: true };
    }),

  // ── Member self-service (from server/routers.ts → membershipRouter) ────────

  myStatus: protectedProcedure.query(async ({ ctx }) => {
    return dal.getMemberByUserId(ctx.user.id);
  }),

  // ── Admin: application management (from server/routers.ts → membershipRouter) ──

  listApplications: adminProcedure.query(async () => {
    return dal.getAllMembershipApplications();
  }),

  // NOTE: updateApplicationStatus exists in both sources with slightly different
  // guards (adminProcedure in routers.ts vs portalProcedure in portalRouter.ts).
  // We consolidate under portalProcedure (broader staff access) and keep the
  // richer version from portalRouter that writes an audit log entry.
  updateApplicationStatus: portalProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "approved", "declined"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getPortalDb();
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

  listMembers: adminProcedure.query(async () => {
    return dal.getAllMembers();
  }),

  // NOTE: createMember exists in both sources. The portalProcedure version
  // (membershipPortalRouter) is richer: conflict check, auto-generated member
  // number, audit log. We keep that version and drop the simpler adminProcedure one.
  createMember: portalProcedure
    .input(
      z.object({
        userId: z.number(),
        tier: z.enum(["standard", "premier", "founding"]).default("standard"),
        memberNumber: z.string().optional(),
        joinDate: z.string().optional(),
        renewalDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getPortalDb();
      const [existing] = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.userId, input.userId))
        .limit(1);
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

  // NOTE: updateMember exists in both sources. The portalProcedure version
  // writes an audit log entry; we keep that one.
  updateMember: portalProcedure
    .input(
      z.object({
        id: z.number(),
        tier: z.enum(["standard", "premier", "founding"]).optional(),
        active: z.boolean().optional(),
        notes: z.string().optional(),
        renewalDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getPortalDb();
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

  // Admin-only preview helper (from server/routers.ts → membershipRouter)
  ensureMemberForPreview: adminProcedure.mutation(async ({ ctx }) => {
    const existing = await dal.getMemberByUserId(ctx.user.id);
    if (existing) return { member: existing, created: false };
    const year = new Date().getFullYear();
    const memberNumber = `RL-${year}-PREVIEW`;
    await dal.createMember({
      userId: ctx.user.id,
      memberNumber,
      tier: "founding",
      active: true,
      joinDate: new Date().toISOString().split("T")[0],
    } as any);
    const created = await dal.getMemberByUserId(ctx.user.id);
    return { member: created, created: true };
  }),

  // ── Staff portal procedures (from server/portalRouter.ts → membershipPortalRouter) ──

  // Filterable application list used by the portal UI
  applications: portalProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getPortalDb();
      if (input.status) {
        return db
          .select()
          .from(membershipApplications)
          .where(eq(membershipApplications.status, input.status as any))
          .orderBy(desc(membershipApplications.createdAt));
      }
      return db.select().from(membershipApplications).orderBy(desc(membershipApplications.createdAt));
    }),

  stats: portalProcedure.query(async () => {
    const db = getPortalDb();
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(members);
    const [active] = await db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.active, true));
    const [inactive] = await db.select({ count: sql<number>`count(*)` }).from(members).where(eq(members.active, false));
    const today = new Date().toISOString().split("T")[0];
    const [pendingRenewal] = await db
      .select({ count: sql<number>`count(*)` })
      .from(members)
      .where(sql`active = true AND renewalDate IS NOT NULL AND renewalDate <= DATE_ADD(${today}, INTERVAL 30 DAY)`);
    return {
      total: total.count,
      active: active.count,
      inactive: inactive.count,
      pendingRenewal: pendingRenewal.count,
      expired: inactive.count,
    };
  }),

  // Filterable member list with joined user data
  members: portalProcedure
    .input(z.object({ active: z.boolean().optional(), tier: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getPortalDb();
      const conditions = [];
      if (input.active !== undefined) conditions.push(eq(members.active, input.active));
      if (input.tier) conditions.push(eq(members.tier, input.tier as any));
      const query =
        conditions.length > 0
          ? db
              .select({ member: members, user: users })
              .from(members)
              .leftJoin(users, eq(members.userId, users.id))
              .where(and(...conditions))
          : db
              .select({ member: members, user: users })
              .from(members)
              .leftJoin(users, eq(members.userId, users.id));
      return query.orderBy(desc(members.createdAt));
    }),

  // Search users by name or email (for the Add Member form in the portal)
  searchUsers: portalProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getPortalDb();
      const q = `%${input.query}%`;
      return db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(or(like(users.name, q), like(users.email, q)))
        .limit(20);
    }),
});
