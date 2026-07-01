import { eq, desc, and, inArray } from "drizzle-orm";
import { getPortalDb } from "@core/server/db";
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
  cmsMemberContent,
  cmsSingletons,
  InsertCmsLodgingUnit,
  InsertCmsEventSpace,
  InsertCmsTestimonial,
  InsertCmsFaq,
  InsertCmsAnnouncement,
  InsertCmsSingleton,
  InsertCmsMemberContent,
} from '@features/cms/schema';

const getDb = getPortalDb;

// ─── CMS: Amenities ───────────────────────────────────────────────────────────

export async function getCmsAmenities() {
  const db = getDb();
  return db.select().from(cmsAmenities).where(eq(cmsAmenities.active, true)).orderBy(cmsAmenities.sortOrder);
}

// ─── CMS: Lodging Units ───────────────────────────────────────────────────────

export async function getCmsLodgingUnits(forWeddings?: boolean, forMembers?: boolean) {
  const db = getDb();
  let q = db.select().from(cmsLodgingUnits).where(eq(cmsLodgingUnits.status, "published")).$dynamic();
  if (forWeddings) q = q.where(and(eq(cmsLodgingUnits.status, "published"), eq(cmsLodgingUnits.availableForWeddings, true)));
  if (forMembers) q = q.where(and(eq(cmsLodgingUnits.status, "published"), eq(cmsLodgingUnits.availableForMembers, true)));
  return q.orderBy(cmsLodgingUnits.sortOrder);
}

