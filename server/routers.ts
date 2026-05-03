import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import * as db from "./db";
import { portalRouter } from "./portalRouter";
import { bookingRouter } from "./bookingRouter";
import { tripsRouter } from "./tripsRouter";
import { propertyBookingRouter } from "./propertyBookingRouter";
import { getDb } from "./db";
import { leads, reservationRequests } from "../drizzle/booking-schema";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// ─── Member guard ─────────────────────────────────────────────────────────────
const memberProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const member = await db.getMemberByUserId(ctx.user.id);
  if (!member || !member.active) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Active membership required" });
  }
  return next({ ctx: { ...ctx, member } });
});

// ─── Inquiries ────────────────────────────────────────────────────────────────
const inquiriesRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        type: z.enum(["wedding", "corporate", "tour", "general", "membership", "lodging", "event"]),
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        eventDate: z.string().optional(),
        guestCount: z.number().int().positive().optional(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.createInquiry(input);
      // Map inquiry type to booking system business line
      const businessLineMap: Record<string, string> = {
        wedding: "wedding",
        corporate: "corporate",
        tour: "other",
        general: "other",
        membership: "other",
        lodging: "other",
        event: "corporate",
      };
      const businessLine = businessLineMap[input.type] ?? "other";
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Create a Lead in the sales pipeline
      const [leadResult] = await database.insert(leads).values({
        source: "website_form",
        businessLine: businessLine as "wedding" | "corporate" | "member_stay" | "hunt" | "fish" | "hunt_and_fish" | "membership" | "other",
        contactName: input.name,
        contactEmail: input.email,
        contactPhone: input.phone ?? undefined,
        estimatedGuestCount: input.guestCount ?? undefined,
        notes: input.message ?? undefined,
        status: "new",
      });
      // For wedding and corporate inquiries, also create a ReservationRequest
      if ((input.type === "wedding" || input.type === "corporate") && input.eventDate) {
        const today = new Date();
        const requestedStart = new Date(input.eventDate) || new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
        const requestedEnd = new Date(requestedStart.getTime() + (input.type === "wedding" ? 2 : 3) * 24 * 60 * 60 * 1000);
        await database.insert(reservationRequests).values({
          source: "public_form",
          businessLine: businessLine as "wedding" | "corporate" | "member_stay" | "hunt" | "fish" | "hunt_and_fish" | "other",
          contactName: input.name,
          contactEmail: input.email,
          contactPhone: input.phone ?? undefined,
          requestedStart: requestedStart,
          requestedEnd: requestedEnd,
          guestCount: input.guestCount ?? undefined,
          specialRequests: input.message ?? undefined,
          eventType: input.type,
          status: "new",
        });
      }
      await notifyOwner({
        title: `New ${input.type} inquiry from ${input.name}`,
        content: `Email: ${input.email}\nPhone: ${input.phone ?? "—"}\nDate: ${input.eventDate ?? "—"}\nGuests: ${input.guestCount ?? "—"}\n\n${input.message ?? ""}\n\nLead created in sales pipeline.`,
      });
      return { success: true };
    }),

  list: adminProcedure.query(async () => {
    return db.getAllInquiries();
  }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["new", "contacted", "booked", "closed"]) }))
    .mutation(async ({ input }) => {
      await db.updateInquiryStatus(input.id, input.status);
      return { success: true };
    }),
});

// ─── Membership Applications ──────────────────────────────────────────────────
const membershipRouter = router({
  submitApplication: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        interests: z.string().optional(),
        referral: z.string().optional(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.createMembershipApplication(input);
      await notifyOwner({
        title: `New membership application from ${input.name}`,
        content: `Email: ${input.email}\nPhone: ${input.phone ?? "—"}\nCity: ${input.city ?? "—"}, ${input.state ?? "—"}\nInterests: ${input.interests ?? "—"}\nReferral: ${input.referral ?? "—"}\n\n${input.message ?? ""}`,
      });
      return { success: true };
    }),

  listApplications: adminProcedure.query(async () => {
    return db.getAllMembershipApplications();
  }),

  updateApplicationStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["pending", "approved", "declined"]) }))
    .mutation(async ({ input }) => {
      await db.updateApplicationStatus(input.id, input.status);
      return { success: true };
    }),

  listMembers: adminProcedure.query(async () => {
    return db.getAllMembers();
  }),

  createMember: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        memberNumber: z.string().optional(),
        tier: z.enum(["standard", "premier", "founding"]).optional(),
        joinDate: z.string().optional(),
        renewalDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.createMember(input as any);
      return { success: true };
    }),

  updateMember: adminProcedure
    .input(
      z.object({
        id: z.number(),
        tier: z.enum(["standard", "premier", "founding"]).optional(),
        active: z.boolean().optional(),
        notes: z.string().optional(),
        renewalDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.updateMember(id, data as any);
      return { success: true };
    }),

  myStatus: protectedProcedure.query(async ({ ctx }) => {
    return db.getMemberByUserId(ctx.user.id);
  }),
  // Admin-only: ensure the calling user has a member record so they can preview the member portal.
  // Creates a "Founding" member record automatically if one doesn't exist.
  ensureMemberForPreview: adminProcedure.mutation(async ({ ctx }) => {
    const existing = await db.getMemberByUserId(ctx.user.id);
    if (existing) return { member: existing, created: false };
    // Auto-generate member number RL-YYYY-PREVIEW
    const year = new Date().getFullYear();
    const memberNumber = `RL-${year}-PREVIEW`;
    await db.createMember({
      userId: ctx.user.id,
      memberNumber,
      tier: "founding",
      active: true,
      joinDate: new Date().toISOString().split("T")[0],
    } as any);
    const created = await db.getMemberByUserId(ctx.user.id);
    return { member: created, created: true };
  }),
});

