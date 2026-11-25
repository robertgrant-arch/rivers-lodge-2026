import { describe, expect, it } from "vitest";
import { router, protectedProcedure, adminProcedure, publicProcedure, PASSWORD_CHANGE_REQUIRED_MSG } from "./trpc";

const app = router({
  auth: router({
    me: publicProcedure.query(() => "me"),
    changePassword: protectedProcedure.mutation(() => "changed"),
    logout: publicProcedure.mutation(() => "out"),
  }),
  portal: router({ data: protectedProcedure.query(() => "data") }),
  ops: router({ users: adminProcedure.query(() => "users") }),
});

const caller = (user: any) => app.createCaller({ user, req: {} as any, res: {} as any } as any);

describe("forced password change (server)", () => {
  const temp = { id: "u1", role: "admin", mustChangePassword: true };
  it("blocks every signed-in call except changing the password", async () => {
    await expect(caller(temp).portal.data()).rejects.toThrow(PASSWORD_CHANGE_REQUIRED_MSG);
    await expect(caller(temp).ops.users()).rejects.toThrow(PASSWORD_CHANGE_REQUIRED_MSG);
    await expect(caller({ ...temp, role: "employee" }).portal.data()).rejects.toThrow(PASSWORD_CHANGE_REQUIRED_MSG);
    expect(await caller(temp).auth.changePassword()).toBe("changed");
    expect(await caller(temp).auth.me()).toBe("me");
    expect(await caller(temp).auth.logout()).toBe("out");
  });
  it("lets accounts that have changed their password through", async () => {
    const ok = { id: "u1", role: "admin", mustChangePassword: false };
    expect(await caller(ok).portal.data()).toBe("data");
    expect(await caller(ok).ops.users()).toBe("users");
  });
});