export async function getCmsLodgingUnitBySlug(slug: string) {
  const db = getDb();
  const result = await db.select().from(cmsLodgingUnits).where(and(eq(cmsLodgingUnits.slug, slug), eq(cmsLodgingUnits.status, "published"))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertCmsLodgingUnit(data: InsertCmsLodgingUnit) {
  const db = getDb();
  await db.insert(cmsLodgingUnits).values(data).onConflictDoUpdate({ target: cmsLodgingUnits.slug, set: data });
}

export async function updateCmsLodgingUnit(id: number, data: Partial<InsertCmsLodgingUnit>) {
  const db = getDb();
  await db.update(cmsLodgingUnits).set(data).where(eq(cmsLodgingUnits.id, id));
}

export async function deleteCmsLodgingUnit(id: number) {
  const db = getDb();
  await db.delete(cmsLodgingUnits).where(eq(cmsLodgingUnits.id, id));
}

// ─── CMS: Event Spaces ────────────────────────────────────────────────────────

export async function getCmsEventSpaces(division?: "weddings" | "corporate" | "both") {
  const db = getDb();
  if (division) {
    return db.select().from(cmsEventSpaces)
      .where(and(eq(cmsEventSpaces.status, "published"), eq(cmsEventSpaces.division, division)))
      .orderBy(cmsEventSpaces.sortOrder);
  }
  return db.select().from(cmsEventSpaces).where(eq(cmsEventSpaces.status, "published")).orderBy(cmsEventSpaces.sortOrder);
}

export async function getCmsEventSpaceBySlug(slug: string) {
  const db = getDb();
  const result = await db.select().from(cmsEventSpaces).where(and(eq(cmsEventSpaces.slug, slug), eq(cmsEventSpaces.status, "published"))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertCmsEventSpace(data: InsertCmsEventSpace) {
  const db = getDb();
  await db.insert(cmsEventSpaces).values(data).onConflictDoUpdate({ target: cmsEventSpaces.slug, set: data });
}

export async function updateCmsEventSpace(id: number, data: Partial<InsertCmsEventSpace>) {
  const db = getDb();
  await db.update(cmsEventSpaces).set(data).where(eq(cmsEventSpaces.id, id));
}

export async function deleteCmsEventSpace(id: number) {
  const db = getDb();
  await db.delete(cmsEventSpaces).where(eq(cmsEventSpaces.id, id));
}

// ─── CMS: Packages ────────────────────────────────────────────────────────────

export async function getCmsPackages(division?: "weddings" | "membership" | "corporate") {
  const db = getDb();
  if (division) {
    return db.select().from(cmsPackages)
      .where(and(eq(cmsPackages.status, "published"), eq(cmsPackages.division, division)))
      .orderBy(cmsPackages.sortOrder);
  }
  return db.select().from(cmsPackages).where(eq(cmsPackages.status, "published")).orderBy(cmsPackages.sortOrder);
}

// ─── CMS: Galleries ───────────────────────────────────────────────────────────

export async function getCmsGalleries() {
  const db = getDb();
  return db.select().from(cmsGalleries).where(eq(cmsGalleries.status, "published")).orderBy(cmsGalleries.sortOrder);
}

export async function getCmsGalleryWithImages(slug: string) {
  const db = getDb();
  const galleryResult = await db.select().from(cmsGalleries).where(eq(cmsGalleries.slug, slug)).limit(1);
  if (galleryResult.length === 0) return undefined;
  const gallery = galleryResult[0];
  const images = await db.select().from(cmsGalleryImages).where(eq(cmsGalleryImages.galleryId, gallery.id)).orderBy(cmsGalleryImages.sortOrder);
  return { ...gallery, images };
}

export async function getAllGalleriesWithImages() {
  const db = getDb();
  const galleries = await db.select().from(cmsGalleries).where(eq(cmsGalleries.status, "published")).orderBy(cmsGalleries.sortOrder);
  if (galleries.length === 0) return [];
  // Fetch every gallery's images in a single query, then group in memory
  // (previously ran one query per gallery — an N+1 that scaled with gallery count).
  const galleryIds = galleries.map((g) => g.id);
  const allImages = await db.select().from(cmsGalleryImages)
    .where(inArray(cmsGalleryImages.galleryId, galleryIds))
    .orderBy(cmsGalleryImages.sortOrder);
  const imagesByGallery = new Map<number, typeof allImages>();
  for (const img of allImages) {
    const list = imagesByGallery.get(img.galleryId) ?? [];
    list.push(img);
    imagesByGallery.set(img.galleryId, list);
  }
  return galleries.map((gallery) => ({ ...gallery, images: imagesByGallery.get(gallery.id) ?? [] }));
}

// ─── CMS: Testimonials ────────────────────────────────────────────────────────

export async function getCmsTestimonials(division?: "weddings" | "membership" | "corporate" | "general", featuredOnly?: boolean) {
  const db = getDb();
  const conditions = [eq(cmsTestimonials.status, "published")];
  if (division) conditions.push(eq(cmsTestimonials.division, division));
  if (featuredOnly) conditions.push(eq(cmsTestimonials.featured, true));
  return db.select().from(cmsTestimonials).where(and(...conditions)).orderBy(cmsTestimonials.sortOrder);
}

export async function upsertCmsTestimonial(data: InsertCmsTestimonial) {
  const db = getDb();
  await db.insert(cmsTestimonials).values(data);
}

export async function updateCmsTestimonial(id: number, data: Partial<InsertCmsTestimonial>) {
  const db = getDb();
  await db.update(cmsTestimonials).set(data).where(eq(cmsTestimonials.id, id));
}

export async function deleteCmsTestimonial(id: number) {
  const db = getDb();
  await db.delete(cmsTestimonials).where(eq(cmsTestimonials.id, id));
}

// ─── CMS: FAQs ────────────────────────────────────────────────────────────────

export async function getCmsFaqs(division?: "weddings" | "membership" | "corporate" | "general") {
  const db = getDb();
  if (division) {
    return db.select().from(cmsFaqs)
      .where(and(eq(cmsFaqs.status, "published"), eq(cmsFaqs.division, division)))
      .orderBy(cmsFaqs.sortOrder);
  }
  return db.select().from(cmsFaqs).where(eq(cmsFaqs.status, "published")).orderBy(cmsFaqs.sortOrder);
}

export async function upsertCmsFaq(data: InsertCmsFaq) {
  const db = getDb();
  await db.insert(cmsFaqs).values(data);
}

export async function updateCmsFaq(id: number, data: Partial<InsertCmsFaq>) {
  const db = getDb();
  await db.update(cmsFaqs).set(data).where(eq(cmsFaqs.id, id));
}

export async function deleteCmsFaq(id: number) {
  const db = getDb();
  await db.delete(cmsFaqs).where(eq(cmsFaqs.id, id));
}

// ─── CMS: Announcements ───────────────────────────────────────────────────────

export async function getCmsAnnouncements(audience?: "all" | "members" | "public") {
  const db = getDb();
  if (audience) {
    return db.select().from(cmsAnnouncements)
      .where(and(eq(cmsAnnouncements.status, "published"), eq(cmsAnnouncements.audience, audience)))
      .orderBy(desc(cmsAnnouncements.createdAt));
  }
  return db.select().from(cmsAnnouncements).where(eq(cmsAnnouncements.status, "published")).orderBy(desc(cmsAnnouncements.createdAt));
}

export async function upsertCmsAnnouncement(data: InsertCmsAnnouncement) {
  const db = getDb();
  await db.insert(cmsAnnouncements).values(data);
}

export async function updateCmsAnnouncement(id: number, data: Partial<InsertCmsAnnouncement>) {
  const db = getDb();
  await db.update(cmsAnnouncements).set(data).where(eq(cmsAnnouncements.id, id));
}

export async function deleteCmsAnnouncement(id: number) {
  const db = getDb();
  await db.delete(cmsAnnouncements).where(eq(cmsAnnouncements.id, id));
}

// ─── CMS: Member Content ──────────────────────────────────────────────────────

export async function getCmsMemberContent(contentType?: "season_date" | "hunt_report" | "fish_report" | "member_news" | "policy_update") {
  const db = getDb();
  if (contentType) {
    return db.select().from(cmsMemberContent)
      .where(and(eq(cmsMemberContent.status, "published"), eq(cmsMemberContent.contentType, contentType)))
      .orderBy(desc(cmsMemberContent.publishedAt));
  }
  return db.select().from(cmsMemberContent).where(eq(cmsMemberContent.status, "published")).orderBy(desc(cmsMemberContent.publishedAt));
}

export async function upsertCmsMemberContent(data: InsertCmsMemberContent) {
  const db = getDb();
  await db.insert(cmsMemberContent).values(data);
}

export async function updateCmsMemberContent(id: number, data: Partial<InsertCmsMemberContent>) {
  const db = getDb();
  await db.update(cmsMemberContent).set(data).where(eq(cmsMemberContent.id, id));
}

export async function deleteCmsMemberContent(id: number) {
  const db = getDb();
  await db.delete(cmsMemberContent).where(eq(cmsMemberContent.id, id));
}

// ─── CMS: Singletons ──────────────────────────────────────────────────────────

export async function getCmsSingleton(key: string) {
  const db = getDb();
  const result = await db.select().from(cmsSingletons).where(eq(cmsSingletons.key, key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllCmsSingletons() {
  const db = getDb();
  return db.select().from(cmsSingletons).orderBy(cmsSingletons.key);
}

export async function upsertCmsSingleton(data: InsertCmsSingleton) {
  const db = getDb();
  await db.insert(cmsSingletons).values(data).onConflictDoUpdate({ target: cmsSingletons.key, set: { label: data.label, data: data.data, status: data.status } });
}
