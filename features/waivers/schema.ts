// Waiver feature schema — re-exports all waiver-related tables and types
// from the central DB modules so the feature owns a stable schema boundary.

// Legacy waivers table (simple sign-and-store flow)
export {
  waivers,
  type Waiver,
  type InsertWaiver,
} from "@core/db/schema";

// Portal waiver templates and extended portal waivers
export {
  waiverTemplates,
  type WaiverTemplate,
  portalWaivers,
  type PortalWaiver,
} from "@core/db/portal-schema";
