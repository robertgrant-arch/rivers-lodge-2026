// Membership-related DAL helpers extracted from features/_core/server/db.ts
// TODO(membership-extraction): These functions were copied from features/_core/server/db.ts.
// Remove the originals from db.ts once all callers are migrated to import from here.

import { eq, desc } from "drizzle-orm";
import {
  membershipApplications,
  InsertMembershipApplication,
  members,
  InsertMember,
} from '@core/db/schema';
import { getDb } from "../../_core/server/db";

// ─── Membership Applications ──────────────────────────────────────────────────

export async function createMembershipApplication(data: InsertMembershipApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(membershipApplications).values(data);
}

export async function getAllMembershipApplications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(membershipApplications).orderBy(desc(membershipApplications.createdAt));
}

export async function updateApplicationStatus(id: number, status: "pending" | "approved" | "declined") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(membershipApplications).set({ status }).where(eq(membershipApplications.id, id));
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function getAllMembers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: members.id,
    userId: members.userId,
    memberNumber: members.memberNumber,
    tier: members.tier,
    joinDate: members.joinDate,
    renewalDate: members.renewalDate,
    active: members.active,
    notes: members.notes,
    createdAt: members.createdAt,
    updatedAt: members.updatedAt,
  }).from(members).orderBy(desc(members.createdAt));
}

export async function getMemberByUserId(userId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    id: members.id,
    userId: members.userId,
    memberNumber: members.memberNumber,
    tier: members.tier,
    joinDate: members.joinDate,
    renewalDate: members.renewalDate,
    active: members.active,
    notes: members.notes,
    createdAt: members.createdAt,
    updatedAt: members.updatedAt,
  }).from(members).where(eq(members.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMember(data: InsertMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(members).values(data);
}

export async function updateMember(id: number, data: Partial<InsertMember>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(members).set(data).where(eq(members.id, id));
}
