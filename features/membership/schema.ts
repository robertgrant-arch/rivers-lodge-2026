import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Member Type Enum ─────────────────────────────────────────────────────────
export const memberTypeEnum = pgEnum("member_type", ["Designated", "Silver", "Social"]);

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
  membershipType: memberTypeEnum("membership_type").notNull().default("Social"),
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
  index("mem_membership_type_idx").on(t.membershipType),
  index("mem_org_idx").on(t.socialParentOrganizationId),
  index("mem_created_at_idx").on(t.createdAt),
]);

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

// ─── Employees (for /ops/employees admin) ─────────────────────────────────────

export const employees = pgTable("employees", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("emp_user_idx").on(t.userId),
  index("emp_email_idx").on(t.email),
  index("emp_active_idx").on(t.active),
]);

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ─── Employee × Skill Group Join Table ────────────────────────────────────────

export const employeeSkillGroups = pgTable("employee_skill_groups", {
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  skillGroupId: integer("skill_group_id").notNull().references(() => skillGroups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("esg_employee_idx").on(t.employeeId),
  index("esg_skill_group_idx").on(t.skillGroupId),
  primaryKey({ columns: [t.employeeId, t.skillGroupId] }),
]);

export type EmployeeSkillGroup = typeof employeeSkillGroups.$inferSelect;
export type InsertEmployeeSkillGroup = typeof employeeSkillGroups.$inferInsert;

// ─── Member File (migration 0035) ─────────────────────────────────────────────
// Staff-only extended profile for a member. Every column is optional, and a row
// exists only once staff save something — nothing is created for existing
// members. Membership number/type/status/dates and general notes stay on the
// members table above; they are not duplicated here.
//
// PRIVACY: Health & Safety columns and member_staff_notes are staff-only. Only
// the Member File procedures in features/admin/server/memberFile.ts may read
// these tables; no member-facing query may select from them.

export type ActivityInterest = { activity: string; level: string | null };

export const memberProfiles = pgTable("member_profiles", {
  memberId: integer("member_id").primaryKey().references(() => members.id, { onDelete: "cascade" }),

  // Profile & Contact
  // Private storage key. Never exposed as a public /manus-storage URL — the API
  // returns a short-lived signed URL to authorized staff only.
  photoKey: text("photo_key"),
  fullName: varchar("full_name", { length: 255 }),
  preferredName: varchar("preferred_name", { length: 120 }),
  cellPhone: varchar("cell_phone", { length: 50 }),
  workPhone: varchar("work_phone", { length: 50 }),
  addressStreet: varchar("address_street", { length: 255 }),
  addressCity: varchar("address_city", { length: 120 }),
  addressState: varchar("address_state", { length: 50 }),
  addressZip: varchar("address_zip", { length: 20 }),
  birthdayMonth: smallint("birthday_month"),
  birthdayDay: smallint("birthday_day"),
  birthdayYear: smallint("birthday_year"),
  company: varchar("company", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  preferredContactMethod: varchar("preferred_contact_method", { length: 16 }),
  commBookingNotices: boolean("comm_booking_notices"),
  commNewsletter: boolean("comm_newsletter"),

  // Family & Emergency
  spouseName: varchar("spouse_name", { length: 255 }),
  spousePhone: varchar("spouse_phone", { length: 50 }),
  spouseEmail: varchar("spouse_email", { length: 320 }),
  spouseIncluded: boolean("spouse_included"),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactRelationship: varchar("emergency_contact_relationship", { length: 120 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),

  // Health & Safety (staff-only)
  foodAllergies: text("food_allergies"),
  otherAllergies: text("other_allergies"),
  dietaryRestrictions: text("dietary_restrictions"),
  medicalNotes: text("medical_notes"),
  accessibilityNeeds: text("accessibility_needs"),

  // Preferences
  favoriteDrink: varchar("favorite_drink", { length: 255 }),
  prefersNonalcoholic: boolean("prefers_nonalcoholic"),
  favoriteFood: varchar("favorite_food", { length: 255 }),
  favoriteActivity: varchar("favorite_activity", { length: 255 }),
  activityInterests: jsonb("activity_interests").$type<ActivityInterest[]>(),
  favoritePropertyId: integer("favorite_property_id"),
  equipmentNeeds: text("equipment_needs"),
  tripStyles: jsonb("trip_styles").$type<string[]>(),
  thingsToKnow: text("things_to_know"),

  // Membership & Admin (staff-managed)
  householdOrCompany: varchar("household_or_company", { length: 255 }),
  referredBy: varchar("referred_by", { length: 255 }),
  referralSource: varchar("referral_source", { length: 255 }),
  assignedStaffEmployeeId: integer("assigned_staff_employee_id").references(() => employees.id, { onDelete: "set null" }),
  orientationCompleted: boolean("orientation_completed"),
  orientationDate: date("orientation_date"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  updatedByUserId: varchar("updated_by_user_id", { length: 36 }),
});

export type MemberProfile = typeof memberProfiles.$inferSelect;
export type InsertMemberProfile = typeof memberProfiles.$inferInsert;

export const memberChildren = pgTable("member_children", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  preferredName: varchar("preferred_name", { length: 120 }),
  birthMonth: smallint("birth_month"),
  birthYear: smallint("birth_year"),
  ageGroup: varchar("age_group", { length: 32 }),
  // Informational only — does NOT grant booking rights or login access.
  includedInMembership: boolean("included_in_membership"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("member_children_member_idx").on(t.memberId),
]);

export type MemberChild = typeof memberChildren.$inferSelect;

export const memberStaffNotes = pgTable("member_staff_notes", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  authorUserId: varchar("author_user_id", { length: 36 }),
  authorEmail: varchar("author_email", { length: 320 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("member_staff_notes_member_idx").on(t.memberId, t.createdAt),
]);

export type MemberStaffNote = typeof memberStaffNotes.$inferSelect;
