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
} from "../db/schema";
import { ENV } from "./env";

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

// ─── CMS: Amenities ───────────────────────────────────────────────────────────

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

// ─── CMS: Lodging Units ───────────────────────────────────────────────────────

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
  await db.insert(cmsLodgingUnits).values(data).onDuplicateKeyUpdate({ set: data });
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

// ─── CMS: Event Spaces ────────────────────────────────────────────────────────

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
  await db.insert(cmsEventSpaces).values(data).onDuplicateKeyUpdate({ set: data });
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

// ─── CMS: Packages ────────────────────────────────────────────────────────────

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

// ─── CMS: Galleries ───────────────────────────────────────────────────────────

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

// ─── CMS: Testimonials ────────────────────────────────────────────────────────

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

// ─── CMS: FAQs ────────────────────────────────────────────────────────────────

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

// ─── CMS: Announcements ───────────────────────────────────────────────────────

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

// ─── CMS: Member Content ──────────────────────────────────────────────────────

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

// ─── CMS: Singletons ──────────────────────────────────────────────────────────

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
  await db.insert(cmsSingletons).values(data).onDuplicateKeyUpdate({ set: { label: data.label, data: data.data, status: data.status } });
}
