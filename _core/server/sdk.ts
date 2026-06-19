import { ForbiddenError } from "@shared/errors";
import { getAuth, clerkClient } from "@clerk/express";
import type { Request } from "express";
import type { User } from "../db/schema";
import * as db from "./db";
import { ENV } from "./env";

class SDKServer {
  async authenticateRequest(req: Request): Promise<User> {
    const { userId } = getAuth(req);

    if (!userId) {
      throw ForbiddenError("Not authenticated");
    }

    const signedInAt = new Date();
    let user = await db.getUserByOpenId(userId);

    if (!user) {
      // First sign-in: fetch Clerk user details and create the DB record.
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        const primaryEmail = clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId,
        );
        const name = [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean)
          .join(" ") || null;
        await db.upsertUser({
          openId: userId,
          name,
          email: primaryEmail?.emailAddress ?? null,
          loginMethod: clerkUser.externalAccounts[0]?.provider ?? "email",
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(userId);
      } catch (error) {
        console.error("[Auth] Failed to sync Clerk user to DB:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    // Grant owner role to the configured owner account (first time only).
    if (user.openId === ENV.ownerOpenId && user.role !== "admin") {
      await db.upsertUser({ openId: user.openId, role: "admin" });
      user = await db.getUserByOpenId(userId) ?? user;
    }

    await db.upsertUser({ openId: user.openId, lastSignedIn: signedInAt });

    return user;
  }
}

export const sdk = new SDKServer();
