// Portal feature — SERVER public API (server-only: no React).
// Client code imports from @features/portal/public instead.
//
// Schema files (features/*/schema.ts) should import portal tables from
// @core/db/portal-schema rather than here: this barrel also loads the calendar
// sources (which import @core/server/db), and pulling that into the schema
// barrel's import graph creates a cycle.

// Drizzle tables + types other features' server code uses.
export {
  // Calendar / availability (booking-engine, admin)
  portalEvents,
  portalBlockedDates,
  calendarAccessSettings,
  type PortalEvent,
  type InsertPortalEvent,
  type PortalBlockedDate,
  type InsertPortalBlockedDate,
  type CalendarAccessSettings,
  type InsertCalendarAccessSettings,
  // Waivers
  waiverTemplates,
  portalWaivers,
  type WaiverTemplate,
  type PortalWaiver,
} from "../schema";

// Calendar sources for the bookings/entries the portal schema owns
// (registered at boot in _core/server/calendarSources.ts).
export {
  weddingCalendarSource,
  corporateCalendarSource,
  huntFishCalendarSource,
  opsEventCalendarSource,
  memberEventCalendarSource,
  blockedCalendarSource,
  PORTAL_CALENDAR_COLORS,
} from "./calendarSources";

// Ops audit log writer (portal_audit_log).
export { logPortalAudit, type PortalAuditEntry } from "./audit";
