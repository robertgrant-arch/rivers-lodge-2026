import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import * as db from "./db";

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
        type: z.enum(["wedding", "corporate", "tour", "general"]),
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
      await notifyOwner({
        title: `New ${input.type} inquiry from ${input.name}`,
        content: `Email: ${input.email}\nPhone: ${input.phone ?? "—"}\nDate: ${input.eventDate ?? "—"}\nGuests: ${input.guestCount ?? "—"}\n\n${input.message ?? ""}`,
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

  allMessages: adminProcedure.query(async () => {
    return db.getAllMessages();
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
});

export type AppRouter = typeof appRouter;
