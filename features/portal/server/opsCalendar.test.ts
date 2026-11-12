import { describe, expect, it } from "vitest";
import { canViewOpsCalendar, toOpsEntries } from "./opsCalendar";

/** Fake drizzle: each select() resolves to the next queued result. */
function fakeDb(results: unknown[][]) {
  let call = 0;
  const db = {
    calls: 0,
    select: () => {
      db.calls = ++call;
      const p: any = Promise.resolve(results[call - 1] ?? []);
      p.from = () => p; p.where = () => p; p.limit = () => p; p.innerJoin = () => p;
      return p;
    },
  };
  return db;
}
const emp = [{ id: 7 }];
const groups = (...slugs: string[]) => slugs.map((slug) => ({ slug }));

describe("canViewOpsCalendar", () => {
  it("signed out → no", async () => {
    expect(await canViewOpsCalendar(fakeDb([]), null)).toBe(false);
  });
  it("admin → yes, without lookups", async () => {
    const db = fakeDb([]);
    expect(await canViewOpsCalendar(db, { id: "a", role: "admin" })).toBe(true);
    expect(db.calls).toBe(0);
  });
  it("admin previewing the Employee or Admin group → yes; a member group → no", async () => {
    expect(await canViewOpsCalendar(fakeDb([[{ slug: "employee" }]]), { id: "a", role: "admin" }, 5)).toBe(true);
    expect(await canViewOpsCalendar(fakeDb([[{ slug: "admin" }]]), { id: "a", role: "admin" }, 4)).toBe(true);
    expect(await canViewOpsCalendar(fakeDb([[{ slug: "designated" }]]), { id: "a", role: "admin" }, 1)).toBe(false);
    expect(await canViewOpsCalendar(fakeDb([[]]), { id: "a", role: "admin" }, 99)).toBe(false); // unknown/inactive group
  });

  it("a non-admin can't borrow staff access via the preview parameter", async () => {
    const db = fakeDb([[]]); // no employee record
    expect(await canViewOpsCalendar(db, { id: "m", role: "employee" }, 5)).toBe(false);
  });

  it("active employee in the Employee or Admin skill group → yes", async () => {
    expect(await canViewOpsCalendar(fakeDb([emp, groups("employee")]), { id: "e", role: "employee" })).toBe(true);
    expect(await canViewOpsCalendar(fakeDb([emp, groups("Admin")]), { id: "e", role: "employee" })).toBe(true);
  });
  it("active employee in neither group → no", async () => {
    expect(await canViewOpsCalendar(fakeDb([emp, groups("designated")]), { id: "e", role: "employee" })).toBe(false);
    expect(await canViewOpsCalendar(fakeDb([emp, []]), { id: "e", role: "employee" })).toBe(false);
  });
  it("member login without an active employee record → no (member skill groups are never consulted)", async () => {
    const db = fakeDb([[]]);
    expect(await canViewOpsCalendar(db, { id: "m", role: "employee" })).toBe(false);
    expect(db.calls).toBe(1); // stopped after the employees lookup
  });
});

describe("toOpsEntries", () => {
  const out = toOpsEntries({
    events: [
      { id: 1, title: "STATE OF KS LIQUOR INSPECTION", startDate: "2026-11-18", endDate: "2026-11-18", allDay: false, startTime: "10:00", endTime: "11:00", hiddenFromMembers: true },
      { id: 2, title: "Members Dinner", startDate: "2026-11-20", endDate: "2026-11-20", allDay: true, hiddenFromMembers: false },
    ],
    blocked: [{ id: 3, title: null, startDate: "2026-11-24", endDate: "2026-11-25", allDay: true, reasonNotes: "Maintenance" }],
    weddings: [{ id: 4, coupleName: "Smith / Jones", weddingDate: "2026-11-21", status: "confirmed" }],
    corporate: [{ id: 5, companyName: "Acme", arrivalDate: "2026-11-02", departureDate: null, status: "contract_out" }],
    huntFish: [{ id: 6, bookingType: "guided_hunt", clientName: "R. Hunter", partySize: 3, bookingDate: "2026-11-09", status: "confirmed" }],
  });

  it("labels each source and separates ops from member events", () => {
    const byId = (k: string) => out.find((e) => e.key === k)!;
    expect(byId("ops-1").kind).toBe("ops_event");
    expect(byId("member-2").kind).toBe("member_event");
    expect(byId("blocked-3").title).toBe("Blocked");
    expect(byId("wedding-4").title).toBe("Wedding: Smith / Jones");
    expect(byId("huntfish-6").title).toBe("Guided hunt: R. Hunter (3)");
  });

  it("a corporate booking with no departure is a one-day entry", () => {
    const c = out.find((e) => e.key === "corporate-5")!;
    expect([c.startDate, c.endDate]).toEqual(["2026-11-02", "2026-11-02"]);
  });

  it("is sorted by date", () => {
    expect(out.map((e) => e.startDate)).toEqual([...out.map((e) => e.startDate)].sort());
  });

  it("carries no contact details", () => {
    for (const e of out) expect(Object.keys(e).sort()).toEqual(["allDay", "endDate", "endTime", "id", "key", "kind", "notes", "startDate", "startTime", "status", "title"]);
  });
});
