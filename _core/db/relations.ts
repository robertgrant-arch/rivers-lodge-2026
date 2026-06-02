/**
 * Drizzle ORM Relations
 * Rivers Lodge & Hunt Club
 *
 * All cross-feature FK relationships are declared here.
 * Import tables from the barrel (schema.ts) or directly from
 * portal-schema.ts / booking-schema.ts / property-booking-schema.ts
 * as needed — those files are not re-exported through the main barrel.
 */

import { relations } from "drizzle-orm";

// ─── Main barrel (schema.ts re-exports auth, cms, messages, reports, updates) ─
import {
  users,
  members,
  bookings,
  waivers,
  messages,
  cmsGalleries,
  cmsGalleryImages,
  cmsSingletons,
} from "./schema";

// ─── Booking schema ───────────────────────────────────────────────────────────
import {
  resources,
  resourceGroups,
  availabilityRules,
  bookingResourceAllocations,
  conflictAcknowledgments,
  paymentRecords,
  waiverRequirements,
  reservationRequests,
  leads,
  bookingStateTransitions,
  huntFishSlots,
  tripRequests,
} from "./booking-schema";

// ─── Portal schema ────────────────────────────────────────────────────────────
import {
  weddingBookings,
  corporateBookings,
  huntFishBookings,
  harvestRecords,
  portalBlockedDates,
  portalStaffAssignments,
  portalDocuments,
  waiverTemplates,
  portalWaivers,
  portalAuditLog,
  portalNotifications,
  portalTasks,
  portalNotes,
} from "./portal-schema";

// ─── Property booking schema ──────────────────────────────────────────────────
import {
  huntingProperties,
  propertySeasons,
  propertyBookingRules,
  propertyPricing,
  propertyDateInventory,
  propertyBookings,
  bookingAddOns,
  bookingPayments,
  bookingAuditLog,
  harvestReports,
  propertyBlockedDates,
  bookingWaitlist,
  propertyImages,
  propertyAmenities,
} from "./property-booking-schema";

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

