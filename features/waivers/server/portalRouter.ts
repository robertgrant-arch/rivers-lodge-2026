// Portal waivers sub-router — extracted from server/portalRouter.ts (portal.waivers.*)
// Staff-facing waiver management: templates, sending, listing, and public signing flow.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import {
  waiverTemplates,
  portalWaivers,
} from "../../_core/db/portal-schema";
import { randomBytes } from "crypto";
import { generateAndStoreWaiverPdf } from "./waiverPdf";

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return drizzle(process.env.DATABASE_URL);
}

const STAFF_ROLES = ["owner", "admin", "venue_sales", "events_manager", "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance"] as const;
type StaffRole = typeof STAFF_ROLES[number];

const portalProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user.role as string;
  if (!STAFF_ROLES.includes(role as StaffRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Portal access requires a staff role" });
  }
  return next({ ctx });
});

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  }
  return next({ ctx });
});

export const waiversPortalRouter = router({
  templates: portalProcedure.query(async () => {
    const db = getDb();
    return db.select().from(waiverTemplates).where(eq(waiverTemplates.active, true));
  }),

  createTemplate: ownerProcedure
    .input(z.object({
      templateName: z.string(),
      templateType: z.enum(["general", "hunt", "fish", "sporting_clays", "event"]),
      bodyText: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(waiverTemplates).values(input as any);
      return { id: result.insertId };
    }),

  list: portalProcedure
    .input(z.object({
      status: z.string().optional(),
      linkedBookingType: z.string().optional(),
      linkedBookingId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.status) conditions.push(eq(portalWaivers.status, input.status as any));
      if (input.linkedBookingType) conditions.push(eq(portalWaivers.linkedBookingType, input.linkedBookingType));
      if (input.linkedBookingId) conditions.push(eq(portalWaivers.linkedBookingId, input.linkedBookingId));
      const query = conditions.length > 0
        ? db.select().from(portalWaivers).where(and(...conditions))
        : db.select().from(portalWaivers);
      return query.orderBy(desc(portalWaivers.createdAt)).limit(100);
    }),

  send: portalProcedure
    .input(z.object({
      templateId: z.number(),
      signatoryName: z.string(),
      signatoryEmail: z.string().email(),
      linkedBookingType: z.string().optional(),
      linkedBookingId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const token = randomBytes(32).toString("hex");
      const [result] = await db.insert(portalWaivers).values({
        templateId: input.templateId,
        signatoryName: input.signatoryName,
        signatoryEmail: input.signatoryEmail,
        linkedBookingType: input.linkedBookingType ?? null,
        linkedBookingId: input.linkedBookingId ?? null,
        status: "sent",
        signingToken: token,
        sentAt: new Date(),
      });
      return { id: result.insertId, signingToken: token, signingUrl: `/sign-waiver/${token}` };
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [waiver] = await db.select().from(portalWaivers).where(eq(portalWaivers.signingToken, input.token));
      if (!waiver) throw new TRPCError({ code: "NOT_FOUND", message: "Waiver not found or expired" });
      if (waiver.status === "signed") throw new TRPCError({ code: "BAD_REQUEST", message: "Waiver already signed" });
      const [template] = waiver.templateId
        ? await db.select().from(waiverTemplates).where(eq(waiverTemplates.id, waiver.templateId))
        : [null];
      return { waiver, template };
    }),

  sign: publicProcedure
    .input(z.object({
      token: z.string(),
      signatoryName: z.string(),
      ipAddress: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [waiver] = await db.select().from(portalWaivers).where(eq(portalWaivers.signingToken, input.token));
      if (!waiver) throw new TRPCError({ code: "NOT_FOUND" });
      if (waiver.status === "signed") throw new TRPCError({ code: "BAD_REQUEST", message: "Already signed" });
      const signedAt = new Date();
      const [template] = waiver.templateId
        ? await db.select().from(waiverTemplates).where(eq(waiverTemplates.id, waiver.templateId))
        : [null];
      const waiverTitle = template?.templateName ?? "Liability Waiver & Release";
      const waiverContent = template?.bodyText ?? "By signing this document, you acknowledge and agree to the terms and conditions set forth by Rivers Lodge & Hunt Club. You understand and accept all risks associated with the activities at the property, including but not limited to hunting, fishing, equestrian activities, and use of all facilities. You release Rivers Lodge & Hunt Club, its owners, employees, and agents from any liability for injury, loss, or damage arising from your participation in any activities on the property.";
      let signedPdfKey: string | null = null;
      try {
        const { key } = await generateAndStoreWaiverPdf({
          waiverTitle,
          waiverContent,
          signatoryName: input.signatoryName,
          signatoryEmail: waiver.signatoryEmail ?? null,
          signedAt,
          ipAddress: input.ipAddress ?? null,
          waiverToken: input.token,
        });
        signedPdfKey = key;
      } catch (pdfErr) {
        console.error("[Waiver] PDF generation failed:", pdfErr);
      }
      await db.update(portalWaivers).set({
        status: "signed",
        signedAt,
        signatoryName: input.signatoryName,
        ipAddress: input.ipAddress ?? null,
        ...(signedPdfKey ? { signedPdfKey } : {}),
      }).where(eq(portalWaivers.signingToken, input.token));
      return { success: true, pdfKey: signedPdfKey };
    }),
});
