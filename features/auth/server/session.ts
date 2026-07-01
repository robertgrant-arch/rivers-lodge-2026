import { parse as parseCookies } from "cookie";
import type { Request, Response } from "express";
import type { User } from "@features/auth/schema";
import { getUserById, getDbSession, createDbSession, deleteDbSession } from "@core/server/db";
import { protectedProcedure } from "@core/server/trpc";

const COOKIE_NAME = "rl_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string, res: Response): Promise<void> {
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
  const sessionId = await createDbSession(userId, expiresAt);

  const cookieOptions = [
    `${COOKIE_NAME}=${sessionId}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expiresAt.toUTCString()}`,
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ].filter(Boolean).join("; ");

  res.setHeader("Set-Cookie", cookieOptions);
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const cookieHeader = req.headers.cookie ?? "";
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies[COOKIE_NAME];

  if (sessionId) {
    await deleteDbSession(sessionId);
  }

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  );
}

export async function getCurrentUser(req: Request): Promise<User | null> {
  const cookieHeader = req.headers.cookie ?? "";
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies[COOKIE_NAME];

  if (!sessionId) return null;

  const session = await getDbSession(sessionId);
  if (!session) return null;

  const user = await getUserById(session.userId);
  if (!user || user.status === "disabled") return null;

  return user;
}

export { protectedProcedure as requireMemberSession };
