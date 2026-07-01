import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, lt } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import { notifyOwner } from "../../_core/server/notification";
import { getDb } from "../../_core/server/db";
import { verifyCaptcha } from "@core/server/captcha";
import { leads, reservationRequests } from '@core/db/booking-schema';
import { inquiries } from '@core/db/schema';
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
        captchaToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await verifyCaptcha(input.captchaToken);
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
        }).returning({ id: leads.id });
        const leadId = leadResult.id;

        // 2. For wedding / corporate inquiries with a date, also create a
        //    ReservationRequest so staff can track it through the booking flow.
        let reservationRequestId: number | undefined;
        if ((input.type === "wedding" || input.type === "corporate") && input.eventDate) {
          const startDate = new Date(input.eventDate);
          const endDate = new Date(
            startDate.getTime() +
              (input.type === "wedding" ? 2 : 3) * 24 * 60 * 60 * 1000,
          );
          const toDateStr = (d: Date) => d.toISOString().split("T")[0];
          const [rrResult] = await tx.insert(reservationRequests).values({
            source: "public_form",
            businessLine: businessLine as "wedding" | "corporate" | "member_stay" | "hunt" | "fish" | "hunt_and_fish" | "other",
            contactName: input.name,
            contactEmail: input.email,
            contactPhone: input.phone ?? undefined,
            requestedStart: toDateStr(startDate),
            requestedEnd: toDateStr(endDate),
            guestCount: input.guestCount ?? undefined,
            specialRequests: input.message ?? undefined,
            eventType: input.type,
            status: "new",
          }).returning({ id: reservationRequests.id });
          reservationRequestId = rrResult.id;
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

  list: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(25),
        cursor: z.number().int().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], nextCursor: null };
      const limit = input.limit;
      const conditions = [];
      if (input.cursor !== undefined) {
        conditions.push(lt(inquiries.id, input.cursor));
      }
      const rows = await db
        .select()
        .from(inquiries)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(inquiries.id))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;
      return { items, nextCursor };
    }),

  // for CSV
  export: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(inquiries)
      .orderBy(desc(inquiries.id));
  }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["new", "contacted", "booked", "closed"]) }))
    .mutation(async ({ input }) => {
      await dal.updateInquiryStatus(input.id, input.status);
      return { success: true };
    }),
});
