import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import { notifyOwner } from "../../_core/server/notification";
import { getDb } from "../../_core/server/db";
import { leads, reservationRequests } from '@core/db/booking-schema';
import * as dal from "./dal";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// ─── Inquiries Router ─────────────────────────────────────────────────────────
export const inquiriesRouter = router({
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
      await dal.createInquiry(input);
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
    return dal.getAllInquiries();
  }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["new", "contacted", "booked", "closed"]) }))
    .mutation(async ({ input }) => {
      await dal.updateInquiryStatus(input.id, input.status);
      return { success: true };
    }),
});
