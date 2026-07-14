import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const applicationStatusEnum = pgEnum("application_status", ["pending", "approved", "declined"]);

export const membershipApplications = pgTable("membership_applications", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  interests: text("interests"),
  referral: text("referral"),
  message: text("message"),
  status: applicationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("ma_status_idx").on(t.status),
  index("ma_created_at_idx").on(t.createdAt),
]);

export type MembershipApplication = typeof membershipApplications.$inferSelect;
export type InsertMembershipApplication = typeof membershipApplications.$inferInsert;

// ─── Social Parent Organizations ──────────────────────────────────────────────

export const socialParentOrganizations = pgTable("social_parent_organization", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  annualBookingAllowance: integer("annual_booking_allowance").notNull(),
  periodStartDate: date("period_start_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type SocialParentOrganization = typeof socialParentOrganizations.$inferSelect;
export type InsertSocialParentOrganization = typeof socialParentOrganizations.$inferInsert;

// ─── Social Organization Usage Tracking ────────────────────────────────────────

export const socialOrganizationUsage = pgTable("social_organization_usage", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  socialParentOrganizationId: integer("social_parent_organization_id").notNull().references(
    () => socialParentOrganizations.id,
    { onDelete: "cascade" }
  ),
  periodStartDate: date("period_start_date").notNull(),
  propertyDaysUsed: integer("property_days_used").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("sou_org_idx").on(t.socialParentOrganizationId),
  index("sou_period_idx").on(t.periodStartDate),
]);

export type SocialOrganizationUsage = typeof socialOrganizationUsage.$inferSelect;
export type InsertSocialOrganizationUsage = typeof socialOrganizationUsage.$inferInsert;


// ─── Skill Groups (for activity-based filtering) ────────────────────────────────

export const skillGroups = pgTable("skill_groups", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("skill_groups_slug_idx").on(t.slug),
  index("skill_groups_active_idx").on(t.active),
]);

export type SkillGroup = typeof skillGroups.$inferSelect;
export type InsertSkillGroup = typeof skillGroups.$inferInsert;

// ─── Member × Skill Group Join Table ──────────────────────────────────────────

export const memberSkillGroups = pgTable("member_skill_groups", {
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  skillGroupId: integer("skill_group_id").notNull().references(() => skillGroups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("msg_member_idx").on(t.memberId),
  index("msg_skill_group_idx").on(t.skillGroupId),
  primaryKey({ columns: [t.memberId, t.skillGroupId] }),
]);

export type MemberSkillGroup = typeof memberSkillGroups.$inferSelect;
export type InsertMemberSkillGroup = typeof memberSkillGroups.$inferInsert;

// ─── Master Calendar Access (which skill groups can view/manage the master calendar) ─

export const skillGroupCalendarAccess = pgTable("skill_group_calendar_access", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  skillGroupId: integer("skill_group_id").notNull().references(() => skillGroups.id, { onDelete: "cascade" }),
  canViewMasterCalendar: boolean("can_view_master_calendar").notNull().default(false),
  canManageMasterCalendar: boolean("can_manage_master_calendar").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  uniqueIndex("sgca_skill_group_idx").on(t.skillGroupId),
]);

export type SkillGroupCalendarAccess = typeof skillGroupCalendarAccess.$inferSelect;
export type InsertSkillGroupCalendarAccess = typeof skillGroupCalendarAccess.$inferInsert;

// ─── Property × Skill Group Access (which skill groups can view/book which properties) ─

export const propertySkillGroupAccess = pgTable("property_skill_group_access", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("property_id").notNull(),
  skillGroupId: integer("skill_group_id").notNull().references(() => skillGroups.id, { onDelete: "cascade" }),
  canView: boolean("can_view").notNull().default(false),
  canBook: boolean("can_book").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  uniqueIndex("psga_property_skill_group_idx").on(t.propertyId, t.skillGroupId),
  index("psga_property_idx").on(t.propertyId),
  index("psga_skill_group_idx").on(t.skillGroupId),
]);

export type PropertySkillGroupAccess = typeof propertySkillGroupAccess.$inferSelect;
export type InsertPropertySkillGroupAccess = typeof propertySkillGroupAccess.$inferInsert;

// ─── Members ──────────────────────────────────────────────────────────────────

export const members = pgTable("members", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar("userId", { length: 36 }).notNull(),
  memberNumber: varchar("memberNumber", { length: 50 }),
  socialParentOrganizationId: integer("social_parent_organization_id").references(
    () => socialParentOrganizations.id,
    { onDelete: "set null" }
  ),
  joinDate: date("joinDate"),
  renewalDate: date("renewalDate"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("mem_user_idx").on(t.userId),
  index("mem_active_idx").on(t.active),
  index("mem_org_idx").on(t.socialParentOrganizationId),
  index("mem_created_at_idx").on(t.createdAt),
]);

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;
