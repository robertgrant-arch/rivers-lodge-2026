// Portal feature — SERVER public API (server-only: no React).
// Client code imports from @features/portal/public instead.

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
