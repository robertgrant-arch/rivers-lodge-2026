import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../_core/server/trpc";
import { notifyOwner } from "../../_core/server/notification";
import * as dal from "./dal";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// ─── Messages (Concierge) Router ──────────────────────────────────────────────
export const messagesRouter = router({
  myMessages: protectedProcedure.query(async ({ ctx }) => {
    return dal.getMessagesForUser(ctx.user.id);
  }),

  allMessages: adminProcedure
    .input(z.object({ archived: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      return dal.getAllMessages(input?.archived ?? false);
    }),

  archive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await dal.archiveMessage(input.id);
      return { success: true };
    }),

  unarchive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await dal.unarchiveMessage(input.id);
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
      await dal.createMessage({
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
      await dal.createMessage({
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
      await dal.markMessageRead(input.id);
      return { success: true };
    }),
});
