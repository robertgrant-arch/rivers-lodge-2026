import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  inquiries,
  InsertInquiry,
  membershipApplications,
  InsertMembershipApplication,
  members,
  InsertMember,
  bookings,
  InsertBooking,
  waivers,
  InsertWaiver,
  seasonalUpdates,
  InsertSeasonalUpdate,
  messages,
  InsertMessage,
  blockedDates,
  InsertBlockedDate,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ─── Inquiries ────────────────────────────────────────────────────────────────

export async function createInquiry(data: InsertInquiry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(inquiries).values(data);
}

export async function getAllInquiries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
}

export async function updateInquiryStatus(id: number, status: "new" | "contacted" | "booked" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inquiries).set({ status }).where(eq(inquiries.id, id));
}

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
  return db.select().from(members).orderBy(desc(members.createdAt));
}

export async function getMemberByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(members).where(eq(members.userId, userId)).limit(1);
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

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getAllBookings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).orderBy(desc(bookings.createdAt));
}

export async function createBooking(data: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(bookings).values(data);
}

export async function updateBooking(id: number, data: Partial<InsertBooking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookings).set(data).where(eq(bookings.id, id));
}

export async function deleteBooking(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bookings).where(eq(bookings.id, id));
}

// ─── Waivers ──────────────────────────────────────────────────────────────────

export async function getAllWaivers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(waivers).orderBy(desc(waivers.signedAt));
}

export async function createWaiver(data: InsertWaiver) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(waivers).values(data);
}

// ─── Seasonal Updates ─────────────────────────────────────────────────────────

export async function getAllSeasonalUpdates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(seasonalUpdates).orderBy(desc(seasonalUpdates.publishedAt));
}

export async function createSeasonalUpdate(data: InsertSeasonalUpdate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(seasonalUpdates).values(data);
}

export async function deleteSeasonalUpdate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(seasonalUpdates).where(eq(seasonalUpdates.id, id));
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessagesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages)
    .where(eq(messages.fromUserId, userId))
    .orderBy(desc(messages.createdAt));
}

export async function getAllMessages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).orderBy(desc(messages.createdAt));
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messages).values(data);
}

export async function markMessageRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(messages).set({ read: true }).where(eq(messages.id, id));
}

// ─── Blocked Dates ────────────────────────────────────────────────────────────

export async function getAllBlockedDates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blockedDates).orderBy(blockedDates.date);
}

export async function createBlockedDate(data: InsertBlockedDate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(blockedDates).values(data);
}

export async function deleteBlockedDate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blockedDates).where(eq(blockedDates.id, id));
}
