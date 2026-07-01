import { eq, desc, and, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  users,
  invites,
  sessions,
  InsertUser,
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
} from "../db/schema";

// Re-export table references consumed by feature routers
export { messages };
import { ENV } from "./env";

type DrizzleDb = ReturnType<typeof drizzle>;

let _pool: Pool | null = null;

function createDb(): Promise<DrizzleDb | null> {
  const url = process.env.DATABASE_URL ?? ENV.databaseUrl;
  if (!url) {
    console.warn("[Database] DATABASE_URL is not set — DB disabled.");
    return Promise.resolve(null);
  }
  try {
    const ssl = url.includes("render.com") || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined;
    _pool = new Pool({ connectionString: url, ssl });
    return Promise.resolve(drizzle(_pool) as unknown as DrizzleDb);
  } catch (error) {
    console.warn("[Database] Failed to create connection pool:", error);
    return Promise.resolve(null);
  }
}

let _dbPromise: Promise<DrizzleDb | null> | null = null;

export function getDb(): Promise<DrizzleDb | null> {
  if (!_dbPromise) _dbPromise = createDb();
  return _dbPromise;
}

// ─── Shared synchronous pool for portal/admin routers ─────────────────────────
// A single process-wide connection pool reused across every portal query.
// (Previously each router created a new Pool per query — a new TLS handshake and
// a leaked connection on every call, which exhausted Render's connection limit
// and made the admin portal slow. This memoizes one pool for all of them.)
let _portalDb: DrizzleDb | null = null;

export function getPortalDb(): DrizzleDb {
  if (_portalDb) return _portalDb;
  const url = process.env.DATABASE_URL ?? ENV.databaseUrl;
  if (!url) throw new Error("DATABASE_URL not set");
  const ssl = url.includes("render.com") || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined;
  _portalDb = drizzle(new Pool({ connectionString: url, ssl, max: 10 })) as unknown as DrizzleDb;
  return _portalDb;
}

export async function checkDbHealth(): Promise<boolean> {
  await getDb();
  if (!_pool) return false;
  try {
    await Promise.race([
      _pool.query("SELECT 1"),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB health check timed out")), 2000),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(data: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({ ...data, email: data.email.toLowerCase() });
}

export async function updateUser(id: string, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function createDbSession(userId: string, expiresAt: Date): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = crypto.randomUUID();
  await db.insert(sessions).values({ id, userId, expiresAt, createdAt: new Date() });
  return id;
}

export async function getDbSession(sessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const result = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteDbSession(sessionId: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function createInvite(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdBy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = crypto.randomUUID();
  await db.insert(invites).values({ id, ...data });
  return id;
}

export async function getInviteByTokenHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const result = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.tokenHash, tokenHash),
        gt(invites.expiresAt, now),
      ),
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function acceptInvite(inviteId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, inviteId));
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

export async function getMemberByUserId(userId: string) {
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

export async function getMessagesForUser(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages)
    .where(eq(messages.fromUserId, userId))
    .orderBy(desc(messages.createdAt));
}

export async function getAllMessages(archived = false) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages)
    .where(eq(messages.archived, archived))
    .orderBy(desc(messages.createdAt));
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
export async function archiveMessage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(messages).set({ archived: true }).where(eq(messages.id, id));
}
export async function unarchiveMessage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(messages).set({ archived: false }).where(eq(messages.id, id));
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

// ─── CMS ──────────────────────────────────────────────────────────────────────

import {
  cmsAmenities,
  cmsLodgingUnits,
  cmsEventSpaces,
  cmsPackages,
  cmsGalleries,
  cmsGalleryImages,
  cmsTestimonials,
  cmsFaqs,
  cmsAnnouncements,
  cmsContactRoutes,
  cmsMemberContent,
  cmsSingletons,
  InsertCmsLodgingUnit,
  InsertCmsEventSpace,
  InsertCmsTestimonial,
  InsertCmsFaq,
  InsertCmsAnnouncement,
  InsertCmsSingleton,
  InsertCmsMemberContent,
} from "../db/schema";

export async function getCmsAmenities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cmsAmenities).where(eq(cmsAmenities.active, true)).orderBy(cmsAmenities.sortOrder);
}

