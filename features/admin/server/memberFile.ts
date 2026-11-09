// ─── Member File router (/ops/membership/:id) ─────────────────────────────────
// Staff-only extended member record: profile & contact, family & emergency,
// health & safety, preferences, membership & admin, notes.
//
// ACCESS: every procedure here requires an admin, or an "employee" user who has
// an ACTIVE row in the employees (staff) table. Member logins also carry the
// "employee" role (see migration 0023b), so the role alone is not enough — this
// is why the Member File does not use the generic portalProcedure.
//
// PRIVACY: Health & Safety fields and staff notes are only ever returned by
// memberFile.get to authorized staff. Audit-log entries record WHICH section
// changed, never the values.

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { protectedProcedure, router } from "../../../_core/server/trpc";
import { getPortalDb } from "@core/server/db";
import { storagePut, storageGetSignedUrl } from "@core/server/storage";
import { huntingProperties } from "@core/db/property-booking-schema";
import { users } from "@features/auth/server/public";
import {
  members,
  employees,
  memberProfiles,
  memberChildren,
  memberStaffNotes,
  socialParentOrganizations,
} from "@features/membership/public";
import { waivers } from "@features/waivers/public";
import { portalWaivers, portalAuditLog } from "../schema";
import { PHOTO_MAX_BYTES } from "../memberFileOptions";
import {
  assertMemberFileAccess,
  childInput,
  membershipInput,
  sniffImageType,
  text,
  updateSectionInput,
  type GateUser,
} from "./memberFile.validation";

// ─── Access gate ──────────────────────────────────────────────────────────────

async function isActiveEmployeeInDb(userId: string): Promise<boolean> {
  const db = getPortalDb();
  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.userId, userId), eq(employees.active, true)))
    .limit(1);
  return Boolean(row);
}

const memberFileProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  await assertMemberFileAccess(ctx.user as GateUser, isActiveEmployeeInDb);
  return next({ ctx });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTION_LABEL: Record<string, string> = {
  contact: "Profile & Contact",
  family: "Family & Emergency",
  health: "Health & Safety",
  preferences: "Preferences",
  admin: "Membership & Admin",
};

async function logMemberFileAudit(
  user: { id: string; email?: string | null },
  memberId: number,
  fieldChanged: string,
  actionType: "create" | "update" | "delete" = "update",
) {
  // Records which part of the file changed — never the values (health data must
  // not be copied into the general audit log).
  try {
    await getPortalDb().insert(portalAuditLog).values({
      actingUserId: user.id,
      actingUserName: user.email ?? "Staff",
      actionType,
      entityType: "MemberFile",
      entityId: String(memberId),
      fieldChanged,
    } as any);
  } catch (err) {
    console.error("[memberFile] audit log write failed:", err);
  }
}

async function assertMemberExists(memberId: number) {
  const [row] = await getPortalDb()
    .select({ id: members.id })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
}

async function upsertProfile(memberId: number, values: Record<string, unknown>, userId: string) {
  const db = getPortalDb();
  await db
    .insert(memberProfiles)
    .values({ memberId, ...values, updatedByUserId: userId } as any)
    .onConflictDoUpdate({
      target: memberProfiles.memberId,
      set: { ...values, updatedAt: new Date(), updatedByUserId: userId } as any,
    });
}

