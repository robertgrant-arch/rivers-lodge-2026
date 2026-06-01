// Extracted from server/routers.ts — admin.users procedure
// TODO: Remove the inline adminRouter from server/routers.ts once this is wired up.

import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../_core/server/trpc";
import { getAllUsers } from "./dal";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const authAdminRouter = router({
  users: adminProcedure.query(async () => {
    return getAllUsers();
  }),
});
