// Membership feature router — merged from two sources:
//   • server/routers.ts (membershipRouter) — public application flow + admin management via adminProcedure
//   • server/portalRouter.ts (membershipPortalRouter) — staff management via portalProcedure
// TODO(membership-extraction): Remove the inline membershipRouter from server/routers.ts
//   and remove membershipPortalRouter from server/portalRouter.ts once callers are updated.

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, or, like, sql, lt } from "drizzle-orm";
import { getPortalDb } from "@core/server/db";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import { notifyOwner } from "../../_core/server/notification";
import { verifyCaptcha } from "@core/server/captcha";
import * as dal from "./dal";
import { members, users, membershipApplications, memberSkillGroups, skillGroups } from '@core/db/schema';

// ─── Role Guards ──────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

const STAFF_ROLES = ["admin", "employee"] as const;
type StaffRole = typeof STAFF_ROLES[number];

const portalProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user.role as string;
  if (!STAFF_ROLES.includes(role as StaffRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Portal access requires a staff role" });
  }
  return next({ ctx });
});


// ─── Audit Log (portalRouter-local helper) ────────────────────────────────────
// TODO(membership-extraction): Extract this shared helper once portalRouter is
// decomposed; for now we inline it to avoid circular imports.
import { portalAuditLog } from '@core/db/portal-schema';

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
        captchaToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await verifyCaptcha(input.captchaToken);
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

  listApplications: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = getPortalDb();
      const limit = input.limit;
      const conditions = [];
      if (input.cursor !== undefined) {
        conditions.push(lt(membershipApplications.id, input.cursor));
      }
      const rows = await db
        .select()
        .from(membershipApplications)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(membershipApplications.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;
      return { items, nextCursor };
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
        actingUserName: ctx.user.email ?? "Staff",
        actionType: "status_change",
        entityType: "MembershipApplication",
        entityId: String(input.id),
        newValue: input.status,
        notes: input.notes,
      });
      return { success: true };
    }),

  listMembers: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = getPortalDb();
      const limit = input.limit;
      const conditions = [];
      if (input.cursor !== undefined) {
        conditions.push(lt(members.id, input.cursor));
      }
      const rows = await db
        .select()
        .from(members)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(members.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;
      return { items, nextCursor };
    }),

  // NOTE: createMember exists in both sources. The portalProcedure version
  // (membershipPortalRouter) is richer: conflict check, auto-generated member
  // number, audit log. We keep that version and drop the simpler adminProcedure one.
  createMember: portalProcedure
    .input(
      z.object({
        userId: z.string(),
        skillGroupIds: z.array(z.number()).optional(),
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
        memberNumber,
        active: true,
        joinDate: input.joinDate ?? new Date().toISOString().split("T")[0],
        renewalDate: input.renewalDate ?? null,
        notes: input.notes ?? null,
      } as any).returning({ id: members.id });

      if (input.skillGroupIds && input.skillGroupIds.length > 0) {
        await db.insert(memberSkillGroups).values(
          input.skillGroupIds.map(sgId => ({
            memberId: newMember.id,
            skillGroupId: sgId,
          }))
        );
      }

      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Staff",
        actionType: "create",
        entityType: "Member",
        entityId: String(newMember.id),
        notes: `Created member ${memberNumber}`,
      });
      return { success: true, memberId: newMember.id, memberNumber };
    }),

  // NOTE: updateMember exists in both sources. The portalProcedure version
  // writes an audit log entry; we keep that one.
  updateMember: portalProcedure
    .input(
      z.object({
        id: z.number(),
        skillGroupIds: z.array(z.number()).optional(),
        active: z.boolean().optional(),
        notes: z.string().optional(),
        renewalDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getPortalDb();
      const { id, skillGroupIds, ...updates } = input;
      const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      await db.update(members).set(filtered as any).where(eq(members.id, id));

      if (skillGroupIds) {
        await db.delete(memberSkillGroups).where(eq(memberSkillGroups.memberId, id));
        if (skillGroupIds.length > 0) {
          await db.insert(memberSkillGroups).values(
            skillGroupIds.map(sgId => ({
              memberId: id,
              skillGroupId: sgId,
            }))
          );
        }
      }

      await logAudit({
        actingUserId: ctx.user.id,
        actingUserName: ctx.user.email ?? "Staff",
        actionType: "update",
        entityType: "Member",
        entityId: String(id),
      });
      return { success: true };
    }),

  // Admin-only preview helper (from server/routers.ts → membershipRouter)
  // Creates a preview member if one doesn't exist, allowing admins to see the portal as different skill groups
  ensureMemberForPreview: adminProcedure.mutation(async ({ ctx }) => {
    const db = getPortalDb();
    const existing = await db
      .select()
      .from(members)
      .where(eq(members.userId, ctx.user.id))
      .limit(1);

    if (existing.length > 0) {
      return { member: existing[0], created: false };
    }

    const year = new Date().getFullYear();
    const memberNumber = `RL-${year}-PREVIEW`;
    const [newMember] = await db.insert(members).values({
      userId: ctx.user.id,
      memberNumber,
      active: true,
      joinDate: new Date().toISOString().split("T")[0],
    }).returning();

    return { member: newMember, created: true };
  }),

  // List available skill groups for preview dropdown
  listSkillGroupsForPreview: adminProcedure.query(async () => {
    const db = getPortalDb();
    return db.select({
      id: skillGroups.id,
      name: skillGroups.name,
      slug: skillGroups.slug,
    })
      .from(skillGroups)
      .where(eq(skillGroups.active, true))
      .orderBy(skillGroups.sortOrder);
  }),

  // Assign skill groups to preview member
  setPreviewMemberSkillGroups: adminProcedure
    .input(z.object({ skillGroupIds: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = getPortalDb();
      const member = await db
        .select()
        .from(members)
        .where(eq(members.userId, ctx.user.id))
        .limit(1);

      if (!member.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Preview member not found" });
      }

      const memberId = member[0].id;
      await db.delete(memberSkillGroups).where(eq(memberSkillGroups.memberId, memberId));

      if (input.skillGroupIds.length > 0) {
        await db.insert(memberSkillGroups).values(
          input.skillGroupIds.map(sgId => ({
            memberId,
            skillGroupId: sgId,
          }))
        );
      }

      return { success: true };
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

  stats: portalProcedure
    .input(z.object({ active: z.boolean().optional() }))
    .query(async ({ input }) => {
      const db = getPortalDb();
      const today = new Date().toISOString().split("T")[0];

      // Build base filter conditions from input
      const baseConditions = [];
      if (input.active !== undefined) baseConditions.push(eq(members.active, input.active));
      const baseWhere = baseConditions.length > 0 ? and(...baseConditions) : undefined;

      const [[total], [active], [inactive], [pendingRenewal]] = await Promise.all([
        // Total matching base filters
        db.select({ count: sql<number>`count(*)` }).from(members).where(baseWhere),
        // Active + base filters
        db.select({ count: sql<number>`count(*)` }).from(members)
          .where(baseWhere ? and(baseWhere, eq(members.active, true)) : eq(members.active, true)),
        // Inactive + base filters
        db.select({ count: sql<number>`count(*)` }).from(members)
          .where(baseWhere ? and(baseWhere, eq(members.active, false)) : eq(members.active, false)),
        // Pending renewal + base filters
        db.select({ count: sql<number>`count(*)` }).from(members)
          .where(baseWhere
            ? and(
                baseWhere,
                eq(members.active, true),
                sql`${members.renewalDate} IS NOT NULL`,
                sql`${members.renewalDate} <= (${today}::date + INTERVAL '30 days')`,
              )
            : and(
                eq(members.active, true),
                sql`${members.renewalDate} IS NOT NULL`,
                sql`${members.renewalDate} <= (${today}::date + INTERVAL '30 days')`,
              )
          ),
      ]);
      return {
        total: total.count,
        active: active.count,
        inactive: inactive.count,
        pendingRenewal: pendingRenewal.count,
        expired: inactive.count,
      };
    }),

  // Filterable member list with joined user data and pagination
  members: portalProcedure
    .input(z.object({ active: z.boolean().optional(), limit: z.number().int().min(1).max(100).default(25), cursor: z.number().int().optional() }))
    .query(async ({ input }) => {
      const db = getPortalDb();
      const limit = input.limit;
      const conditions = [];
      if (input.active !== undefined) conditions.push(eq(members.active, input.active));
      if (input.cursor !== undefined) conditions.push(lt(members.id, input.cursor));
      const query =
        conditions.length > 0
          ? db
              .select({
                member: {
                  id: members.id,
                  userId: members.userId,
                  memberNumber: members.memberNumber,
                  joinDate: members.joinDate,
                  renewalDate: members.renewalDate,
                  active: members.active,
                  notes: members.notes,
                  createdAt: members.createdAt,
                  updatedAt: members.updatedAt,
                },
                user: {
                  id: users.id,
                  email: users.email,
                },
                skillGroupNames: sql<string>`
                  COALESCE(string_agg(${skillGroups.name}, ', ' ORDER BY ${skillGroups.sortOrder}), '')
                `,
              })
              .from(members)
              .leftJoin(users, eq(members.userId, users.id))
              .leftJoin(memberSkillGroups, eq(members.id, memberSkillGroups.memberId))
              .leftJoin(skillGroups, eq(memberSkillGroups.skillGroupId, skillGroups.id))
              .where(and(...conditions))
              .groupBy(members.id, users.id)
          : db
              .select({
                member: {
                  id: members.id,
                  userId: members.userId,
                  memberNumber: members.memberNumber,
                  joinDate: members.joinDate,
                  renewalDate: members.renewalDate,
                  active: members.active,
                  notes: members.notes,
                  createdAt: members.createdAt,
                  updatedAt: members.updatedAt,
                },
                user: {
                  id: users.id,
                  email: users.email,
                },
                skillGroupNames: sql<string>`
                  COALESCE(string_agg(${skillGroups.name}, ', ' ORDER BY ${skillGroups.sortOrder}), '')
                `,
              })
              .from(members)
              .leftJoin(users, eq(members.userId, users.id))
              .leftJoin(memberSkillGroups, eq(members.id, memberSkillGroups.memberId))
              .leftJoin(skillGroups, eq(memberSkillGroups.skillGroupId, skillGroups.id))
              .groupBy(members.id, users.id);
      const rows = await query.orderBy(desc(members.id)).limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.member.id ?? null) : null;
      return { items, nextCursor };
    }),

  // Search users by name or email (for the Add Member form in the portal)
  searchUsers: portalProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getPortalDb();
      const q = `%${input.query}%`;
      return db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(like(users.email, q))
        .limit(20);
    }),

  // Get skill groups for members UI (excluding Employee/Admin which are staff-only)
  memberSkillGroups: portalProcedure.query(async () => {
    const db = getPortalDb();
    return db.select({
      id: skillGroups.id,
      name: skillGroups.name,
      slug: skillGroups.slug,
    })
      .from(skillGroups)
      .where(and(
        eq(skillGroups.active, true),
        or(
          eq(skillGroups.slug, "designated"),
          eq(skillGroups.slug, "silver"),
          eq(skillGroups.slug, "social")
        )
      ))
      .orderBy(skillGroups.sortOrder);
  }),

  // Get skill group assignments for a specific member
  memberAssignments: portalProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      const db = getPortalDb();
      const results = await db.select({
        skillGroupId: memberSkillGroups.skillGroupId,
      })
        .from(memberSkillGroups)
        .where(eq(memberSkillGroups.memberId, input.memberId));
      return results.map(r => r.skillGroupId);
    }),
});
