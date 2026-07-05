import { router, publicProcedure, protectedProcedure } from 'features/_core/server/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getDb } from './db';
import { eq, and, asc } from 'drizzle-orm';
import { huntingProperties } from '@core/db/property-booking-schema';
import { authRouter } from 'features/auth/server/router';
import { authAdminRouter } from 'features/auth/server/adminRouter';
import { inquiriesRouter } from 'features/inquiries/server/router';
import { membershipRouter } from 'features/membership/server/router';
import { messagesRouter } from 'features/messages/server/router';
import { waiversRouter } from 'features/waivers/public';
import { cmsRouter } from 'features/cms/server/router';
import { bookingRouter } from 'features/booking-engine/server/router';
import { tripsRouter } from 'features/trips/server/router';
import { propertyBookingRouter } from 'features/property-booking/server/router';
import { reportsRouter } from 'features/reports/server/router';
import { adminRouter as portalRouter } from 'features/admin/server/router';
import { updatesRouter } from 'features/updates/server/router';
import { memberPortalRouter } from 'features/portal/server/router';
import { propertySlotConfigRouter } from 'features/property-slot-config/server/router';

// ─── Root-level Properties Routers (for backward compatibility) ──────────────

const propertiesRouter = router({
  /** List all active properties (public) */
  list: publicProcedure
    .input(z.object({
      activity: z.string().optional(),
      type: z.string().optional(),
      includeInactive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }: { input: any }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const conditions = [];
      if (!input?.includeInactive) conditions.push(eq(huntingProperties.active, true));
      if (input?.activity) conditions.push(eq(huntingProperties.primaryActivity, input.activity as any));
      if (input?.type) conditions.push(eq(huntingProperties.type, input.type as any));

      const props = await db
        .select()
        .from(huntingProperties)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(huntingProperties.sortOrder), asc(huntingProperties.name));

      // Null-safe response normalization for backward compat
      return props.map((p: any) => ({
        ...p,
        bookingModes: Array.isArray(p.bookingModes) ? p.bookingModes : ["AM", "PM"],
        secondaryActivities: Array.isArray(p.secondaryActivities) ? p.secondaryActivities : null,
        maxWaterfowlHunters: p.maxWaterfowlHunters ?? null,
        maxTotalPeople: p.maxTotalPeople ?? null,
        overnightEnabled: p.overnightEnabled ?? true,
      }));
    }),
});

const adminPropertiesRouter = router({
  /** List all properties (admin view) */
  list: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }: { ctx: any; input: any }) => {
      // Verify admin role
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const conditions = [];
      if (!input?.includeInactive) conditions.push(eq(huntingProperties.active, true));

      const props = await db
        .select()
        .from(huntingProperties)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(huntingProperties.sortOrder), asc(huntingProperties.name));

      // Null-safe response normalization for admin view
      return props.map((p: any) => ({
        ...p,
        bookingModes: Array.isArray(p.bookingModes) ? p.bookingModes : ["AM", "PM"],
        secondaryActivities: Array.isArray(p.secondaryActivities) ? p.secondaryActivities : null,
        maxWaterfowlHunters: p.maxWaterfowlHunters ?? null,
        maxTotalPeople: p.maxTotalPeople ?? null,
        overnightEnabled: p.overnightEnabled ?? true,
      }));
    }),
});

export const appRouter = router({
  auth: authRouter,
  // admin.users — user list for admin dashboard
  admin: authAdminRouter,
  inquiries: inquiriesRouter,
  membership: membershipRouter,
  messages: messagesRouter,
  waivers: waiversRouter,
  cms: cmsRouter,
  booking: bookingRouter,
  trips: tripsRouter,
  // Root-level properties routers (member portal + ops portal compatibility)
  properties: propertiesRouter,
  adminProperties: adminPropertiesRouter,
  // Nested under propertyBooking for backward compat
  propertyBooking: propertyBookingRouter,
  reports: reportsRouter,
  portal: portalRouter,
  updates: updatesRouter,
  memberPortal: memberPortalRouter,
  propertySlotConfig: propertySlotConfigRouter,
});

export type AppRouter = typeof appRouter;