// ─── Bookings ─────────────────────────────────────────────────────────────────
const bookingsRouter = router({
  list: adminProcedure.query(async () => {
    return db.getAllBookings();
  }),

  create: adminProcedure
    .input(
      z.object({
        type: z.enum(["wedding", "corporate", "member_stay", "hunt_fish"]),
        clientName: z.string().min(1),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().optional(),
        startDate: z.string(),
        endDate: z.string(),
        spaces: z.string().optional(),
        guestCount: z.number().int().positive().optional(),
        totalRevenue: z.string().optional(),
        depositPaid: z.boolean().optional(),
        status: z.enum(["inquiry", "confirmed", "completed", "cancelled"]).optional(),
        notes: z.string().optional(),
        userId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.createBooking(input as any);
      return { success: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["inquiry", "confirmed", "completed", "cancelled"]).optional(),
        depositPaid: z.boolean().optional(),
        totalRevenue: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateBooking(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteBooking(input.id);
      return { success: true };
    }),

  blockedDates: publicProcedure.query(async () => {
    return db.getAllBlockedDates();
  }),

  addBlockedDate: adminProcedure
    .input(z.object({ date: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.createBlockedDate({ date: new Date(input.date), reason: input.reason });
      return { success: true };
    }),

  removeBlockedDate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteBlockedDate(input.id);
      return { success: true };
    }),
});

// ─── Seasonal Updates ─────────────────────────────────────────────────────────
const updatesRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllSeasonalUpdates();
  }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        category: z.enum(["whitetail", "waterfowl", "turkey", "fishing", "general"]),
      })
    )
    .mutation(async ({ input }) => {
      await db.createSeasonalUpdate(input);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteSeasonalUpdate(input.id);
      return { success: true };
    }),
});

// ─── Messages (Concierge) ─────────────────────────────────────────────────────
const messagesRouter = router({
  myMessages: protectedProcedure.query(async ({ ctx }) => {
    return db.getMessagesForUser(ctx.user.id);
  }),

  allMessages: adminProcedure
    .input(z.object({ archived: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      return db.getAllMessages(input?.archived ?? false);
    }),
  archive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.archiveMessage(input.id);
      return { success: true };
    }),
  unarchive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.unarchiveMessage(input.id);
      return { success: true };
    }),

  send: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.createMessage({
        fromUserId: ctx.user.id,
        subject: input.subject,
        body: input.body,
      });
      await notifyOwner({
        title: `New concierge message from ${ctx.user.name ?? ctx.user.email ?? "member"}`,
        content: input.body,
      });
      return { success: true };
    }),

  reply: adminProcedure
    .input(
      z.object({
        toUserId: z.number(),
        subject: z.string().optional(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.createMessage({
        fromUserId: ctx.user.id,
        toUserId: input.toUserId,
        subject: input.subject,
        body: input.body,
      });
      return { success: true };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.markMessageRead(input.id);
      return { success: true };
    }),
});

// ─── Waivers ──────────────────────────────────────────────────────────────────
const waiversRouter = router({
  list: adminProcedure.query(async () => {
    return db.getAllWaivers();
  }),

  sign: protectedProcedure
    .input(
      z.object({
        waiverType: z.enum(["general", "hunt", "fish", "sporting_clays"]),
        signerName: z.string().min(1),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.createWaiver({
        userId: ctx.user.id,
        signerName: input.signerName,
        signerEmail: ctx.user.email ?? undefined,
        waiverType: input.waiverType,
        content: input.content,
      });
      return { success: true };
    }),
});

// ─── CMS Router ─────────────────────────────────────────────────────────────
const cmsRouter = router({
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─── Admin: Users ─────────────────────────────────────────────────────────────
const adminRouter = router({
  users: adminProcedure.query(async () => {
    return db.getAllUsers();
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  inquiries: inquiriesRouter,
  membership: membershipRouter,
  bookings: bookingsRouter,
  updates: updatesRouter,
  messages: messagesRouter,
  waivers: waiversRouter,
  admin: adminRouter,
  cms: cmsRouter,
  portal: portalRouter,
  booking: bookingRouter,
  trips: tripsRouter,
  propertyBooking: propertyBookingRouter,
});

export type AppRouter = typeof appRouter;
