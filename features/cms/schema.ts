import {
  boolean,
  date,
  decimal,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const amenityCategoryEnum = pgEnum("amenity_category", ["lodging", "event", "outdoor", "general"]);
export const cmsStatusEnum = pgEnum("cms_status", ["draft", "published", "archived"]);
export const eventSpaceDivisionEnum = pgEnum("event_space_division", ["weddings", "corporate", "both"]);
export const indoorOutdoorEnum = pgEnum("indoor_outdoor", ["indoor", "outdoor", "both"]);
export const packageDivisionEnum = pgEnum("package_division", ["weddings", "corporate", "membership", "general"]);
export const galleryCategoryEnum = pgEnum("gallery_category", ["weddings", "venues", "lodging", "outdoors", "estate"]);
export const testimonialDivisionEnum = pgEnum("testimonial_division", ["weddings", "corporate", "membership", "general"]);
export const faqDivisionEnum = pgEnum("faq_division", ["weddings", "corporate", "membership", "general"]);
export const policyDivisionEnum = pgEnum("policy_division", ["weddings", "corporate", "membership", "general"]);
export const announcementTypeEnum = pgEnum("announcement_type", ["banner", "alert", "news"]);
export const announcementAudienceEnum = pgEnum("announcement_audience", ["public", "members", "all"]);
export const contactInquiryTypeEnum = pgEnum("contact_inquiry_type", ["wedding", "corporate", "tour", "general", "membership"]);
export const memberContentTypeEnum = pgEnum("member_content_type", ["season_date", "hunt_report", "fish_report", "member_news", "policy_update"]);
export const contentTierAccessEnum = pgEnum("content_tier_access", ["standard", "premier", "founding", "all"]);
export const singletonStatusEnum = pgEnum("singleton_status", ["draft", "published"]);

// ─── CMS Amenities ────────────────────────────────────────────────────────────

export const cmsAmenities = pgTable("cms_amenities", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 150 }).notNull(),
  icon: varchar("icon", { length: 100 }),
  category: amenityCategoryEnum("category").notNull().default("general"),
  sortOrder: integer("sortOrder").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CmsAmenity = typeof cmsAmenities.$inferSelect;
export type InsertCmsAmenity = typeof cmsAmenities.$inferInsert;

// ─── CMS Lodging Units ────────────────────────────────────────────────────────

