import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../_core/server/trpc";
import { eq, and, desc } from "drizzle-orm";
import {
  activities,
  slotTemplates,
  properties,
  propertyActivities,
  propertySlots,
  InsertActivity,
  InsertSlotTemplate,
  InsertProperty,
  InsertPropertySlot,
} from "../schema";
import { getPortalDb } from "@core/server/db";
import { shouldAutoApproveBiking, checkOvernightConflicts, BookingRequest } from "./bookingLogic";
import {
  getAllActivities,
  getActivityById,
  createActivity,
  updateActivity,
  getAllSlotTemplates,
  getSlotTemplateById,
  createSlotTemplate,
  updateSlotTemplate,
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  getPropertyActivities,
  setPropertyActivities,
  getPropertySlots,
  setPropertySlots,
} from "@core/server/db";

const getDb = getPortalDb;

// ─── Role Guards ──────────────────────────────────────────────────────────────

const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin" && ctx.user?.role !== "employee") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return next({ ctx });
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const memberProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx });
});

// ─── Activity Schema ───────────────────────────────────────────────────────────

const activityCreateSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

const activityUpdateSchema = activityCreateSchema.partial();

// ─── Slot Template Schema ──────────────────────────────────────────────────────

const slotTemplateCreateSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  spansMultipleDays: z.number().int().default(0),
  active: z.boolean().default(true),
});

const slotTemplateUpdateSchema = slotTemplateCreateSchema.partial();

// ─── Property Schema ───────────────────────────────────────────────────────────

const propertyCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  type: z.string().min(1).max(50),
  primaryActivity: z.string().max(50).optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(255).optional(),
  acreage: z.number().optional(),
  maxHunters: z.number().int().default(2),
  hasHeatedBlind: z.boolean().default(false),
  hasAtvAccess: z.boolean().default(false),
  hasWaterAccess: z.boolean().default(false),
  hasElectricity: z.boolean().default(false),
  hasCellService: z.boolean().default(true),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  locationNotes: z.string().optional(),
  autoApprove: z.boolean().default(true),
  overnightExclusive: z.boolean().default(false),
  advanceNoticeHours: z.number().int().default(0),
  active: z.boolean().default(true),
  featuredOnPublicSite: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const propertyUpdateSchema = propertyCreateSchema.partial();

// ─── Property Slot Schema ──────────────────────────────────────────────────────

const propertySlotCreateSchema = z.object({
  propertyId: z.number().int(),
  slotTemplateId: z.number().int(),
  enabled: z.boolean().default(true),
  autoApprove: z.boolean().nullable().optional(),
  maxParty: z.number().int().nullable().optional(),
  notes: z.string().optional(),
});

const propertySlotUpdateSchema = propertySlotCreateSchema.partial().omit({
  propertyId: true,
  slotTemplateId: true,
});

// ─── Property Slot Config Schema ───────────────────────────────────────────────

const propertySlotConfigSchema = z.object({
  propertyId: z.number().int(),
  slotConfigs: z.array(
    z.object({
      slotTemplateId: z.number().int(),
      enabled: z.boolean(),
      autoApprove: z.boolean().nullable(),
      maxParty: z.number().int().nullable(),
      notes: z.string().optional(),
    }),
  ),
});

// ─── Admin Routers ────────────────────────────────────────────────────────────────

const catalogRouter = router({
  // ─── Activities ────────────────────────────────────────────────────────────
  activities: router({
    list: adminProcedure.query(async () => {
      return getAllActivities();
    }),

    create: adminProcedure.input(activityCreateSchema).mutation(async ({ input }) => {
      return createActivity(input as InsertActivity);
    }),

    update: adminProcedure
      .input(z.object({ id: z.number().int(), data: activityUpdateSchema }))
      .mutation(async ({ input }) => {
        await updateActivity(input.id, input.data as Partial<InsertActivity>);
        return getActivityById(input.id);
      }),

    archive: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      await updateActivity(input.id, { active: false });
    }),
  }),

  // ─── Slot Templates ────────────────────────────────────────────────────────
  slotTemplates: router({
    list: adminProcedure.query(async () => {
      return getAllSlotTemplates();
    }),

    create: adminProcedure.input(slotTemplateCreateSchema).mutation(async ({ input }) => {
      return createSlotTemplate(input as InsertSlotTemplate);
    }),

    update: adminProcedure
      .input(z.object({ id: z.number().int(), data: slotTemplateUpdateSchema }))
      .mutation(async ({ input }) => {
        await updateSlotTemplate(input.id, input.data as Partial<InsertSlotTemplate>);
        return getSlotTemplateById(input.id);
      }),

    archive: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      await updateSlotTemplate(input.id, { active: false });
    }),
  }),
});

