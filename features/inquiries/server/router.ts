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
        wedding:    "wedding",
        corporate:  "corporate",
        tour:       "other",
        general:    "other",
        membership: "other",
        lodging:    "other",
        event:      "corporate",
      };
      const businessLine = businessLineMap[input.type] ?? "other";

      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // ── Transactional writes ─────────────────────────────────────────────
      // Both inserts must succeed or neither persists.  Without a transaction,
      // a failure on the reservationRequests insert would leave an orphan leads
      // row with no matching request, corrupting the sales pipeline.
      const { leadId, reservationRequestId } = await database.transaction(async (tx) => {
        // 1. Create a Lead in the sales pipeline.
        const [leadResult] = await tx.insert(leads).values({
          source: "website_form",
          businessLine: businessLine as "wedding" | "corporate" | "member_stay" | "hunt" | "fish" | "hunt_and_fish" | "membership" | "other",
          contactName: input.name,
          contactEmail: input.email,
          contactPhone: input.phone ?? undefined,
          estimatedGuestCount: input.guestCount ?? undefined,
          notes: input.message ?? undefined,
          status: "new",
        });
        const leadId = Number((leadResult as { insertId?: number }).insertId ?? 0);

        // 2. For wedding / corporate inquiries with a date, also create a
        //    ReservationRequest so staff can track it through the booking flow.
        let reservationRequestId: number | undefined;
        if ((input.type === "wedding" || input.type === "corporate") && input.eventDate) {
          const today = new Date();
          const requestedStart =
            new Date(input.eventDate) ||
            new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
          const requestedEnd = new Date(
            requestedStart.getTime() +
              (input.type === "wedding" ? 2 : 3) * 24 * 60 * 60 * 1000,
          );
          const [rrResult] = await tx.insert(reservationRequests).values({
            source: "public_form",
            businessLine: businessLine as "wedding" | "corporate" | "member_stay" | "hunt" | "fish" | "hunt_and_fish" | "other",
            contactName: input.name,
            contactEmail: input.email,
            contactPhone: input.phone ?? undefined,
            requestedStart,
            requestedEnd,
            guestCount: input.guestCount ?? undefined,
            specialRequests: input.message ?? undefined,
            eventType: input.type,
            status: "new",
          });
          reservationRequestId = Number(
            (rrResult as { insertId?: number }).insertId ?? 0,
          );
        }

        return { leadId, reservationRequestId };
      });

      // ── Notification (best-effort) ────────────────────────────────────────
      // The data is already committed above.  A notification failure (network
      // timeout, misconfigured webhook, etc.) must NOT roll back the lead or
      // unblock the user — they already submitted successfully.  We log and
      // continue so ops can investigate without requiring the visitor to retry.
      try {
        await notifyOwner({
          title: `New ${input.type} inquiry from ${input.name}`,
          content: `Email: ${input.email}\nPhone: ${input.phone ?? "—"}\nDate: ${input.eventDate ?? "—"}\nGuests: ${input.guestCount ?? "—"}\n\n${input.message ?? ""}\n\nLead created in sales pipeline.`,
        });
      } catch (err) {
        console.error("[inquiries.submit] notifyOwner failed (non-fatal):", err);
      }

      return { success: true, leadId, reservationRequestId };
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
