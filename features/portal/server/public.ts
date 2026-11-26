// Portal feature — SERVER-SAFE public API (Drizzle tables + types only).
// Import from here in server/schema code. Do NOT add React/client exports:
// features/portal/public.ts re-exports pages, and pulling those into the
// server/DB graph breaks server code and tests.
export {
  // Calendar / availability (consumed by admin, booking-engine)
  portalEvents,
  portalBlockedDates,
  calendarAccessSettings,
  type PortalEvent,
  type InsertPortalEvent,
  type PortalBlockedDate,
  type InsertPortalBlockedDate,
  type CalendarAccessSettings,
  type InsertCalendarAccessSettings,
  // Waivers (consumed by waivers)
  waiverTemplates,
  portalWaivers,
  type WaiverTemplate,
  type PortalWaiver,
} from "../schema";
