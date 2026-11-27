/**
 * Other Groups — ops router (trpc.otherGroups.*)
 * ==============================================
 * Modelled on Hunting Groups (trpc.huntingGroups.*). Admin only, like every
 * other /ops procedure: member logins carry the "employee" role, so that role
 * is not enough (see features/admin/server/router.ts portalProcedure).
 *
 * Every write is recorded in the Ops audit log as entityType
 * "OtherGroupBooking".
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import { protectedProcedure, router } from "@core/server/trpc";
import { getPortalDb } from "@core/server/db";
import { huntingProperties } from "@core/db/property-booking-schema";
import { logPortalAudit } from "@features/portal/server/public";
import { members } from "@features/membership/public";
import { users } from "@features/auth/server/public";
import { otherGroupBookings } from "../schema";
import { OTHER_GROUP_EVENT_TYPES, OTHER_GROUP_STATUSES } from "../types";
import { createOtherGroupInput, toOtherGroupValues, updateOtherGroupInput } from "./validation";

export const OTHER_GROUP_AUDIT_ENTITY = "OtherGroupBooking";

type Db = ReturnType<typeof getPortalDb>;
let dbFactory: () => Db = getPortalDb;
/** Tests only: swap the database. */
export function __setOtherGroupsDb(f: (() => Db) | null) {
  dbFactory = f ?? getPortalDb;
}
const getDb = () => dbFactory();

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const actor = (ctx: { user: { id: string; email?: string | null } }) => ({
  actingUserId: ctx.user.id,
  actingUserName: ctx.user.email ?? "Staff",
});

/** Comparable form of a column value (dates/decimals come back as strings or Dates). */
function comparable(v: unknown): string {
  if (v == null || v === "") return "null";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return JSON.stringify([...v].map(String).sort());
  if (typeof v === "number") return String(v);
  return String(v);
}

/** Keys of `next` whose value differs from the stored row. */
export function changedFields(before: Record<string, unknown>, next: Record<string, unknown>): string[] {
  return Object.keys(next).filter((k) => {
    const a = comparable(before[k]);
    const b = comparable(next[k]);
    // Money: "4500" vs "4500.00"
    if (a !== "null" && b !== "null" && !Number.isNaN(Number(a)) && !Number.isNaN(Number(b)) && /^[\d.]+$/.test(a) && /^[\d.]+$/.test(b)) {
      return Number(a) !== Number(b);
    }
    return a !== b;
  });
}

/** portal_audit_log.fieldChanged is varchar(100). */
export function auditFieldList(keys: string[]): string {
  const s = keys.join(",");
  return s.length <= 100 ? s : `${s.slice(0, 97)}...`;
}