export const cmsLodgingUnits = pgTable("cms_lodging_units", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  shortDescription: varchar("shortDescription", { length: 500 }),
  longDescription: text("longDescription"),
  squareFootage: integer("squareFootage"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  maxGuests: integer("maxGuests"),
  heroImage: text("heroImage"),
  galleryImages: json("galleryImages"),
  amenityIds: json("amenityIds"),
  features: json("features"),
  priceNote: varchar("priceNote", { length: 255 }),
  availableForWeddings: boolean("availableForWeddings").notNull().default(true),
  availableForMembers: boolean("availableForMembers").notNull().default(false),
  sortOrder: integer("sortOrder").notNull().default(0),
  status: cmsStatusEnum("status").notNull().default("draft"),
  seoTitle: varchar("seoTitle", { length: 70 }),
  seoDescription: varchar("seoDescription", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type CmsLodgingUnit = typeof cmsLodgingUnits.$inferSelect;
export type InsertCmsLodgingUnit = typeof cmsLodgingUnits.$inferInsert;

// ─── CMS Event Spaces ─────────────────────────────────────────────────────────

export const cmsEventSpaces = pgTable("cms_event_spaces", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  division: eventSpaceDivisionEnum("division").notNull().default("both"),
  shortDescription: varchar("shortDescription", { length: 500 }),
  longDescription: text("longDescription"),
  capacitySeated: integer("capacitySeated"),
  capacityReception: integer("capacityReception"),
  heroImage: text("heroImage"),
  galleryImages: json("galleryImages"),
  amenityIds: json("amenityIds"),
  features: json("features"),
  indoorOutdoor: indoorOutdoorEnum("indoorOutdoor").notNull().default("both"),
  sortOrder: integer("sortOrder").notNull().default(0),
  status: cmsStatusEnum("status").notNull().default("draft"),
  seoTitle: varchar("seoTitle", { length: 70 }),
  seoDescription: varchar("seoDescription", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type CmsEventSpace = typeof cmsEventSpaces.$inferSelect;
export type InsertCmsEventSpace = typeof cmsEventSpaces.$inferInsert;

// ─── CMS Packages ─────────────────────────────────────────────────────────────

export const cmsPackages = pgTable("cms_packages", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  division: packageDivisionEnum("division").notNull().default("general"),
  tagline: varchar("tagline", { length: 255 }),
  description: text("description"),
  includes: json("includes"),
  startingPrice: decimal("startingPrice", { precision: 10, scale: 2 }),
  priceNote: varchar("priceNote", { length: 255 }),
  heroImage: text("heroImage"),
  spaceIds: json("spaceIds"),
  lodgingIds: json("lodgingIds"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sortOrder").notNull().default(0),
  status: cmsStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type CmsPackage = typeof cmsPackages.$inferSelect;
export type InsertCmsPackage = typeof cmsPackages.$inferInsert;

// ─── CMS Galleries ────────────────────────────────────────────────────────────

export const cmsGalleries = pgTable("cms_galleries", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: galleryCategoryEnum("category").notNull(),
  description: varchar("description", { length: 500 }),
  coverImage: text("coverImage"),
  sortOrder: integer("sortOrder").notNull().default(0),
  status: cmsStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type CmsGallery = typeof cmsGalleries.$inferSelect;
export type InsertCmsGallery = typeof cmsGalleries.$inferInsert;

// ─── CMS Gallery Images ───────────────────────────────────────────────────────

export const cmsGalleryImages = pgTable("cms_gallery_images", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  galleryId: integer("galleryId").notNull(),
  url: text("url").notNull(),
  altText: varchar("altText", { length: 255 }),
  caption: varchar("caption", { length: 500 }),
  width: integer("width"),
  height: integer("height"),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CmsGalleryImage = typeof cmsGalleryImages.$inferSelect;
export type InsertCmsGalleryImage = typeof cmsGalleryImages.$inferInsert;

// ─── CMS Testimonials ─────────────────────────────────────────────────────────

export const cmsTestimonials = pgTable("cms_testimonials", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  authorName: varchar("authorName", { length: 255 }).notNull(),
  authorTitle: varchar("authorTitle", { length: 255 }),
  quote: text("quote").notNull(),
  rating: integer("rating").default(5),
  division: testimonialDivisionEnum("division").notNull().default("general"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sortOrder").notNull().default(0),
  status: cmsStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CmsTestimonial = typeof cmsTestimonials.$inferSelect;
export type InsertCmsTestimonial = typeof cmsTestimonials.$inferInsert;

// ─── CMS FAQs ─────────────────────────────────────────────────────────────────

export const cmsFaqs = pgTable("cms_faqs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  division: faqDivisionEnum("division").notNull().default("general"),
  sortOrder: integer("sortOrder").notNull().default(0),
  status: cmsStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type CmsFaq = typeof cmsFaqs.$inferSelect;
export type InsertCmsFaq = typeof cmsFaqs.$inferInsert;

// ─── CMS Policies ─────────────────────────────────────────────────────────────

export const cmsPolicies = pgTable("cms_policies", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  division: policyDivisionEnum("division").notNull().default("general"),
  version: varchar("version", { length: 50 }),
  effectiveDate: date("effectiveDate"),
  status: cmsStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type CmsPolicy = typeof cmsPolicies.$inferSelect;
export type InsertCmsPolicy = typeof cmsPolicies.$inferInsert;

// ─── CMS Announcements ────────────────────────────────────────────────────────

export const cmsAnnouncements = pgTable("cms_announcements", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  type: announcementTypeEnum("type").notNull().default("news"),
  audience: announcementAudienceEnum("audience").notNull().default("public"),
  ctaLabel: varchar("ctaLabel", { length: 100 }),
  ctaUrl: varchar("ctaUrl", { length: 500 }),
  expiresAt: timestamp("expiresAt"),
  status: cmsStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type CmsAnnouncement = typeof cmsAnnouncements.$inferSelect;
export type InsertCmsAnnouncement = typeof cmsAnnouncements.$inferInsert;

// ─── CMS Contact Routes ───────────────────────────────────────────────────────

export const cmsContactRoutes = pgTable("cms_contact_routes", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  inquiryType: contactInquiryTypeEnum("inquiryType").notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  routeToEmail: varchar("routeToEmail", { length: 320 }),
  autoReplySubject: varchar("autoReplySubject", { length: 255 }),
  autoReplyBody: text("autoReplyBody"),
  notifyOwner: boolean("notifyOwner").notNull().default(true),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type CmsContactRoute = typeof cmsContactRoutes.$inferSelect;
export type InsertCmsContactRoute = typeof cmsContactRoutes.$inferInsert;

// ─── CMS Member Content ───────────────────────────────────────────────────────

export const cmsMemberContent = pgTable("cms_member_content", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  contentType: memberContentTypeEnum("contentType").notNull(),
  body: text("body").notNull(),
  heroImage: text("heroImage"),
  season: varchar("season", { length: 100 }),
  species: varchar("species", { length: 100 }),
  startDate: date("startDate"),
  endDate: date("endDate"),
  tierAccess: contentTierAccessEnum("tierAccess").notNull().default("all"),
  featured: boolean("featured").notNull().default(false),
  status: cmsStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type CmsMemberContent = typeof cmsMemberContent.$inferSelect;
export type InsertCmsMemberContent = typeof cmsMemberContent.$inferInsert;

// ─── CMS Singletons ───────────────────────────────────────────────────────────

export const cmsSingletons = pgTable("cms_singletons", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  data: json("data").notNull(),
  status: singletonStatusEnum("status").notNull().default("published"),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  updatedBy: integer("updatedBy"),
});
export type CmsSingleton = typeof cmsSingletons.$inferSelect;
export type InsertCmsSingleton = typeof cmsSingletons.$inferInsert;
