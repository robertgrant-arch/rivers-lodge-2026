/**
 * Both calendars read the calendar feed registry, not hard-coded queries:
 *   - portal.calendar.events     (Ops Calendar in /ops, admin only)
 *   - memberPortal.opsCalendar   (staff Ops Calendar in the portal)
 * A source registered later shows up on both with no other change.
 * Members never reach either.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "@core/server/context";

/** Any select chain resolves to [] (no slot inventory, no employee rows). */
const emptyDb = () => {
  const chain = (): any => {
    const p: any = Promise.resolve([]);
    for (const m of ["from", "where", "limit", "orderBy", "innerJoin", "leftJoin", "groupBy"]) p[m] = () => p;
    return p;
  };
  return { select: chain };
};

vi.mock("@core/server/db", async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, getPortalDb: () => emptyDb(), getDb: async () => emptyDb() };
});
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: vi.fn(() => ({})) }));

import { appRouter } from "../../../_core/server/router";
import { getCalendarSources, registerCalendarSource, type CalendarSource } from "@shared/calendarFeed";

function ctx(role: "admin" | "employee" | null): TrpcContext {
  return {
    user: role ? ({ id: `u-${role}`, email: `${role}@test.invalid`, role, status: "active", mustChangePassword: false } as any) : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}

const item = (kind: string, n: number, over: Record<string, unknown> = {}) => ({
  id: `${kind}-${n}`, kind, recordId: n, title: `${kind} ${n}`, startDate: "2026-11-10", endDate: "2026-11-10",
  allDay: true, status: "confirmed", href: `/ops/${kind}/${n}`, hiddenFromMembers: true, ...over,
});

const RANGE = { startDate: "2026-11-01", endDate: "2026-11-30" };
let saved: CalendarSource[] = [];

beforeAll(() => {
  saved = getCalendarSources();
  // Replace every registered source with a stub returning one item of its
  // kind (plus one cancelled and one undated item that must be dropped), and
  // register a brand-new kind to prove future types need no other change.
  for (const s of saved) {
    registerCalendarSource({ ...s, listInRange: async () => [
      item(s.kind, 1,
        s.kind === "hunting_group" ? { startDate: "2026-10-30", endDate: "2026-11-02", status: "inquiry" }
        : s.kind === "other_group" ? { startDate: "2026-11-28", endDate: "2026-12-01", status: "contract_out" }
        : {}),
      item(s.kind, 4, { status: "lost" }),
      item(s.kind, 2, { status: "cancelled" }),
      item(s.kind, 3, { startDate: null }),
    ] });
  }
  registerCalendarSource({ kind: "spa_day", label: "Spa Day", color: "#ABCDEF", listInRange: async () => [item("spa_day", 1)] });
});
afterAll(() => { for (const s of saved) registerCalendarSource(s); });

const EXPECTED_KINDS = ["ops_event", "member_event", "wedding", "corporate", "hunting_group", "other_group", "hunt_fish", "blocked", "spa_day"];

describe("portal.calendar.events", () => {
  it("returns one item per registered source (cancelled/undated dropped) and the source legend", async () => {
    const out = await (appRouter.createCaller(ctx("admin")) as any).portal.calendar.events(RANGE);
    expect(out.items.map((i: any) => i.kind).sort()).toEqual([...EXPECTED_KINDS].sort());
    expect(out.sources.map((s: any) => s.kind)).toEqual(EXPECTED_KINDS);
    expect(out.sources.find((s: any) => s.kind === "spa_day")).toEqual({ kind: "spa_day", label: "Spa Day", color: "#ABCDEF" });
    const hg = out.items.find((i: any) => i.kind === "hunting_group");
    expect(hg).toMatchObject({ startDate: "2026-10-30", endDate: "2026-11-02", tentative: true, href: "/ops/hunting_group/1" });
  });

  it("other groups: crosses the month end into December, tentative while unconfirmed, cancelled/lost dropped", async () => {
    const caller = appRouter.createCaller(ctx("admin")) as any;
    const nov = await caller.portal.calendar.events({ ...RANGE, types: ["other_group"] });
    expect(nov.items.map((i: any) => [i.id, i.startDate, i.endDate, i.tentative])).toEqual([["other_group-1", "2026-11-28", "2026-12-01", true]]);
    const dec = await caller.portal.calendar.events({ startDate: "2026-12-01", endDate: "2026-12-31", types: ["other_group"] });
    expect(dec.items.map((i: any) => i.id)).toEqual(["other_group-1"]);
    expect(nov.sources).toEqual([{ kind: "other_group", label: "Other Group", color: "#A68BB8" }]);
  });

  it("types filter limits the sources read", async () => {
    const out = await (appRouter.createCaller(ctx("admin")) as any).portal.calendar.events({ ...RANGE, types: ["wedding", "hunting_group"] });
    expect(out.items.map((i: any) => i.kind).sort()).toEqual(["hunting_group", "wedding"]);
  });

  it("member logins are refused", async () => {
    await expect((appRouter.createCaller(ctx("employee")) as any).portal.calendar.events(RANGE)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("memberPortal.opsCalendar", () => {
  it("staff (admin) get every registered source", async () => {
    const out = await (appRouter.createCaller(ctx("admin")) as any).memberPortal.opsCalendar(RANGE);
    expect(out.items.map((i: any) => i.kind).sort()).toEqual([...EXPECTED_KINDS].sort());
    expect(out.items.find((i: any) => i.kind === "wedding").title).toBe("wedding 1");
  });

  it("a member (no employee record) is refused — no event details", async () => {
    await expect((appRouter.createCaller(ctx("employee")) as any).memberPortal.opsCalendar(RANGE)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("memberPortal.unavailableDates (members' My Calendar)", () => {
  it("returns bare dates from availability sources — never titles", async () => {
    const out = await (appRouter.createCaller(ctx("admin")) as any).memberPortal.unavailableDates(RANGE);
    // Hunting group Oct 30–Nov 2, other group Nov 28–Dec 1 (clipped), the rest on the 10th.
    expect(out).toEqual(["2026-11-01", "2026-11-02", "2026-11-10", "2026-11-28", "2026-11-29", "2026-11-30"]);
  });
});
