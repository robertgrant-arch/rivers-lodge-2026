import { describe, expect, it } from "vitest";
import {
  canUseMemberCalendar,
  canViewMasterCalendar,
  expandDates,
  memberVisibleBlocks,
  memberVisibleEvents,
  toIsoDate,
} from "./calendarAccess";

/** Fake drizzle: each select() resolves to the next queued result. */
function fakeDb(results: unknown[][]) {
  let call = 0;
  const db = {
    calls: 0,
    select: () => {
      db.calls = ++call;
      const p: any = Promise.resolve(results[call - 1] ?? []);
      p.from = () => p; p.where = () => p; p.limit = () => p;
      return p;
    },
  };
  return db;
}
const member = [{ id: 10 }];
const groups = (...ids: number[]) => ids.map((skillGroupId) => ({ skillGroupId }));
const grant = (v: boolean) => [{ canViewMasterCalendar: v }];

describe("canViewMasterCalendar", () => {
  it("signed out → no", async () => {
    expect(await canViewMasterCalendar(fakeDb([]), null)).toBe(false);
  });

  it("admin → yes, without lookups", async () => {
    const db = fakeDb([]);
    expect(await canViewMasterCalendar(db, { id: "a", role: "admin" })).toBe(true);
    expect(db.calls).toBe(0);
  });

  it("admin previewing a group sees what that group would see", async () => {
    expect(await canViewMasterCalendar(fakeDb([grant(true)]), { id: "a", role: "admin" }, 3)).toBe(true);
    expect(await canViewMasterCalendar(fakeDb([grant(false)]), { id: "a", role: "admin" }, 4)).toBe(false);
    expect(await canViewMasterCalendar(fakeDb([[]]), { id: "a", role: "admin" }, 5)).toBe(false);
  });

  it("member whose group has access → yes", async () => {
    expect(await canViewMasterCalendar(fakeDb([member, groups(1, 2), [...grant(false), ...grant(true)]]), { id: "m", role: "employee" })).toBe(true);
  });

  it("member whose groups lack access, or who has no group → no", async () => {
    expect(await canViewMasterCalendar(fakeDb([member, groups(2), grant(false)]), { id: "m", role: "employee" })).toBe(false);
    expect(await canViewMasterCalendar(fakeDb([member, []]), { id: "m", role: "employee" })).toBe(false);
  });

  it("no active member record (staff login, inactive member) → no", async () => {
    expect(await canViewMasterCalendar(fakeDb([[]]), { id: "s", role: "employee" })).toBe(false);
  });

  it("a non-admin cannot borrow another group's access via the preview parameter", async () => {
    // Own group (2) has no access; asking to "preview" group 1 must not help.
    const db = fakeDb([member, groups(2), grant(false)]);
    expect(await canViewMasterCalendar(db, { id: "m", role: "employee" }, 1)).toBe(false);
    expect(db.calls).toBe(3); // checked the member's own groups
  });
});

describe("canUseMemberCalendar", () => {
  it("admins and active members only", async () => {
    expect(await canUseMemberCalendar(fakeDb([]), null)).toBe(false);
    expect(await canUseMemberCalendar(fakeDb([]), { id: "a", role: "admin" })).toBe(true);
    expect(await canUseMemberCalendar(fakeDb([member]), { id: "m", role: "employee" })).toBe(true);
    expect(await canUseMemberCalendar(fakeDb([[]]), { id: "s", role: "employee" })).toBe(false);
  });
});

describe("expandDates", () => {
  it("lists calendar dates inclusively, with no timezone shift", () => {
    expect(expandDates("2026-08-10", "2026-08-12", "2026-01-01", "2026-12-31")).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
    expect(expandDates("2026-08-10", "2026-08-10", "2026-01-01", "2026-12-31")).toEqual(["2026-08-10"]);
  });
  it("clips to the requested range and crosses month/DST boundaries", () => {
    expect(expandDates("2025-12-30", "2026-01-02", "2026-01-01", "2026-12-31")).toEqual(["2026-01-01", "2026-01-02"]);
    expect(expandDates("2026-10-31", "2026-11-02", "2026-01-01", "2026-12-31")).toEqual(["2026-10-31", "2026-11-01", "2026-11-02"]);
  });
  it("handles missing or bad values", () => {
    expect(expandDates(null, null, "2026-01-01", "2026-12-31")).toEqual([]);
    expect(expandDates("2026-03-04", null, "2026-01-01", "2026-12-31")).toEqual(["2026-03-04"]);
    expect(toIsoDate("nope")).toBeNull();
    expect(toIsoDate(new Date("2026-05-06T00:00:00Z"))).toBe("2026-05-06");
  });
});

describe("member visibility", () => {
  it("drops events hidden from members", () => {
    expect(memberVisibleEvents([{ id: 1, hiddenFromMembers: false }, { id: 2, hiddenFromMembers: true }]).map((e) => e.id)).toEqual([1]);
  });
  it("drops hidden titled blocks, keeps plain blocks", () => {
    const out = memberVisibleBlocks([
      { id: 1, hiddenFromMembers: true, title: "Staff retreat" },
      { id: 2, hiddenFromMembers: true, title: null },
      { id: 3, hiddenFromMembers: false, title: "Closed" },
    ]);
    expect(out.map((b) => b.id)).toEqual([2, 3]);
  });
});