export const usersRelations = relations(users, ({ many }) => ({
  // Core
  members: many(members),
  bookings: many(bookings),
  waivers: many(waivers),
  messages: many(messages),

  // Booking system
  reservationRequestsAssigned: many(reservationRequests, { relationName: "assignedTo" }),
  reservationRequestsSubmitted: many(reservationRequests, { relationName: "submittedBy" }),
  leadsAssigned: many(leads, { relationName: "leadAssignedTo" }),
  bookingStateTransitions: many(bookingStateTransitions, { relationName: "triggeredBy" }),
  conflictAcknowledgments: many(conflictAcknowledgments),
  paymentRecordsRecorded: many(paymentRecords),
  huntFishSlotsCreated: many(huntFishSlots),
  tripRequestsReviewed: many(tripRequests, { relationName: "reviewedBy" }),
  tripRequestsSubmitted: many(tripRequests, { relationName: "tripSubmittedBy" }),

  // Portal
  weddingBookingsAssigned: many(weddingBookings),
  corporateBookingsAssigned: many(corporateBookings),
  huntFishBookingsGuide: many(huntFishBookings, { relationName: "guide" }),
  portalBlockedDatesCreated: many(portalBlockedDates),
  portalStaffAssignments: many(portalStaffAssignments),
  portalDocumentsUploaded: many(portalDocuments),
  portalAuditLog: many(portalAuditLog),
  portalNotifications: many(portalNotifications),
  portalTasksAssigned: many(portalTasks, { relationName: "taskAssignedTo" }),
  portalTasksCreated: many(portalTasks, { relationName: "taskCreatedBy" }),
  portalNotes: many(portalNotes),

  // Property bookings
  propertyBookings: many(propertyBookings, { relationName: "propertyBookingUser" }),
  propertyBookingsApproved: many(propertyBookings, { relationName: "approvedBy" }),
  propertyBookingsCancelled: many(propertyBookings, { relationName: "cancelledBy" }),
  bookingAuditLog: many(bookingAuditLog),
  bookingPaymentsRecorded: many(bookingPayments),
  bookingWaitlist: many(bookingWaitlist, { relationName: "waitlistUser" }),
  propertyBlockedDatesCreated: many(propertyBlockedDates),
  propertyImagesUploaded: many(propertyImages),

  // CMS
  cmsSingletonsUpdated: many(cmsSingletons),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════════════════════════════════════════

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),

  // Portal hunt/fish
  huntFishBookings: many(huntFishBookings),

  // Trip requests (booking system)
  tripRequests: many(tripRequests, { relationName: "tripMember" }),
  reservationRequests: many(reservationRequests, { relationName: "reservationMember" }),

  // Property bookings
  propertyBookings: many(propertyBookings, { relationName: "propertyBookingMember" }),
  harvestReports: many(harvestReports),
  bookingWaitlist: many(bookingWaitlist, { relationName: "waitlistMember" }),

  // Portal waivers linked to member
  portalWaivers: many(portalWaivers),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKINGS (core schema)
// ═══════════════════════════════════════════════════════════════════════════════

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),

  // Booking system allocations
  resourceAllocations: many(bookingResourceAllocations),
  paymentRecords: many(paymentRecords),
  stateTransitions: many(bookingStateTransitions),
  conflictAcknowledgments: many(conflictAcknowledgments),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// WAIVERS (core schema)
// ═══════════════════════════════════════════════════════════════════════════════

export const waiversRelations = relations(waivers, ({ one }) => ({
  user: one(users, {
    fields: [waivers.userId],
    references: [users.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE GROUPS & RESOURCES (booking-schema)
// ═══════════════════════════════════════════════════════════════════════════════

export const resourceGroupsRelations = relations(resourceGroups, ({ many }) => ({
  resources: many(resources),
  availabilityRules: many(availabilityRules, { relationName: "groupRules" }),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  group: one(resourceGroups, {
    fields: [resources.groupId],
    references: [resourceGroups.id],
  }),
  availabilityRules: many(availabilityRules, { relationName: "resourceRules" }),
  allocations: many(bookingResourceAllocations),
  huntFishSlots: many(huntFishSlots),
}));

export const availabilityRulesRelations = relations(availabilityRules, ({ one }) => ({
  resource: one(resources, {
    fields: [availabilityRules.resourceId],
    references: [resources.id],
    relationName: "resourceRules",
  }),
  group: one(resourceGroups, {
    fields: [availabilityRules.groupId],
    references: [resourceGroups.id],
    relationName: "groupRules",
  }),
}));

export const bookingResourceAllocationsRelations = relations(bookingResourceAllocations, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingResourceAllocations.bookingId],
    references: [bookings.id],
  }),
  resource: one(resources, {
    fields: [bookingResourceAllocations.resourceId],
    references: [resources.id],
  }),
}));

export const conflictAcknowledgmentsRelations = relations(conflictAcknowledgments, ({ one }) => ({
  booking: one(bookings, {
    fields: [conflictAcknowledgments.bookingId],
    references: [bookings.id],
  }),
  acknowledgedBy: one(users, {
    fields: [conflictAcknowledgments.acknowledgedByUserId],
    references: [users.id],
  }),
}));

export const paymentRecordsRelations = relations(paymentRecords, ({ one }) => ({
  booking: one(bookings, {
    fields: [paymentRecords.bookingId],
    references: [bookings.id],
  }),
  recordedBy: one(users, {
    fields: [paymentRecords.recordedByUserId],
    references: [users.id],
  }),
}));

export const waiverRequirementsRelations = relations(waiverRequirements, ({ one }) => ({
  waiverTemplate: one(waiverTemplates, {
    fields: [waiverRequirements.waiverTemplateId],
    references: [waiverTemplates.id],
  }),
}));

export const reservationRequestsRelations = relations(reservationRequests, ({ one }) => ({
  member: one(members, {
    fields: [reservationRequests.memberId],
    references: [members.id],
    relationName: "reservationMember",
  }),
  submittedByUser: one(users, {
    fields: [reservationRequests.userId],
    references: [users.id],
    relationName: "submittedBy",
  }),
  assignedTo: one(users, {
    fields: [reservationRequests.assignedToUserId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  convertedBooking: one(bookings, {
    fields: [reservationRequests.convertedBookingId],
    references: [bookings.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  assignedTo: one(users, {
    fields: [leads.assignedToUserId],
    references: [users.id],
    relationName: "leadAssignedTo",
  }),
  reservationRequest: one(reservationRequests, {
    fields: [leads.reservationRequestId],
    references: [reservationRequests.id],
  }),
  convertedBooking: one(bookings, {
    fields: [leads.convertedBookingId],
    references: [bookings.id],
  }),
}));

export const bookingStateTransitionsRelations = relations(bookingStateTransitions, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingStateTransitions.bookingId],
    references: [bookings.id],
  }),
  triggeredBy: one(users, {
    fields: [bookingStateTransitions.triggeredByUserId],
    references: [users.id],
    relationName: "triggeredBy",
  }),
}));

// ─── Hunt/Fish Slots & Trip Requests ─────────────────────────────────────────

export const huntFishSlotsRelations = relations(huntFishSlots, ({ one, many }) => ({
  resource: one(resources, {
    fields: [huntFishSlots.resourceId],
    references: [resources.id],
  }),
  createdBy: one(users, {
    fields: [huntFishSlots.createdByUserId],
    references: [users.id],
  }),
  tripRequests: many(tripRequests),
}));

export const tripRequestsRelations = relations(tripRequests, ({ one }) => ({
  slot: one(huntFishSlots, {
    fields: [tripRequests.slotId],
    references: [huntFishSlots.id],
  }),
  user: one(users, {
    fields: [tripRequests.userId],
    references: [users.id],
    relationName: "tripSubmittedBy",
  }),
  member: one(members, {
    fields: [tripRequests.memberId],
    references: [members.id],
    relationName: "tripMember",
  }),
  reviewedBy: one(users, {
    fields: [tripRequests.reviewedByUserId],
    references: [users.id],
    relationName: "reviewedBy",
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// PORTAL SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const weddingBookingsRelations = relations(weddingBookings, ({ one }) => ({
  assignedUser: one(users, {
    fields: [weddingBookings.assignedUserId],
    references: [users.id],
  }),
}));

export const corporateBookingsRelations = relations(corporateBookings, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [corporateBookings.assignedUserId],
    references: [users.id],
  }),
  linkedHuntFish: one(huntFishBookings, {
    fields: [corporateBookings.linkedHuntFishId],
    references: [huntFishBookings.id],
  }),
  huntFishBookings: many(huntFishBookings, { relationName: "linkedCorporate" }),
}));

export const huntFishBookingsRelations = relations(huntFishBookings, ({ one, many }) => ({
  member: one(members, {
    fields: [huntFishBookings.memberId],
    references: [members.id],
  }),
  linkedCorporate: one(corporateBookings, {
    fields: [huntFishBookings.linkedCorporateId],
    references: [corporateBookings.id],
    relationName: "linkedCorporate",
  }),
  guide: one(users, {
    fields: [huntFishBookings.guideUserId],
    references: [users.id],
    relationName: "guide",
  }),
  harvestRecords: many(harvestRecords),
}));

export const harvestRecordsRelations = relations(harvestRecords, ({ one }) => ({
  huntFishBooking: one(huntFishBookings, {
    fields: [harvestRecords.huntFishBookingId],
    references: [huntFishBookings.id],
  }),
}));

export const portalBlockedDatesRelations = relations(portalBlockedDates, ({ one }) => ({
  createdBy: one(users, {
    fields: [portalBlockedDates.createdByUserId],
    references: [users.id],
  }),
}));

export const portalStaffAssignmentsRelations = relations(portalStaffAssignments, ({ one }) => ({
  staffUser: one(users, {
    fields: [portalStaffAssignments.staffUserId],
    references: [users.id],
  }),
}));

export const portalDocumentsRelations = relations(portalDocuments, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [portalDocuments.uploadedByUserId],
    references: [users.id],
  }),
}));

