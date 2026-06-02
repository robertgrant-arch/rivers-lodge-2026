import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  date,
  json,
} from "drizzle-orm/mysql-core";

// ═══════════════════════════════════════════════════════════════════════════════
// CMS COLLECTIONS — Phase 15
// ═══════════════════════════════════════════════════════════════════════════════

// ─── CMS Amenities ────────────────────────────────────────────────────────────
// Controlled vocabulary of amenities reused across lodging units and event spaces

export const cmsAmenities = mysqlTable("cms_amenities", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 150 }).notNull(),
  icon: varchar("icon", { length: 100 }), // lucide icon name
  category: mysqlEnum("category", ["lodging", "event", "outdoor", "general"]).default("general").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CmsAmenity = typeof cmsAmenities.$inferSelect;
export type InsertCmsAmenity = typeof cmsAmenities.$inferInsert;

// ─── CMS Lodging Units ────────────────────────────────────────────────────────

export const cmsLodgingUnits = mysqlTable("cms_lodging_units", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  // e.g. "the-lodge", "riverhouse-suites", "annex-bridal-suite", "ohana-house", "farmhouse"
  name: varchar("name", { length: 255 }).notNull(),
  shortDescription: varchar("shortDescription", { length: 500 }),
  longDescription: text("longDescription"),
  squareFootage: int("squareFootage"),
  bedrooms: int("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  maxGuests: int("maxGuests"),
  heroImage: text("heroImage"), // CDN URL
  galleryImages: json("galleryImages"), // string[] of CDN URLs
  amenityIds: json("amenityIds"), // int[] of cms_amenities.id
  features: json("features"), // string[] of feature bullets
  priceNote: varchar("priceNote", { length: 255 }), // e.g. "Included with venue rental"
  availableForWeddings: boolean("availableForWeddings").default(true).notNull(),
  availableForMembers: boolean("availableForMembers").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  seoTitle: varchar("seoTitle", { length: 70 }),
  seoDescription: varchar("seoDescription", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsLodgingUnit = typeof cmsLodgingUnits.$inferSelect;
export type InsertCmsLodgingUnit = typeof cmsLodgingUnits.$inferInsert;

// ─── CMS Event Spaces ─────────────────────────────────────────────────────────

export const cmsEventSpaces = mysqlTable("cms_event_spaces", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  // e.g. "rivers-barn", "clubhouse", "river-lawn", "timber-edge", "pavilion"
  name: varchar("name", { length: 255 }).notNull(),
  division: mysqlEnum("division", ["weddings", "corporate", "both"]).default("both").notNull(),
  shortDescription: varchar("shortDescription", { length: 500 }),
  longDescription: text("longDescription"),
  capacitySeated: int("capacitySeated"),
  capacityReception: int("capacityReception"),
  heroImage: text("heroImage"),
  galleryImages: json("galleryImages"), // string[]
  amenityIds: json("amenityIds"), // int[]
  features: json("features"), // string[]
  indoorOutdoor: mysqlEnum("indoorOutdoor", ["indoor", "outdoor", "both"]).default("both").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  seoTitle: varchar("seoTitle", { length: 70 }),
  seoDescription: varchar("seoDescription", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsEventSpace = typeof cmsEventSpaces.$inferSelect;
export type InsertCmsEventSpace = typeof cmsEventSpaces.$inferInsert;

// ─── CMS Packages ─────────────────────────────────────────────────────────────

export const cmsPackages = mysqlTable("cms_packages", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  division: mysqlEnum("division", ["weddings", "corporate", "membership", "general"]).default("general").notNull(),
  tagline: varchar("tagline", { length: 255 }),
  description: text("description"),
  includes: json("includes"), // string[] of included items
  startingPrice: decimal("startingPrice", { precision: 10, scale: 2 }),
  priceNote: varchar("priceNote", { length: 255 }),
  heroImage: text("heroImage"),
  spaceIds: json("spaceIds"), // int[] of cms_event_spaces.id
  lodgingIds: json("lodgingIds"), // int[] of cms_lodging_units.id
  featured: boolean("featured").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsPackage = typeof cmsPackages.$inferSelect;
export type InsertCmsPackage = typeof cmsPackages.$inferInsert;

// ─── CMS Galleries ────────────────────────────────────────────────────────────

export const cmsGalleries = mysqlTable("cms_galleries", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["weddings", "venues", "lodging", "outdoors", "estate"]).notNull(),
  description: varchar("description", { length: 500 }),
  coverImage: text("coverImage"),
  sortOrder: int("sortOrder").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsGallery = typeof cmsGalleries.$inferSelect;
export type InsertCmsGallery = typeof cmsGalleries.$inferInsert;

// ─── CMS Gallery Images ───────────────────────────────────────────────────────

export const cmsGalleryImages = mysqlTable("cms_gallery_images", {
  id: int("id").autoincrement().primaryKey(),
  galleryId: int("galleryId").notNull(),
  url: text("url").notNull(), // CDN URL
  altText: varchar("altText", { length: 255 }),
  caption: varchar("caption", { length: 500 }),
  width: int("width"),
  height: int("height"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CmsGalleryImage = typeof cmsGalleryImages.$inferSelect;
export type InsertCmsGalleryImage = typeof cmsGalleryImages.$inferInsert;

// ─── CMS Testimonials ─────────────────────────────────────────────────────────

export const cmsTestimonials = mysqlTable("cms_testimonials", {
  id: int("id").autoincrement().primaryKey(),
  authorName: varchar("authorName", { length: 255 }).notNull(),
  authorTitle: varchar("authorTitle", { length: 255 }), // e.g. "Bride, October 2024"
  quote: text("quote").notNull(),
  rating: int("rating").default(5), // 1–5
  division: mysqlEnum("division", ["weddings", "corporate", "membership", "general"]).default("general").notNull(),
  featured: boolean("featured").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CmsTestimonial = typeof cmsTestimonials.$inferSelect;
export type InsertCmsTestimonial = typeof cmsTestimonials.$inferInsert;

// ─── CMS FAQs ─────────────────────────────────────────────────────────────────

export const cmsFaqs = mysqlTable("cms_faqs", {
  id: int("id").autoincrement().primaryKey(),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  division: mysqlEnum("division", ["weddings", "corporate", "membership", "general"]).default("general").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsFaq = typeof cmsFaqs.$inferSelect;
export type InsertCmsFaq = typeof cmsFaqs.$inferInsert;

// ─── CMS Policies ─────────────────────────────────────────────────────────────

export const cmsPolicies = mysqlTable("cms_policies", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(), // Markdown / rich text
  division: mysqlEnum("division", ["weddings", "corporate", "membership", "general"]).default("general").notNull(),
  version: varchar("version", { length: 50 }), // e.g. "v2.1 — Jan 2025"
  effectiveDate: date("effectiveDate"),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsPolicy = typeof cmsPolicies.$inferSelect;
export type InsertCmsPolicy = typeof cmsPolicies.$inferInsert;

// ─── CMS Announcements ────────────────────────────────────────────────────────

export const cmsAnnouncements = mysqlTable("cms_announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  type: mysqlEnum("type", ["banner", "alert", "news"]).default("news").notNull(),
  audience: mysqlEnum("audience", ["public", "members", "all"]).default("public").notNull(),
  ctaLabel: varchar("ctaLabel", { length: 100 }),
  ctaUrl: varchar("ctaUrl", { length: 500 }),
  expiresAt: timestamp("expiresAt"),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsAnnouncement = typeof cmsAnnouncements.$inferSelect;
export type InsertCmsAnnouncement = typeof cmsAnnouncements.$inferInsert;

// ─── CMS Contact Routes ───────────────────────────────────────────────────────
// Maps inquiry types to routing destinations (email, CRM, notification)

export const cmsContactRoutes = mysqlTable("cms_contact_routes", {
  id: int("id").autoincrement().primaryKey(),
  inquiryType: mysqlEnum("inquiryType", ["wedding", "corporate", "tour", "general", "membership"]).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(), // display label
  routeToEmail: varchar("routeToEmail", { length: 320 }),
  autoReplySubject: varchar("autoReplySubject", { length: 255 }),
  autoReplyBody: text("autoReplyBody"),
  notifyOwner: boolean("notifyOwner").default(true).notNull(),
  active: boolean("active").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsContactRoute = typeof cmsContactRoutes.$inferSelect;
export type InsertCmsContactRoute = typeof cmsContactRoutes.$inferInsert;

// ─── CMS Member Content ───────────────────────────────────────────────────────
// Member-gated content: season dates, hunt reports, fishing reports, member news

export const cmsMemberContent = mysqlTable("cms_member_content", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  contentType: mysqlEnum("contentType", ["season_date", "hunt_report", "fish_report", "member_news", "policy_update"]).notNull(),
  body: text("body").notNull(),
  heroImage: text("heroImage"),
  season: varchar("season", { length: 100 }), // e.g. "Fall 2025–2026"
  species: varchar("species", { length: 100 }), // e.g. "Whitetail Deer"
  startDate: date("startDate"),
  endDate: date("endDate"),
  tierAccess: mysqlEnum("tierAccess", ["standard", "premier", "founding", "all"]).default("all").notNull(),
  featured: boolean("featured").default(false).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsMemberContent = typeof cmsMemberContent.$inferSelect;
export type InsertCmsMemberContent = typeof cmsMemberContent.$inferInsert;

// ─── CMS Singletons ───────────────────────────────────────────────────────────
// Key-value store for singleton page content and global settings
// key examples: "global_settings", "brand_settings", "homepage", "estate_page",
//               "seo_defaults", "navigation", "footer"

export const cmsSingletons = mysqlTable("cms_singletons", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(), // human-readable name for admin UI
  data: json("data").notNull(), // structured JSON matching the singleton's schema
  status: mysqlEnum("status", ["draft", "published"]).default("published").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"), // users.id
});

export type CmsSingleton = typeof cmsSingletons.$inferSelect;
export type InsertCmsSingleton = typeof cmsSingletons.$inferInsert;

// ─── Field Reports ────────────────────────────────────────────────────────────
// Fishing, hunting, and general field condition reports posted by admins
export const fieldReports = mysqlTable("field_reports", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["fishing", "hunting", "field_conditions", "wildlife", "weather"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  // Structured metadata (species, counts, conditions, etc.)
  species: varchar("species", { length: 255 }), // e.g. "Largemouth Bass, Crappie"
  conditions: mysqlEnum("conditions", ["excellent", "good", "fair", "poor"]),
  location: varchar("location", { length: 255 }), // e.g. "South Pond", "North Timber Stand"
  reportDate: date("reportDate").notNull(),
  authorId: int("authorId").notNull(), // users.id
  authorName: varchar("authorName", { length: 255 }), // denormalized for display
  // Visibility
  tierAccess: mysqlEnum("tierAccess", ["standard", "premier", "founding", "all"]).default("all").notNull(),
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FieldReport = typeof fieldReports.$inferSelect;
export type InsertFieldReport = typeof fieldReports.$inferInsert;

// ─── Newsletters ──────────────────────────────────────────────────────────────
// AI-drafted weekly newsletters that go through admin approval before sending
export const newsletters = mysqlTable("newsletters", {
  id: int("id").autoincrement().primaryKey(),
  subject: varchar("subject", { length: 255 }).notNull(),
  // AI-generated draft content (HTML or Markdown)
  draftContent: text("draftContent"),
  // Admin-edited final content
  finalContent: text("finalContent"),
  // Prompt context used to generate the draft
  aiPromptContext: text("aiPromptContext"),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "sent", "cancelled"]).default("draft").notNull(),
  // Approval workflow
  approvedBy: int("approvedBy"), // users.id
  approvedAt: timestamp("approvedAt"),
  // Send tracking
  sentAt: timestamp("sentAt"),
  sentCount: int("sentCount").default(0),
  // Scheduling
  scheduledFor: timestamp("scheduledFor"),
  // Authorship
  createdBy: int("createdBy").notNull(), // users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Newsletter = typeof newsletters.$inferSelect;
export type InsertNewsletter = typeof newsletters.$inferInsert;
