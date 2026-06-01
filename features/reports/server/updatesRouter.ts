import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import * as db from "../../_core/server/db";

// ─── Seasonal Updates Router ──────────────────────────────────────────────────
// Extracted from server/routers.ts (updatesRouter inline code)

// Re-use adminProcedure pattern inline — gate via role check
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const updatesRouter = router({
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
