import { describe, expect, it } from "vitest";
import { canViewOpsCalendar, loadOpsCalendar } from "./opsCalendar";
import type { CalendarSource } from "@shared/calendarFeed";

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

describe("loadOpsCalendar (calendar feed registry)", () => {
  const src = (kind: string, items: any[]): CalendarSource => ({
    kind, label: kind, color: "#000", listInRange: async () => items,
  });
  const base = { allDay: true, hiddenFromMembers: true, href: null };

  it("reads every source it is given, sorted by date, with source metadata", async () => {
    const out = await loadOpsCalendar("2026-11-01", "2026-11-30", { id: "a", role: "admin" }, [
      src("wedding", [{ ...base, id: "wedding-4", kind: "wedding", recordId: 4, title: "Wedding: Smith / Jones", startDate: "2026-11-21", status: "confirmed" }]),
      src("hunting_group", [{ ...base, id: "hunting_group-9", kind: "hunting_group", recordId: 9, title: "Hunting Group: Ducks", startDate: "2026-11-02", endDate: "2026-11-04", status: "inquiry" }]),
    ]);
    expect(out.items.map((i) => i.id)).toEqual(["hunting_group-9", "wedding-4"]);
    expect(out.items[0].tentative).toBe(true);
    expect(out.items[1].tentative).toBe(false);
    expect(out.sources.map((s) => s.kind)).toEqual(["wedding", "hunting_group"]);
  });

  it("staff see full titles (no member redaction)", async () => {
    const out = await loadOpsCalendar("2026-11-01", "2026-11-30", { id: "e", role: "employee" }, [
      src("corporate", [{ ...base, id: "corporate-5", kind: "corporate", recordId: 5, title: "Corporate: Acme", startDate: "2026-11-02", status: "confirmed" }]),
    ]);
    expect(out.items[0].title).toBe("Corporate: Acme");
  });
});