export const waiverTemplatesRelations = relations(waiverTemplates, ({ many }) => ({
  portalWaivers: many(portalWaivers),
  waiverRequirements: many(waiverRequirements),
}));

export const portalWaiversRelations = relations(portalWaivers, ({ one }) => ({
  template: one(waiverTemplates, {
    fields: [portalWaivers.templateId],
    references: [waiverTemplates.id],
  }),
  linkedMember: one(members, {
    fields: [portalWaivers.linkedMemberId],
    references: [members.id],
  }),
}));

export const portalAuditLogRelations = relations(portalAuditLog, ({ one }) => ({
  actingUser: one(users, {
    fields: [portalAuditLog.actingUserId],
    references: [users.id],
  }),
}));

export const portalNotificationsRelations = relations(portalNotifications, ({ one }) => ({
  recipient: one(users, {
    fields: [portalNotifications.recipientUserId],
    references: [users.id],
  }),
}));

export const portalTasksRelations = relations(portalTasks, ({ one }) => ({
  assignedTo: one(users, {
    fields: [portalTasks.assignedToUserId],
    references: [users.id],
    relationName: "taskAssignedTo",
  }),
  createdBy: one(users, {
    fields: [portalTasks.createdByUserId],
    references: [users.id],
    relationName: "taskCreatedBy",
  }),
}));

