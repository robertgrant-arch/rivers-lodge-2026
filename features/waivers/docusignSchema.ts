/**
 * DocuSign waiver tables (migration 0041_docusign_waivers.sql).
 * All timestamps are epoch milliseconds (bigint), like property_bookings.
 */
import { bigint, boolean, index, integer, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";

export const waiverSettings = pgTable("waiver_settings", {
  id: integer("id").primaryKey(),
  masterRenewsEvery12Months: boolean("masterRenewsEvery12Months").notNull().default(false),
  autoSendMasterOnNewMember: boolean("autoSendMasterOnNewMember").notNull().default(true),
  memberSignHoldHours: integer("memberSignHoldHours").notNull().default(24),
  updatedByUserId: varchar("updatedByUserId", { length: 36 }),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().default(0),
});

export const memberMasterWaivers = pgTable("member_master_waivers", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  memberId: integer("memberId").notNull(),
  userId: varchar("userId", { length: 36 }),
  templateId: integer("templateId"),
  templateVersion: integer("templateVersion"),
  status: varchar("status", { length: 16 }).notNull().default("queued"),
  signerName: varchar("signerName", { length: 255 }).notNull(),
  signerEmail: varchar("signerEmail", { length: 320 }).notNull(),
  signerPhone: varchar("signerPhone", { length: 20 }),
  deliveryMethod: varchar("deliveryMethod", { length: 16 }).notNull().default("email_sms"),
  envelopeId: varchar("envelopeId", { length: 64 }),
  recipientId: varchar("recipientId", { length: 16 }),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: bigint("nextAttemptAt", { mode: "number" }),
  firstFailureAt: bigint("firstFailureAt", { mode: "number" }),
  opsAlertedAt: bigint("opsAlertedAt", { mode: "number" }),
  lastError: text("lastError"),
  sentAt: bigint("sentAt", { mode: "number" }),
  viewedAt: bigint("viewedAt", { mode: "number" }),
  signedAt: bigint("signedAt", { mode: "number" }),
  declinedAt: bigint("declinedAt", { mode: "number" }),
  lastPolledAt: bigint("lastPolledAt", { mode: "number" }),
  signedPdfKey: varchar("signedPdfKey", { length: 500 }),
  certificatePdfKey: varchar("certificatePdfKey", { length: 500 }),
  invalidatedAt: bigint("invalidatedAt", { mode: "number" }),
  invalidatedReason: varchar("invalidatedReason", { length: 255 }),
  invalidatedByUserId: varchar("invalidatedByUserId", { length: 36 }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => [
  index("mmw_member_idx").on(t.memberId),
  index("mmw_envelope_idx").on(t.envelopeId),
  index("mmw_status_idx").on(t.status),
]);

export const bookingWaiverEnvelopes = pgTable("booking_waiver_envelopes", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  bookingId: integer("bookingId").notNull(),
  envelopeId: varchar("envelopeId", { length: 64 }),
  status: varchar("status", { length: 16 }).notNull().default("queued"),
  emailOnly: boolean("emailOnly").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: bigint("nextAttemptAt", { mode: "number" }),
  firstFailureAt: bigint("firstFailureAt", { mode: "number" }),
  opsAlertedAt: bigint("opsAlertedAt", { mode: "number" }),
  lastError: text("lastError"),
  sentAt: bigint("sentAt", { mode: "number" }),
  completedAt: bigint("completedAt", { mode: "number" }),
  voidedAt: bigint("voidedAt", { mode: "number" }),
  lastPolledAt: bigint("lastPolledAt", { mode: "number" }),
  certificatePdfKey: varchar("certificatePdfKey", { length: 500 }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => [
  index("bwe_booking_idx").on(t.bookingId),
  index("bwe_envelope_idx").on(t.envelopeId),
  index("bwe_status_idx").on(t.status),
]);

export const bookingWaiverSigners = pgTable("booking_waiver_signers", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  bookingId: integer("bookingId").notNull(),
  partyAdultId: integer("partyAdultId"),
  envelopeRowId: integer("envelopeRowId"),
  role: varchar("role", { length: 16 }).notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  minors: jsonb("minors").$type<Array<{ fullName: string; dateOfBirth: string | null }>>().notNull().default([]),
  templateId: integer("templateId"),
  templateVersion: integer("templateVersion"),
  documentId: varchar("documentId", { length: 16 }),
  status: varchar("status", { length: 16 }).notNull().default("queued"),
  deliveryMethod: varchar("deliveryMethod", { length: 16 }).notNull().default("email_sms"),
  lastError: text("lastError"),
  sentAt: bigint("sentAt", { mode: "number" }),
  viewedAt: bigint("viewedAt", { mode: "number" }),
  signedAt: bigint("signedAt", { mode: "number" }),
  declinedAt: bigint("declinedAt", { mode: "number" }),
  declineReason: text("declineReason"),
  reminder72SentAt: bigint("reminder72SentAt", { mode: "number" }),
  reminder24SentAt: bigint("reminder24SentAt", { mode: "number" }),
  removedAt: bigint("removedAt", { mode: "number" }),
  signedPdfKey: varchar("signedPdfKey", { length: 500 }),
  certificatePdfKey: varchar("certificatePdfKey", { length: 500 }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => [
  index("bws_booking_idx").on(t.bookingId),
  index("bws_envelope_row_idx").on(t.envelopeRowId),
  index("bws_status_idx").on(t.status),
]);

export const bookingWaiverAcceptances = pgTable("booking_waiver_acceptances", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar("userId", { length: 36 }).notNull(),
  bookingId: integer("bookingId").notNull(),
  waiverTemplateId: integer("waiverTemplateId"),
  waiverVersion: integer("waiverVersion"),
  acceptanceText: text("acceptanceText").notNull(),
  acceptedAt: bigint("acceptedAt", { mode: "number" }).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: varchar("userAgent", { length: 512 }),
}, (t) => [
  index("bwa_booking_idx").on(t.bookingId),
]);

export type MemberMasterWaiverRow = typeof memberMasterWaivers.$inferSelect;
export type BookingWaiverEnvelopeRow = typeof bookingWaiverEnvelopes.$inferSelect;
export type BookingWaiverSignerRow = typeof bookingWaiverSigners.$inferSelect;
export type WaiverSettingsRow = typeof waiverSettings.$inferSelect;
