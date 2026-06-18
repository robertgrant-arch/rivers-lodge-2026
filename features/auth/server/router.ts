import type { Request, Response } from "express";
import { COOKIE_NAME } from '@shared/constants';
import { getSessionCookieOptions } from "./cookies";
import { publicProcedure, router } from "../../_core/server/trpc";

/**
 * Clear the member session cookie.  Called by the tRPC logout mutation and
 * exported so integration tests can invoke the behaviour directly.
 */
export function logoutMember(_req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(), maxAge: -1 });
}

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    logoutMember(ctx.req, ctx.res);
    return { success: true } as const;
  }),
});
