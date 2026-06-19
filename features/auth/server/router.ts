import { publicProcedure, router } from "../../_core/server/trpc";

export const authRouter = router({
  /** Returns the currently authenticated DB user, or null for public requests. */
  me: publicProcedure.query((opts) => opts.ctx.user),

  /**
   * No-op — sign-out is handled on the frontend by Clerk's signOut().
   * Kept for API compatibility so existing callers don't error.
   */
  logout: publicProcedure.mutation(() => ({ success: true } as const)),
});
