// Legacy waivers router — extracted from server/routers.ts (waiversRouter).
// Contains the original sign + list procedures backed by the simple waivers
// table.  The combined router in router.ts merges this with any new procedures.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../_core/server/trpc";
import * as dal from "./dal";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const legacyWaiversRouter = router({
  list: adminProcedure.query(async () => {
    return dal.getAllWaivers();
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
      await dal.createWaiver({
        userId: ctx.user.id,
        signerName: input.signerName,
        signerEmail: ctx.user.email ?? undefined,
        waiverType: input.waiverType,
        content: input.content,
      });
      return { success: true };
    }),
});