async function signedPhotoUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  try {
    return await storageGetSignedUrl(key);
  } catch (err) {
    console.error("[memberFile] could not sign photo URL:", err);
    return null;
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const memberFileRouter = router({
  /** Everything about one member, for the staff Member File page. */
  get: memberFileProcedure
    .input(z.object({ memberId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getPortalDb();

      const [row] = await db
        .select({
          member: {
            id: members.id,
            userId: members.userId,
            memberNumber: members.memberNumber,
            membershipType: members.membershipType,
            joinDate: members.joinDate,
            renewalDate: members.renewalDate,
            active: members.active,
            notes: members.notes,
            socialParentOrganizationId: members.socialParentOrganizationId,
            createdAt: members.createdAt,
          },
          email: users.email,
          organizationName: socialParentOrganizations.name,
        })
        .from(members)
        .leftJoin(users, eq(members.userId, users.id))
        .leftJoin(socialParentOrganizations, eq(members.socialParentOrganizationId, socialParentOrganizations.id))
        .where(eq(members.id, input.memberId))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });

      const [profileRow] = await db
        .select()
        .from(memberProfiles)
        .where(eq(memberProfiles.memberId, input.memberId))
        .limit(1);

      const [children, staffNotes, properties, staff] = await Promise.all([
        db.select().from(memberChildren)
          .where(eq(memberChildren.memberId, input.memberId))
          .orderBy(asc(memberChildren.sortOrder), asc(memberChildren.id)),
        db.select().from(memberStaffNotes)
          .where(eq(memberStaffNotes.memberId, input.memberId))
          .orderBy(desc(memberStaffNotes.createdAt), desc(memberStaffNotes.id))
          .limit(500),
        db.select({ id: huntingProperties.id, name: huntingProperties.name })
          .from(huntingProperties)
          .orderBy(asc(huntingProperties.name)),
        db.select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName, email: employees.email, active: employees.active })
          .from(employees)
          .orderBy(asc(employees.firstName), asc(employees.lastName)),
      ]);

      // Waivers: link existing records; never fail the whole page if a waiver
      // table is unavailable.
      let waiverRecords: { source: "portal" | "legacy"; id: number; title: string; status: string; signedAt: Date | null; signerName: string }[] = [];
      let waiversAvailable = true;
      try {
        const emailMatch = row.email ? row.email.toLowerCase() : null;
        const [portal, legacy] = await Promise.all([
          db.select({
            id: portalWaivers.id,
            title: portalWaivers.snapshotTitle,
            status: portalWaivers.status,
            signedAt: portalWaivers.signedAt,
            signerName: portalWaivers.signatoryName,
          }).from(portalWaivers).where(
            emailMatch
              ? or(eq(portalWaivers.linkedMemberId, input.memberId), ilike(portalWaivers.signatoryEmail, emailMatch))
              : eq(portalWaivers.linkedMemberId, input.memberId),
          ).orderBy(desc(portalWaivers.id)).limit(50),
          db.select({
            id: waivers.id,
            title: waivers.waiverType,
            signedAt: waivers.signedAt,
            signerName: waivers.signerName,
          }).from(waivers).where(
            emailMatch
              ? or(eq(waivers.userId, row.member.userId), ilike(waivers.signerEmail, emailMatch))
              : eq(waivers.userId, row.member.userId),
          ).orderBy(desc(waivers.id)).limit(50),
        ]);
        waiverRecords = [
          ...portal.map((w) => ({ source: "portal" as const, id: w.id, title: w.title ?? "Waiver", status: String(w.status), signedAt: w.signedAt, signerName: w.signerName })),
          ...legacy.map((w) => ({ source: "legacy" as const, id: w.id, title: `${w.title} waiver`, status: "signed", signedAt: w.signedAt, signerName: w.signerName })),
        ];
      } catch (err) {
        console.error("[memberFile] waiver lookup failed:", err);
        waiversAvailable = false;
      }

      const { photoKey, ...profile } = profileRow ?? ({} as Partial<typeof memberProfiles.$inferSelect>);
      return {
        member: row.member,
        email: row.email,
        organizationName: row.organizationName,
        profile: profileRow ? profile : null,
        photoUrl: await signedPhotoUrl(photoKey),
        children,
        staffNotes,
        waivers: { available: waiversAvailable, records: waiverRecords },
        options: {
          properties,
          staff: staff.map((s) => ({
            id: s.id,
            active: s.active,
            name: [s.firstName, s.lastName].filter(Boolean).join(" ") || s.email,
          })),
        },
      };
    }),

  /** Save one section of the profile (Edit → Save on that section). */
  updateSection: memberFileProcedure
    .input(updateSectionInput)
    .mutation(async ({ input, ctx }) => {
      await assertMemberExists(input.memberId);
      const db = getPortalDb();
      if (input.section === "preferences" && input.data.favoritePropertyId !== null) {
        const [p] = await db.select({ id: huntingProperties.id }).from(huntingProperties)
          .where(eq(huntingProperties.id, input.data.favoritePropertyId)).limit(1);
        if (!p) throw new TRPCError({ code: "BAD_REQUEST", message: "That property no longer exists" });
      }
      if (input.section === "admin" && input.data.assignedStaffEmployeeId !== null) {
        const [e] = await db.select({ id: employees.id }).from(employees)
          .where(eq(employees.id, input.data.assignedStaffEmployeeId)).limit(1);
        if (!e) throw new TRPCError({ code: "BAD_REQUEST", message: "That staff member no longer exists" });
      }
      await upsertProfile(input.memberId, input.data, ctx.user.id);
      await logMemberFileAudit(ctx.user, input.memberId, SECTION_LABEL[input.section]);
      return { success: true };
    }),

  /** Existing membership values (members table) — edited in place, not duplicated. */
  updateMembership: memberFileProcedure
    .input(membershipInput)
    .mutation(async ({ input, ctx }) => {
      await assertMemberExists(input.memberId);
      const { memberId, ...values } = input;
      await getPortalDb().update(members).set(values as any).where(eq(members.id, memberId));
      await logMemberFileAudit(ctx.user, memberId, "Membership values");
      return { success: true };
    }),

  /** General notes — the existing members.notes field. */
  updateGeneralNotes: memberFileProcedure
    .input(z.object({ memberId: z.number().int().positive(), notes: text(10000) }))
    .mutation(async ({ input, ctx }) => {
      await assertMemberExists(input.memberId);
      await getPortalDb().update(members).set({ notes: input.notes }).where(eq(members.id, input.memberId));
      await logMemberFileAudit(ctx.user, input.memberId, "General notes");
      return { success: true };
    }),

  /** Replace the member's children list (the section is edited as a whole). */
  saveChildren: memberFileProcedure
    .input(z.object({ memberId: z.number().int().positive(), children: z.array(childInput).max(20) }))
    .mutation(async ({ input, ctx }) => {
      await assertMemberExists(input.memberId);
      const db = getPortalDb();
      await db.transaction(async (tx) => {
        await tx.delete(memberChildren).where(eq(memberChildren.memberId, input.memberId));
        if (input.children.length) {
          await tx.insert(memberChildren).values(
            input.children.map((c, i) => ({ ...c, memberId: input.memberId, sortOrder: i })) as any,
          );
        }
      });
      await logMemberFileAudit(ctx.user, input.memberId, "Children");
      return { success: true };
    }),

  /** Append a timestamped staff note. Notes are never overwritten. */
  addStaffNote: memberFileProcedure
    .input(z.object({ memberId: z.number().int().positive(), body: z.string().trim().min(1, "Write a note first").max(5000) }))
    .mutation(async ({ input, ctx }) => {
      await assertMemberExists(input.memberId);
      const [note] = await getPortalDb().insert(memberStaffNotes).values({
        memberId: input.memberId,
        body: input.body,
        authorUserId: ctx.user.id,
        authorEmail: ctx.user.email ?? null,
      }).returning();
      await logMemberFileAudit(ctx.user, input.memberId, "Staff note", "create");
      return note;
    }),

  /** Upload or replace the member photo. Stored privately; served via signed URL. */
  uploadPhoto: memberFileProcedure
    .input(z.object({
      memberId: z.number().int().positive(),
      fileData: z.string().min(1).max(Math.ceil((PHOTO_MAX_BYTES * 4) / 3) + 16), // base64
    }))
    .mutation(async ({ input, ctx }) => {
      await assertMemberExists(input.memberId);
      const buffer = Buffer.from(input.fileData, "base64");
      if (buffer.length === 0 || buffer.length > PHOTO_MAX_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Photo must be smaller than 700 KB" });
      }
      const type = sniffImageType(buffer);
      if (!type) throw new TRPCError({ code: "BAD_REQUEST", message: "Photo must be a JPG, PNG or WebP image" });
      const ext = type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
      const { key } = await storagePut(`members/photos/${input.memberId}-${Date.now()}.${ext}`, buffer, type);
      await upsertProfile(input.memberId, { photoKey: key }, ctx.user.id);
      await logMemberFileAudit(ctx.user, input.memberId, "Photo");
      return { photoUrl: await signedPhotoUrl(key) };
    }),

  removePhoto: memberFileProcedure
    .input(z.object({ memberId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await assertMemberExists(input.memberId);
      await upsertProfile(input.memberId, { photoKey: null }, ctx.user.id);
      await logMemberFileAudit(ctx.user, input.memberId, "Photo", "delete");
      return { success: true };
    }),
});
