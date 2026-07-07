// Member-facing portal feature public API
export { memberPortalRouter } from "./server/router";
export { default as MemberPortal } from "./client/pages/MemberPortal";
export { default as MyBookings } from "./client/pages/MyBookings";
export { default as PropertyBrowser } from "./client/pages/PropertyBrowser";
export { default as PropertyDetail } from "./client/pages/PropertyDetail";
export { default as PortalAvailability } from "./client/pages/PortalAvailability";
// Waiver schema tables for cross-feature use (e.g., waivers feature)
export { waiverTemplates, portalWaivers, type WaiverTemplate, type PortalWaiver } from "./schema";
