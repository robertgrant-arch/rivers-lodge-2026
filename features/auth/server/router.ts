// Extracted from server/routers.ts — auth.me and auth.logout procedures
// TODO: Remove the inline auth router from server/routers.ts once this is wired up.

import { COOKIE_NAME } from '@shared/constants';
import { getSessionCookieOptions } from "./cookies";
import { publicProcedure, router } from "../../_core/server/trpc";

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});
