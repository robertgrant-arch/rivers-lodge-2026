import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hash, verify as argon2verify } from "argon2";
import { createHash } from "crypto";
import { publicProcedure, protectedProcedure, router } from "../../_core/server/trpc";
import { destroySession, createSession } from "./session";
import {
  getUserByEmail,
  getUserById,
  updateUser,
  getInviteByTokenHash,
  acceptInvite,
  getDbSession,
  deleteDbSession,
  getDb,
} from "@core/server/db";
import { sessions } from "@features/auth/schema";
import { eq } from "drizzle-orm";

const ARGON2_OPTIONS = { type: 2 } as const; // argon2id

// ─── Auth router ──────────────────────────────────────────────────────────────

export const authRouter = router({
  /** Returns the currently authenticated DB user, or null for public requests. */
  me: publicProcedure.query((opts) => opts.ctx.user),

  /** Email + password sign-in. Creates session, sets rl_session cookie. */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const INVALID = "Invalid email or password";

      const user = await getUserByEmail(input.email);

      // Always run a hash verify to prevent timing attacks (constant time)
      const sentinel = "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
      const hashToCheck = user?.passwordHash ?? sentinel;

      let valid = false;
      try {
        valid = await argon2verify(hashToCheck, input.password);
      } catch {
        valid = false;
      }

      if (!user || !valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: INVALID });
      }

      if (user.status === "disabled") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: INVALID });
      }

      if (user.status === "invited" || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: INVALID });
      }

      // Update last_login_at
      await updateUser(user.id, { lastLoginAt: new Date() });

      await createSession(user.id, ctx.res);

      return {
        success: true,
        mustChangePassword: user.mustChangePassword,
      };
    }),

  /** Clears the server-side session and removes the session cookie. */
  logout: publicProcedure.mutation(async (opts) => {
    await destroySession(opts.ctx.req, opts.ctx.res);
    return { success: true } as const;
  }),

  /** Accept an invite token. Sets password and activates the account. */
  acceptInvite: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        password: z.string().min(12),
        confirmPassword: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.password !== input.confirmPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Passwords do not match" });
      }

      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const invite = await getInviteByTokenHash(tokenHash);

      if (!invite || invite.acceptedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This invitation link is invalid or has already been used",
        });
      }

      const user = await getUserById(invite.userId);
      if (!user || user.status === "disabled") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
      }

      const passwordHash = await hash(input.password, ARGON2_OPTIONS);

      await updateUser(user.id, {
        passwordHash,
        status: "active",
        mustChangePassword: false,
        lastLoginAt: new Date(),
      });

      await acceptInvite(invite.id);
      await createSession(user.id, ctx.res);

      return { success: true };
    }),

  /** Change password. Requires auth. Invalidates all other sessions. */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(12),
        confirmPassword: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Passwords do not match" });
      }

      const user = await getUserById(ctx.user.id);
      if (!user?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No password set on this account" });
      }

      const valid = await argon2verify(user.passwordHash, input.currentPassword);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
      }

      const passwordHash = await hash(input.newPassword, ARGON2_OPTIONS);
      await updateUser(user.id, {
        passwordHash,
        mustChangePassword: false,
      });

      // Invalidate all other sessions
      const db = await getDb();
      if (db) {
        await db.delete(sessions).where(eq(sessions.userId, user.id));
      }

      // Create a fresh session for this request
      await createSession(user.id, ctx.res);

      return { success: true };
    }),
});