export async function getCmsLodgingUnits(forWeddings?: boolean, forMembers?: boolean) {
  const db = await getDb();
  if (!db) return [];
  let q = db.select().from(cmsLodgingUnits).where(eq(cmsLodgingUnits.status, "published")).$dynamic();
  if (forWeddings) q = q.where(and(eq(cmsLodgingUnits.status, "published"), eq(cmsLodgingUnits.availableForWeddings, true)));
  if (forMembers) q = q.where(and(eq(cmsLodgingUnits.status, "published"), eq(cmsLodgingUnits.availableForMembers, true)));
  return q.orderBy(cmsLodgingUnits.sortOrder);
}

export async function getCmsLodgingUnitBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cmsLodgingUnits).where(and(eq(cmsLodgingUnits.slug, slug), eq(cmsLodgingUnits.status, "published"))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertCmsLodgingUnit(data: InsertCmsLodgingUnit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cmsLodgingUnits).values(data).onConflictDoUpdate({ target: cmsLodgingUnits.slug, set: data });
}

export async function updateCmsLodgingUnit(id: number, data: Partial<InsertCmsLodgingUnit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cmsLodgingUnits).set(data).where(eq(cmsLodgingUnits.id, id));
}

export async function deleteCmsLodgingUnit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cmsLodgingUnits).where(eq(cmsLodgingUnits.id, id));
}

export async function getCmsEventSpaces(division?: "weddings" | "corporate" | "both") {
  const db = await getDb();
  if (!db) return [];
  if (division) {
    return db.select().from(cmsEventSpaces)
      .where(and(eq(cmsEventSpaces.status, "published"), eq(cmsEventSpaces.division, division)))
      .orderBy(cmsEventSpaces.sortOrder);
  }
  return db.select().from(cmsEventSpaces).where(eq(cmsEventSpaces.status, "published")).orderBy(cmsEventSpaces.sortOrder);
}

export async function getCmsEventSpaceBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cmsEventSpaces).where(and(eq(cmsEventSpaces.slug, slug), eq(cmsEventSpaces.status, "published"))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertCmsEventSpace(data: InsertCmsEventSpace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cmsEventSpaces).values(data).onConflictDoUpdate({ target: cmsEventSpaces.slug, set: data });
}

export async function updateCmsEventSpace(id: number, data: Partial<InsertCmsEventSpace>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cmsEventSpaces).set(data).where(eq(cmsEventSpaces.id, id));
}

export async function deleteCmsEventSpace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cmsEventSpaces).where(eq(cmsEventSpaces.id, id));
}

export async function getCmsPackages(division?: "weddings" | "membership" | "corporate") {
  const db = await getDb();
  if (!db) return [];
  if (division) {
    return db.select().from(cmsPackages)
      .where(and(eq(cmsPackages.status, "published"), eq(cmsPackages.division, division)))
      .orderBy(cmsPackages.sortOrder);
  }
  return db.select().from(cmsPackages).where(eq(cmsPackages.status, "published")).orderBy(cmsPackages.sortOrder);
}

export async function getCmsGalleries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cmsGalleries).where(eq(cmsGalleries.status, "published")).orderBy(cmsGalleries.sortOrder);
}

export async function getCmsGalleryWithImages(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const galleryResult = await db.select().from(cmsGalleries).where(eq(cmsGalleries.slug, slug)).limit(1);
  if (galleryResult.length === 0) return undefined;
  const gallery = galleryResult[0];
  const images = await db.select().from(cmsGalleryImages).where(eq(cmsGalleryImages.galleryId, gallery.id)).orderBy(cmsGalleryImages.sortOrder);
  return { ...gallery, images };
}

export async function getAllGalleriesWithImages() {
  const db = await getDb();
  if (!db) return [];
  const galleries = await db.select().from(cmsGalleries).where(eq(cmsGalleries.status, "published")).orderBy(cmsGalleries.sortOrder);
  const result = [];
  for (const gallery of galleries) {
    const images = await db.select().from(cmsGalleryImages).where(eq(cmsGalleryImages.galleryId, gallery.id)).orderBy(cmsGalleryImages.sortOrder);
    result.push({ ...gallery, images });
  }
  return result;
}

