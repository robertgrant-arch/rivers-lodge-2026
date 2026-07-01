import { parse as parseCookies } from "cookie";
import type { Request } from "express";
import type { User } from "../db/schema";
import { getUserById, getDbSession } from "./db";

class SDKServer {
  async authenticateRequest(req: Request): Promise<User> {
    const cookieHeader = req.headers.cookie ?? "";
    const cookies = parseCookies(cookieHeader);
    const sessionId = cookies["rl_session"];

    if (!sessionId) {
      throw new Error("No session cookie");
    }

    const session = await getDbSession(sessionId);
    if (!session) {
      throw new Error("Session not found or expired");
    }

    const user = await getUserById(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.status === "disabled") {
      throw new Error("Account disabled");
    }

    return user;
  }
}

export const sdk = new SDKServer();