async function loadOne(db: Db, id: number) {
  const [row] = await db.select().from(otherGroupBookings).where(eq(otherGroupBookings.id, id)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Other group booking not found" });
  return row;
}

export const otherGroupsRouter = router({
  list: adminProcedure
    .input(z.object({
      status: z.enum(OTHER_GROUP_STATUSES).optional(),
      eventType: z.enum(OTHER_GROUP_EVENT_TYPES).optional(),
      search: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.number().int().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 25;
      const conditions = [];
      if (input?.status) conditions.push(eq(otherGroupBookings.status, input.status));
      if (input?.eventType) conditions.push(eq(otherGroupBookings.eventType, input.eventType));
      const q = input?.search?.trim();
      if (q) {
        const term = `%${q}%`;
        conditions.push(or(
          ilike(otherGroupBookings.groupName, term),
          ilike(otherGroupBookings.contactName, term),
          ilike(otherGroupBookings.contactEmail, term),
        ));
      }
      if (input?.cursor !== undefined) conditions.push(lt(otherGroupBookings.id, input.cursor));
      const rows = await db.select().from(otherGroupBookings)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(otherGroupBookings.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;
      return { items, nextCursor };
    }),

  /** Bookings per status (for the status tiles — not limited to the loaded page). */
  counts: adminProcedure.query(async () => {
    const db = getDb();
    const rows = await db.select({ status: otherGroupBookings.status, count: sql<number>`count(*)::int` })
      .from(otherGroupBookings).groupBy(otherGroupBookings.status);
    const out = Object.fromEntries(OTHER_GROUP_STATUSES.map((s) => [s, 0])) as Record<typeof OTHER_GROUP_STATUSES[number], number>;
    for (const r of rows) out[r.status] = Number(r.count);
    return out;
  }),

  get: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => loadOne(getDb(), input.id)),

  /** Choices for the booking dialog: properties and members (hosting member). */
  options: adminProcedure.query(async () => {
    const db = getDb();
    const [properties, memberRows] = await Promise.all([
      db.select({ id: huntingProperties.id, name: huntingProperties.name })
        .from(huntingProperties).where(eq(huntingProperties.active, true))
        .orderBy(asc(huntingProperties.sortOrder), asc(huntingProperties.name)),
      db.select({ id: members.id, memberNumber: members.memberNumber, email: users.email })
        .from(members).leftJoin(users, eq(users.id, members.userId))
        .where(eq(members.active, true))
        .orderBy(asc(members.memberNumber)),
    ]);
    return {
      properties,
      members: memberRows.map((m) => ({
        id: m.id,
        label: [m.memberNumber ? `#${m.memberNumber}` : null, m.email].filter(Boolean).join(" · ") || `Member ${m.id}`,
      })),
    };
  }),

  create: adminProcedure
    .input(createOtherGroupInput)
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const values = toOtherGroupValues(input);
      const [row] = await db.insert(otherGroupBookings).values({
        ...values,
        groupName: input.groupName.trim(),
        contactName: input.contactName.trim(),
        contactEmail: input.contactEmail.trim(),
      }).returning({ id: otherGroupBookings.id });
      await logPortalAudit(db, { ...actor(ctx), actionType: "create", entityType: OTHER_GROUP_AUDIT_ENTITY, entityId: String(row.id) });
      return { id: row.id };
    }),

  update: adminProcedure
    .input(updateOtherGroupInput)
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...changes } = input;
      const before = await loadOne(db, id);
      const values = toOtherGroupValues(changes);
      const arrival = "arrivalDate" in values ? values.arrivalDate : before.arrivalDate;
      const departure = "departureDate" in values ? values.departureDate : before.departureDate;
      if (arrival && departure && departure < arrival) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Departure can't be before arrival" });
      }
      // The edit dialog sends every field; only write and audit what changed.
      const changed = changedFields(before, values);
      if (changed.length === 0) return { success: true };
      const patch = Object.fromEntries(changed.map((k) => [k, (values as any)[k]]));
      await db.update(otherGroupBookings).set(patch).where(eq(otherGroupBookings.id, id));
      const statusChanged = changed.includes("status");
      await logPortalAudit(db, {
        ...actor(ctx),
        actionType: statusChanged ? "status_change" : "update",
        entityType: OTHER_GROUP_AUDIT_ENTITY,
        entityId: String(id),
        fieldChanged: auditFieldList(changed),
        ...(statusChanged ? { oldValue: before.status, newValue: values.status } : {}),
      });
      return { success: true };
    }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.number().int().positive(), status: z.enum(OTHER_GROUP_STATUSES) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const before = await loadOne(db, input.id);
      await db.update(otherGroupBookings).set({ status: input.status }).where(eq(otherGroupBookings.id, input.id));
      await logPortalAudit(db, {
        ...actor(ctx), actionType: "status_change", entityType: OTHER_GROUP_AUDIT_ENTITY,
        entityId: String(input.id), oldValue: before.status, newValue: input.status,
      });
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const before = await loadOne(db, input.id);
      await db.delete(otherGroupBookings).where(eq(otherGroupBookings.id, input.id));
      await logPortalAudit(db, {
        ...actor(ctx), actionType: "delete", entityType: OTHER_GROUP_AUDIT_ENTITY,
        entityId: String(input.id), oldValue: before.groupName,
      });
      return { success: true };
    }),
});
