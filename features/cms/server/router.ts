import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import * as db from "./dal";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const cmsRouter = router({
  // Public read procedures
  getLodgingUnits: publicProcedure
    .input(z.object({
      forWeddings: z.boolean().optional(),
      forMembers: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getCmsLodgingUnits(input?.forWeddings, input?.forMembers);
    }),

  getLodgingUnit: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return db.getCmsLodgingUnitBySlug(input.slug);
    }),

  getEventSpaces: publicProcedure
    .input(z.object({
      division: z.enum(["weddings", "corporate", "both"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getCmsEventSpaces(input?.division);
    }),

  getEventSpace: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return db.getCmsEventSpaceBySlug(input.slug);
    }),

  getPackages: publicProcedure
    .input(z.object({
      division: z.enum(["weddings", "membership", "corporate"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getCmsPackages(input?.division);
    }),

  getGalleries: publicProcedure.query(async () => {
    return db.getCmsGalleries();
  }),

  getGalleryWithImages: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return db.getCmsGalleryWithImages(input.slug);
    }),

  getAllGalleriesWithImages: publicProcedure.query(async () => {
    return db.getAllGalleriesWithImages();
  }),

  getTestimonials: publicProcedure
    .input(z.object({
      division: z.enum(["weddings", "membership", "corporate", "general"]).optional(),
      featuredOnly: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getCmsTestimonials(input?.division, input?.featuredOnly);
    }),

  getFaqs: publicProcedure
    .input(z.object({
      division: z.enum(["weddings", "membership", "corporate", "general"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getCmsFaqs(input?.division);
    }),

  getAnnouncements: publicProcedure
    .input(z.object({
      audience: z.enum(["all", "members", "public"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getCmsAnnouncements(input?.audience);
    }),

  getSingleton: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      return db.getCmsSingleton(input.key);
    }),

  // Member-gated procedures
  getMemberContent: protectedProcedure
    .input(z.object({
      contentType: z.enum(["season_date", "hunt_report", "fish_report", "member_news", "policy_update"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getCmsMemberContent(input?.contentType);
    }),

  // Admin CRUD: Lodging Units
  adminGetLodgingUnits: adminProcedure.query(async () => {
    return db.getCmsLodgingUnits();
  }),

  adminUpdateLodgingUnit: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      shortDescription: z.string().optional(),
      longDescription: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
      heroImage: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCmsLodgingUnit(id, data as any);
      return { success: true };
    }),

  // Admin CRUD: Event Spaces
  adminGetEventSpaces: adminProcedure.query(async () => {
    return db.getCmsEventSpaces();
  }),

  adminUpdateEventSpace: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      shortDescription: z.string().optional(),
      longDescription: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
      heroImage: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCmsEventSpace(id, data as any);
      return { success: true };
    }),

  // Admin CRUD: Testimonials
  adminGetTestimonials: adminProcedure.query(async () => {
    return db.getCmsTestimonials();
  }),

  adminCreateTestimonial: adminProcedure
    .input(z.object({
      authorName: z.string().min(1),
      authorTitle: z.string().optional(),
      quote: z.string().min(1),
      rating: z.number().int().min(1).max(5).optional(),
      division: z.enum(["weddings", "membership", "corporate", "general"]).optional(),
      featured: z.boolean().optional(),
      sortOrder: z.number().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      await db.upsertCmsTestimonial(input as any);
      return { success: true };
    }),

  adminUpdateTestimonial: adminProcedure
    .input(z.object({
      id: z.number(),
      authorName: z.string().optional(),
      quote: z.string().optional(),
      featured: z.boolean().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCmsTestimonial(id, data as any);
      return { success: true };
    }),

  adminDeleteTestimonial: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCmsTestimonial(input.id);
      return { success: true };
    }),

  // Admin CRUD: FAQs
  adminGetFaqs: adminProcedure.query(async () => {
    return db.getCmsFaqs();
  }),

  adminCreateFaq: adminProcedure
    .input(z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
      division: z.enum(["weddings", "membership", "corporate", "general"]).optional(),
      sortOrder: z.number().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      await db.upsertCmsFaq(input as any);
      return { success: true };
    }),

  adminUpdateFaq: adminProcedure
    .input(z.object({
      id: z.number(),
      question: z.string().optional(),
      answer: z.string().optional(),
      sortOrder: z.number().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCmsFaq(id, data as any);
      return { success: true };
    }),

  adminDeleteFaq: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCmsFaq(input.id);
      return { success: true };
    }),

  // Admin CRUD: Announcements
  adminGetAnnouncements: adminProcedure.query(async () => {
    return db.getCmsAnnouncements();
  }),

  adminCreateAnnouncement: adminProcedure
    .input(z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      type: z.enum(["banner", "alert", "news"]).optional(),
      audience: z.enum(["public", "members", "all"]).optional(),
      ctaLabel: z.string().optional(),
      ctaUrl: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      await db.upsertCmsAnnouncement(input as any);
      return { success: true };
    }),

  adminUpdateAnnouncement: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      body: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
      audience: z.enum(["public", "members", "all"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCmsAnnouncement(id, data as any);
      return { success: true };
    }),

  adminDeleteAnnouncement: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCmsAnnouncement(input.id);
      return { success: true };
    }),

  // Admin CRUD: Member Content
  adminGetMemberContent: adminProcedure.query(async () => {
    return db.getCmsMemberContent();
  }),

  adminCreateMemberContent: adminProcedure
    .input(z.object({
      title: z.string().min(1),
      slug: z.string().min(1),
      contentType: z.enum(["season_date", "hunt_report", "fish_report", "member_news", "policy_update"]),
      body: z.string().min(1),
      season: z.string().optional(),
      species: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      tierAccess: z.enum(["all", "standard", "premier", "founding"]).optional(),
      featured: z.boolean().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      await db.upsertCmsMemberContent(input as any);
      return { success: true };
    }),

  adminUpdateMemberContent: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      body: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
      featured: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCmsMemberContent(id, data as any);
      return { success: true };
    }),

  adminDeleteMemberContent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCmsMemberContent(input.id);
      return { success: true };
    }),

  // Admin: Singletons
  adminGetSingletons: adminProcedure.query(async () => {
    return db.getAllCmsSingletons();
  }),

  adminUpdateSingleton: adminProcedure
    .input(z.object({
      key: z.string(),
      data: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.getCmsSingleton(input.key);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Singleton not found" });
      await db.upsertCmsSingleton({ key: input.key, label: existing.label, data: input.data, status: existing.status });
      return { success: true };
    }),
});
