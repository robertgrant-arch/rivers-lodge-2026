/**
 * Ops API access — every ops-portal and membership-management procedure must
 * refuse non-admins on the SERVER, not just in the /ops UI.
 *
 * Member logins carry the "employee" role, so "employee" must not be enough.
 * The test walks the router, so a procedure added later with a weaker guard
 * fails here.
 */
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "@core/server/context";

// No real DB: any query would hang/throw. Refusals happen before the DB.
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: vi.fn(() => ({})) }));

import { appRouter } from "../../../_core/server/router";

/** Public by design (waiver signing by emailed token). */
const PUBLIC = new Set(["portal.waivers.getByToken", "portal.waivers.sign"]);
/** Own guard (admin, or employee with an active employees row) — tested in memberFile tests. */
const OWN_GUARD_PREFIX = "portal.memberFile.";
/** Membership-management procedures (the rest of membership.* is member-facing or public). */
const MEMBERSHIP_ADMIN = [
  "membership.updateApplicationStatus", "membership.createMember", "membership.updateMember",
  "membership.applications", "membership.stats", "membership.members", "membership.searchUsers",
  "membership.memberSkillGroups", "membership.memberAssignments",
];

function ctx(role: "admin" | "employee" | null): TrpcContext {
  return {
    user: role
      ? ({ id: `u-${role}`, email: `${role}@test.invalid`, role, status: "active", mustChangePassword: false } as any)
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}

const procedures = Object.keys((appRouter as any)._def.procedures as Record<string, unknown>);
const opsPaths = procedures.filter((p) => p.startsWith("portal.") && !PUBLIC.has(p) && !p.startsWith(OWN_GUARD_PREFIX));
const guarded = [...opsPaths, ...MEMBERSHIP_ADMIN, "messages.markRead"];

async function call(path: string, role: "admin" | "employee" | null): Promise<string> {
  const caller: any = appRouter.createCaller(ctx(role));
  const fn = path.split(".").reduce((o, k) => o?.[k], caller);
  try {
    await fn(undefined);
    return "OK";
  } catch (e: any) {
    return e?.code ?? "ERROR";
  }
}

describe("ops API is admin-only", () => {
  it("covers the whole ops router", () => {
    expect(opsPaths.length).toBeGreaterThan(80);
    for (const p of MEMBERSHIP_ADMIN) expect(procedures).toContain(p);
  });

  it.each(guarded)("%s refuses a member login (employee role)", async (path) => {
    expect(await call(path, "employee")).toBe("FORBIDDEN");
  });

  it.each(guarded)("%s refuses signed-out callers", async (path) => {
    expect(["UNAUTHORIZED", "FORBIDDEN"]).toContain(await call(path, null));
  });

  it("admins get past the guard (fail later on missing input, not on permission)", async () => {
    for (const path of ["portal.weddings.list", "portal.membership.updateMember", "membership.updateMember", "portal.calendar.blockDates"]) {
      expect(await call(path, "admin")).not.toBe("FORBIDDEN");
    }
  });
});