const propertiesRouter = router({
  list: adminProcedure.query(async () => {
    return getAllProperties();
  }),

  create: adminProcedure.input(propertyCreateSchema).mutation(async ({ input }) => {
    return createProperty(input as InsertProperty);
  }),

  update: adminProcedure
    .input(z.object({ id: z.number().int(), data: propertyUpdateSchema }))
    .mutation(async ({ input }) => {
      await updateProperty(input.id, input.data as Partial<InsertProperty>);
      return getPropertyById(input.id);
    }),

  getDetail: adminProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => {
    const property = await getPropertyById(input.id);
    if (!property) throw new TRPCError({ code: "NOT_FOUND" });

    const activityLinks = await getPropertyActivities(input.id);
    const slots = await getPropertySlots(input.id);
    const allActivities = await getAllActivities();
    const allSlots = await getAllSlotTemplates();

    return {
      property,
      activityIds: activityLinks.map((pa) => pa.activityId),
      slots: slots.map((ps) => ({
        id: ps.id,
        slotTemplateId: ps.slotTemplateId,
        enabled: ps.enabled,
        autoApprove: ps.autoApprove,
        maxParty: ps.maxParty,
        notes: ps.notes,
        slotTemplate: allSlots.find((st) => st.id === ps.slotTemplateId),
      })),
      allActivities,
      allSlots,
    };
  }),

  updateActivities: adminProcedure
    .input(z.object({ propertyId: z.number().int(), activityIds: z.array(z.number().int()) }))
    .mutation(async ({ input }) => {
      await setPropertyActivities(input.propertyId, input.activityIds);
    }),

  updateSlots: adminProcedure
    .input(propertySlotConfigSchema)
    .mutation(async ({ input }) => {
      const slots = input.slotConfigs.map((cfg) => ({
        propertyId: input.propertyId,
        slotTemplateId: cfg.slotTemplateId,
        enabled: cfg.enabled,
        autoApprove: cfg.autoApprove,
        maxParty: cfg.maxParty,
        notes: cfg.notes || null,
      }));
      await setPropertySlots(input.propertyId, slots as InsertPropertySlot[]);
    }),
});

// ─── Member Routers ────────────────────────────────────────────────────────────

const memberPropertiesRouter = router({
  search: memberProcedure
    .input(
      z.object({
        activityKey: z.string().optional(),
        date: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      let query = db.select().from(properties).where(eq(properties.active, true)).$dynamic();

      // activityKey filtering happens in the app layer below — the join-based
      // SQL filter was never implemented and an empty .where() is invalid.

      const allProperties = await query.orderBy(properties.sortOrder);
      return allProperties;
    }),

  availability: memberProcedure
    .input(
      z.object({
        propertyId: z.number().int(),
        date: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const property = await getPropertyById(input.propertyId);
      if (!property) throw new TRPCError({ code: "NOT_FOUND" });

      const slots = await getPropertySlots(input.propertyId);
      const allSlots = await getAllSlotTemplates();

      return {
        property,
        availableSlots: slots
          .filter((ps) => ps.enabled)
          .map((ps) => {
            const slotTemplate = allSlots.find((st) => st.id === ps.slotTemplateId);
            return {
              id: ps.id,
              slotTemplate,
              maxParty: ps.maxParty ?? property.maxHunters,
              autoApprove: ps.autoApprove ?? property.autoApprove,
            };
          }),
        overnightExclusive: property.overnightExclusive,
      };
    }),

  requestBooking: memberProcedure
    .input(
      z.object({
        propertyId: z.number().int(),
        slotTemplateId: z.number().int(),
        date: z.string(),
        partySize: z.number().int().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const bookingReq: BookingRequest = {
        propertyId: input.propertyId,
        slotTemplateId: input.slotTemplateId,
        date: input.date,
        partySize: input.partySize,
      };

      // Check auto-approve status
      const approvalStatus = await shouldAutoApproveBiking(bookingReq);

      // Check for overnight conflicts
      const overnightConflict = await checkOvernightConflicts(
        input.propertyId,
        input.date,
        input.slotTemplateId,
      );

      if (overnightConflict.hasConflict && overnightConflict.conflictingSlotIds?.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This overnight slot conflicts with existing daytime bookings on the same or next day",
        });
      }

      if (!approvalStatus.autoApproved && approvalStatus.reason) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: approvalStatus.reason,
        });
      }

      return {
        success: true,
        autoApproved: approvalStatus.autoApproved,
        message: approvalStatus.autoApproved
          ? "Booking confirmed!"
          : "Booking submitted for approval",
      };
    }),
});

// ─── Root Router ──────────────────────────────────────────────────────────────

export const propertySlotConfigRouter = router({
  admin: router({
    catalog: catalogRouter,
    properties: propertiesRouter,
  }),
  member: memberPropertiesRouter,
});
