import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/constants';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * While an account must change its (temporary or reset) password, the only
 * signed-in calls allowed are changing the password and signing out. Applies
 * to protectedProcedure and adminProcedure so the wall can't be bypassed by
 * calling the API directly.
 */
export const PASSWORD_CHANGE_ALLOWED_PATHS = new Set(["auth.changePassword", "auth.logout"]);
export const PASSWORD_CHANGE_REQUIRED_MSG = "You need to change your temporary password before continuing.";
function assertPasswordChanged(user: { mustChangePassword?: boolean | null }, path: string) {
  if (user.mustChangePassword && !PASSWORD_CHANGE_ALLOWED_PATHS.has(path)) {
    throw new TRPCError({ code: "FORBIDDEN", message: PASSWORD_CHANGE_REQUIRED_MSG });
  }
}

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  assertPasswordChanged(ctx.user, opts.path);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// requireActiveUser — like requireUser but also blocks sessions where
// must_change_password=true. Used by member-facing procedures so the
// forced-password-change wall cannot be bypassed by calling tRPC directly.
const requireActiveUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  if (ctx.user.mustChangePassword) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Password change required before accessing this resource",
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);
// memberProcedure — enforces active session AND completed password change
export const memberProcedure = t.procedure.use(requireActiveUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    assertPasswordChanged(ctx.user, opts.path);

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
