import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../db/schema";
import { getCurrentUser } from "@features/auth/server/session";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const user = await getCurrentUser(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
