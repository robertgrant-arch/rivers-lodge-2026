// ═══════════════════════════════════════════════════════════════════════════════
// Central schema barrel — re-exports all feature schema tables.
// No pgTable definitions live here (schema is split across feature modules).
// ═══════════════════════════════════════════════════════════════════════════════

export * from "@features/auth/schema";
export * from "@features/updates/schema";
export * from "@features/inquiries/schema";
export * from "@features/membership/schema";
export * from "@features/booking-engine/schema";
export * from "@features/waivers/schema";
export * from "@features/messages/schema";
export * from "@features/cms/schema";
export * from "@features/reports/schema";