export async function getCmsTestimonials(division?: "weddings" | "membership" | "corporate" | "general", featuredOnly?: boolean) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(cmsTestimonials.status, "published")];
  if (division) conditions.push(eq(cmsTestimonials.division, division));
  if (featuredOnly) conditions.push(eq(cmsTestimonials.featured, true));
  return db.select().from(cmsTestimonials).where(and(...conditions)).orderBy(cmsTestimonials.sortOrder);
}

export async function upsertCmsTestimonial(data: InsertCmsTestimonial) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cmsTestimonials).values(data);
}

export async function updateCmsTestimonial(id: number, data: Partial<InsertCmsTestimonial>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cmsTestimonials).set(data).where(eq(cmsTestimonials.id, id));
}

export async function deleteCmsTestimonial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cmsTestimonials).where(eq(cmsTestimonials.id, id));
}

export async function getCmsFaqs(division?: "weddings" | "membership" | "corporate" | "general") {
  const db = await getDb();
  if (!db) return [];
  if (division) {
    return db.select().from(cmsFaqs)
      .where(and(eq(cmsFaqs.status, "published"), eq(cmsFaqs.division, division)))
      .orderBy(cmsFaqs.sortOrder);
  }
  return db.select().from(cmsFaqs).where(eq(cmsFaqs.status, "published")).orderBy(cmsFaqs.sortOrder);
}

export async function upsertCmsFaq(data: InsertCmsFaq) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cmsFaqs).values(data);
}

export async function updateCmsFaq(id: number, data: Partial<InsertCmsFaq>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cmsFaqs).set(data).where(eq(cmsFaqs.id, id));
}

export async function deleteCmsFaq(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cmsFaqs).where(eq(cmsFaqs.id, id));
}

export async function getCmsAnnouncements(audience?: "all" | "members" | "public") {
  const db = await getDb();
  if (!db) return [];
  if (audience) {
    return db.select().from(cmsAnnouncements)
      .where(and(eq(cmsAnnouncements.status, "published"), eq(cmsAnnouncements.audience, audience)))
      .orderBy(desc(cmsAnnouncements.createdAt));
  }
  return db.select().from(cmsAnnouncements).where(eq(cmsAnnouncements.status, "published")).orderBy(desc(cmsAnnouncements.createdAt));
}

export async function upsertCmsAnnouncement(data: InsertCmsAnnouncement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cmsAnnouncements).values(data);
}

export async function updateCmsAnnouncement(id: number, data: Partial<InsertCmsAnnouncement>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cmsAnnouncements).set(data).where(eq(cmsAnnouncements.id, id));
}

export async function deleteCmsAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cmsAnnouncements).where(eq(cmsAnnouncements.id, id));
}

export async function getCmsMemberContent(contentType?: "season_date" | "hunt_report" | "fish_report" | "member_news" | "policy_update") {
  const db = await getDb();
  if (!db) return [];
  if (contentType) {
    return db.select().from(cmsMemberContent)
      .where(and(eq(cmsMemberContent.status, "published"), eq(cmsMemberContent.contentType, contentType)))
      .orderBy(desc(cmsMemberContent.publishedAt));
  }
  return db.select().from(cmsMemberContent).where(eq(cmsMemberContent.status, "published")).orderBy(desc(cmsMemberContent.publishedAt));
}

export async function upsertCmsMemberContent(data: InsertCmsMemberContent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cmsMemberContent).values(data);
}

export async function updateCmsMemberContent(id: number, data: Partial<InsertCmsMemberContent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cmsMemberContent).set(data).where(eq(cmsMemberContent.id, id));
}

export async function deleteCmsMemberContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cmsMemberContent).where(eq(cmsMemberContent.id, id));
}

export async function getCmsSingleton(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cmsSingletons).where(eq(cmsSingletons.key, key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllCmsSingletons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cmsSingletons).orderBy(cmsSingletons.key);
}

export async function upsertCmsSingleton(data: InsertCmsSingleton) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cmsSingletons).values(data).onConflictDoUpdate({
    target: cmsSingletons.key,
    set: { label: data.label, data: data.data, status: data.status },
  });
}

