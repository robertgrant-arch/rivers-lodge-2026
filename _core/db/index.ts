export * from '@features/auth/schema';
export * from './schema';
export * from './portal-schema';
export * from './booking-schema';
export * from './property-booking-schema';

// ─── Collision resolution ─────────────────────────────────────────────────────
// Both ./schema (via features/property-slot-config, a catalog design that was
// never migrated) and ./property-booking-schema define a table named
// property_activities. The LIVE database table matches the property-booking
// shape ("propertyId" → hunting_properties + property_activity enum — created
// by the startup migration), so its exports win at this barrel. The catalog
// version remains importable directly from features/property-slot-config/schema.
// Without these explicit re-exports the star-export conflict silently drops the
// names (TS2308) and drizzle-kit could try to create both shapes.
export {
  propertyActivities,
  type PropertyActivity,
  type InsertPropertyActivity,
} from './property-booking-schema';