export const portalNotesRelations = relations(portalNotes, ({ one }) => ({
  author: one(users, {
    fields: [portalNotes.authorUserId],
    references: [users.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY BOOKING SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const huntingPropertiesRelations = relations(huntingProperties, ({ many }) => ({
  seasons: many(propertySeasons),
  bookingRules: many(propertyBookingRules),
  pricing: many(propertyPricing),
  dateInventory: many(propertyDateInventory),
  bookings: many(propertyBookings),
  harvestReports: many(harvestReports),
  blockedDates: many(propertyBlockedDates),
  waitlist: many(bookingWaitlist),
  images: many(propertyImages),
  amenities: many(propertyAmenities),
}));

export const propertySeasonsRelations = relations(propertySeasons, ({ one, many }) => ({
  property: one(huntingProperties, {
    fields: [propertySeasons.propertyId],
    references: [huntingProperties.id],
  }),
  pricing: many(propertyPricing),
  bookings: many(propertyBookings),
}));

export const propertyBookingRulesRelations = relations(propertyBookingRules, ({ one }) => ({
  property: one(huntingProperties, {
    fields: [propertyBookingRules.propertyId],
    references: [huntingProperties.id],
  }),
}));

export const propertyPricingRelations = relations(propertyPricing, ({ one }) => ({
  property: one(huntingProperties, {
    fields: [propertyPricing.propertyId],
    references: [huntingProperties.id],
  }),
  season: one(propertySeasons, {
    fields: [propertyPricing.seasonId],
    references: [propertySeasons.id],
  }),
}));

export const propertyDateInventoryRelations = relations(propertyDateInventory, ({ one }) => ({
  property: one(huntingProperties, {
    fields: [propertyDateInventory.propertyId],
    references: [huntingProperties.id],
  }),
}));

export const propertyBookingsRelations = relations(propertyBookings, ({ one, many }) => ({
  member: one(members, {
    fields: [propertyBookings.memberId],
    references: [members.id],
    relationName: "propertyBookingMember",
  }),
  user: one(users, {
    fields: [propertyBookings.userId],
    references: [users.id],
    relationName: "propertyBookingUser",
  }),
  property: one(huntingProperties, {
    fields: [propertyBookings.propertyId],
    references: [huntingProperties.id],
  }),
  season: one(propertySeasons, {
    fields: [propertyBookings.seasonId],
    references: [propertySeasons.id],
  }),
  approvedBy: one(users, {
    fields: [propertyBookings.approvedByUserId],
    references: [users.id],
    relationName: "approvedBy",
  }),
  cancelledBy: one(users, {
    fields: [propertyBookings.cancelledByUserId],
    references: [users.id],
    relationName: "cancelledBy",
  }),
  addOns: many(bookingAddOns),
  payments: many(bookingPayments),
  auditLog: many(bookingAuditLog),
  harvestReports: many(harvestReports),
}));

export const bookingAddOnsRelations = relations(bookingAddOns, ({ one }) => ({
  booking: one(propertyBookings, {
    fields: [bookingAddOns.bookingId],
    references: [propertyBookings.id],
  }),
}));

export const bookingPaymentsRelations = relations(bookingPayments, ({ one }) => ({
  booking: one(propertyBookings, {
    fields: [bookingPayments.bookingId],
    references: [propertyBookings.id],
  }),
  recordedBy: one(users, {
    fields: [bookingPayments.recordedByUserId],
    references: [users.id],
  }),
}));

export const bookingAuditLogRelations = relations(bookingAuditLog, ({ one }) => ({
  booking: one(propertyBookings, {
    fields: [bookingAuditLog.bookingId],
    references: [propertyBookings.id],
  }),
  performedBy: one(users, {
    fields: [bookingAuditLog.performedByUserId],
    references: [users.id],
  }),
}));

export const harvestReportsRelations = relations(harvestReports, ({ one }) => ({
  booking: one(propertyBookings, {
    fields: [harvestReports.bookingId],
    references: [propertyBookings.id],
  }),
  member: one(members, {
    fields: [harvestReports.memberId],
    references: [members.id],
  }),
  property: one(huntingProperties, {
    fields: [harvestReports.propertyId],
    references: [huntingProperties.id],
  }),
}));

export const propertyBlockedDatesRelations = relations(propertyBlockedDates, ({ one }) => ({
  property: one(huntingProperties, {
    fields: [propertyBlockedDates.propertyId],
    references: [huntingProperties.id],
  }),
  createdBy: one(users, {
    fields: [propertyBlockedDates.createdByUserId],
    references: [users.id],
  }),
}));

export const bookingWaitlistRelations = relations(bookingWaitlist, ({ one }) => ({
  member: one(members, {
    fields: [bookingWaitlist.memberId],
    references: [members.id],
    relationName: "waitlistMember",
  }),
  user: one(users, {
    fields: [bookingWaitlist.userId],
    references: [users.id],
    relationName: "waitlistUser",
  }),
  property: one(huntingProperties, {
    fields: [bookingWaitlist.propertyId],
    references: [huntingProperties.id],
  }),
}));

export const propertyImagesRelations = relations(propertyImages, ({ one }) => ({
  property: one(huntingProperties, {
    fields: [propertyImages.propertyId],
    references: [huntingProperties.id],
  }),
  uploadedBy: one(users, {
    fields: [propertyImages.uploadedByUserId],
    references: [users.id],
  }),
}));

export const propertyAmenitiesRelations = relations(propertyAmenities, ({ one }) => ({
  property: one(huntingProperties, {
    fields: [propertyAmenities.propertyId],
    references: [huntingProperties.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// CMS (cross-feature FKs only)
// ═══════════════════════════════════════════════════════════════════════════════

export const cmsGalleriesRelations = relations(cmsGalleries, ({ many }) => ({
  images: many(cmsGalleryImages),
}));

export const cmsGalleryImagesRelations = relations(cmsGalleryImages, ({ one }) => ({
  gallery: one(cmsGalleries, {
    fields: [cmsGalleryImages.galleryId],
    references: [cmsGalleries.id],
  }),
}));

export const cmsSingletonsRelations = relations(cmsSingletons, ({ one }) => ({
  updatedBy: one(users, {
    fields: [cmsSingletons.updatedBy],
    references: [users.id],
  }),
}));
