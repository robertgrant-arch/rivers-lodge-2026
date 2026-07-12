// ─── Admin Feature Schema ─────────────────────────────────────────────────────
// Re-exports all admin/ops-portal-owned tables from the core DB schema file.
// Consumers within the admin feature should import from here.
// Other features must NOT import from here — use their own public.ts barrels.

export {
  // Event bookings managed by ops staff
  weddingBookings,
  corporateBookings,
  huntFishBookings,
  harvestRecords,
  seasonConfigs,
  // Staff coordination
  portalStaffAssignments,
  portalDocuments,
  // Waiver management (templates + portal waivers)
  waiverTemplates,
  waiverTemplateVersions,
  portalWaivers,
  // Ops infrastructure
  portalAuditLog,
  portalNotifications,
  portalTasks,
  portalNotes,
} from "@core/db/portal-schema";

// Calendar / availability management — defined in portal feature schema
export { portalBlockedDates, calendarAccessSettings } from "@features/portal/schema";

export type {
  WeddingBooking,
  InsertWeddingBooking,
  CorporateBooking,
  InsertCorporateBooking,
  HuntFishBooking,
  InsertHuntFishBooking,
  HarvestRecord,
  InsertHarvestRecord,
  SeasonConfig,
  InsertSeasonConfig,
  CalendarAccessSettings,
  InsertCalendarAccessSettings,
  PortalStaffAssignment,
  PortalDocument,
  WaiverTemplate,
  PortalWaiver,
  PortalAuditLog,
  PortalNotification,
  PortalTask,
  PortalNote,
} from "@core/db/portal-schema";

// Calendar types
export type { PortalBlockedDate, InsertPortalBlockedDate } from "@features/portal/schema";
