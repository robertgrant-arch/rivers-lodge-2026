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
export const memberTierEnum = pgEnum("member_tier", ["Designated", "Silver", "Social"]);

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

// ─── Role-Based Access Control ────────────────────────────────────────────────

export const roles = pgTable("roles", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("role_key_idx").on(t.key),
]);

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

export const resourceAccess = pgTable("resource_access", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  resourceId: text("resource_id").notNull(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  canViewAndBook: boolean("can_view_and_book").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  uniqueIndex("resource_access_unique_idx").on(t.resourceType, t.resourceId, t.roleId),
  index("resource_access_role_idx").on(t.roleId),
  index("resource_access_resource_idx").on(t.resourceType, t.resourceId),
]);

export type ResourceAccess = typeof resourceAccess.$inferSelect;
export type InsertResourceAccess = typeof resourceAccess.$inferInsert;

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

// ─── Role × Skill Group Access Matrix ──────────────────────────────────────────

export const roleSkillGroupAccess = pgTable("role_skill_group_access", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  skillGroupId: integer("skill_group_id").notNull().references(() => skillGroups.id, { onDelete: "cascade" }),
  canView: boolean("can_view").notNull().default(false),
  canBook: boolean("can_book").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("rsk_role_idx").on(t.roleId),
  index("rsk_skill_group_idx").on(t.skillGroupId),
  primaryKey({ columns: [t.roleId, t.skillGroupId] }),
]);

export type RoleSkillGroupAccess = typeof roleSkillGroupAccess.$inferSelect;
export type InsertRoleSkillGroupAccess = typeof roleSkillGroupAccess.$inferInsert;

// ─── Role × Property × Skill Group Access (per-property overrides) ─────────────

export const rolePropertySkillGroupAccess = pgTable("role_property_skill_group_access", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").notNull(),
  skillGroupId: integer("skill_group_id").notNull().references(() => skillGroups.id, { onDelete: "cascade" }),
  canView: boolean("can_view").notNull().default(false),
  canBook: boolean("can_book").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("rps_role_idx").on(t.roleId),
  index("rps_property_idx").on(t.propertyId),
  index("rps_skill_group_idx").on(t.skillGroupId),
  primaryKey({ columns: [t.roleId, t.propertyId, t.skillGroupId] }),
]);

export type RolePropertySkillGroupAccess = typeof rolePropertySkillGroupAccess.$inferSelect;
export type InsertRolePropertySkillGroupAccess = typeof rolePropertySkillGroupAccess.$inferInsert;

// ─── Property × Skill Group Join Table (which skill groups per property) ─────

export const propertySkillGroups = pgTable("property_skill_groups", {
  propertyId: integer("property_id").notNull(),
  skillGroupId: integer("skill_group_id").notNull().references(() => skillGroups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("psg_property_idx").on(t.propertyId),
  index("psg_skill_group_idx").on(t.skillGroupId),
  primaryKey({ columns: [t.propertyId, t.skillGroupId] }),
]);

export type PropertySkillGroup = typeof propertySkillGroups.$inferSelect;
export type InsertPropertySkillGroup = typeof propertySkillGroups.$inferInsert;

// ─── Members with Social Org FK and Role FK ────────────────────────────────────

export const members = pgTable("members", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar("userId", { length: 36 }).notNull(),
  memberNumber: varchar("memberNumber", { length: 50 }),
  tier: memberTierEnum("tier").notNull().default("Designated"),
  socialParentOrganizationId: integer("social_parent_organization_id").references(
    () => socialParentOrganizations.id,
    { onDelete: "set null" }
  ),
  roleId: integer("role_id").references(() => roles.id, { onDelete: "set null" }),
  joinDate: date("joinDate"),
  renewalDate: date("renewalDate"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("mem_user_idx").on(t.userId),
  index("mem_active_idx").on(t.active),
  index("mem_tier_idx").on(t.tier),
  index("mem_org_idx").on(t.socialParentOrganizationId),
  index("mem_role_idx").on(t.roleId),
  index("mem_created_at_idx").on(t.createdAt),
]);

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;
