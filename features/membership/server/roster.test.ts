import { describe, expect, it } from "vitest";
import { canViewMemberRoster, toRosterEntries, type RosterRow } from "./roster";

/** Fake drizzle chain: the single select is the members lookup. */
function fakeDb({ activeMember = false } = {}) {
  let calls = 0;
  return {
    get calls() { return calls; },
    select: () => {
      calls++;
      const p: any = Promise.resolve(activeMember ? [{ id: 1 }] : []);
      p.from = () => p; p.where = () => p; p.limit = () => p;
      return p;
    },
  };
}

describe("canViewMemberRoster", () => {
  it("signed out → no", async () => {
    expect(await canViewMemberRoster(fakeDb({ activeMember: true }), null)).toBe(false);
    expect(await canViewMemberRoster(fakeDb({ activeMember: true }), undefined)).toBe(false);
  });
  it("admin → yes (admin preview mode), without needing a member record", async () => {
    const db = fakeDb();
    expect(await canViewMemberRoster(db, { id: "a", role: "admin" })).toBe(true);
    expect(db.calls).toBe(0);
  });
  it("user with an active member record → yes", async () => {
    expect(await canViewMemberRoster(fakeDb({ activeMember: true }), { id: "m", role: "employee" })).toBe(true);
  });
  it("signed in without an active member record (staff, inactive member) → no", async () => {
    expect(await canViewMemberRoster(fakeDb(), { id: "s", role: "employee" })).toBe(false);
  });
});

const row = (r: Partial<RosterRow> & { memberId: number }): RosterRow => ({
  fullName: null, preferredName: null, cellPhone: null, workPhone: null, email: null, ...r,
});

describe("toRosterEntries", () => {
  it("returns only name, phone and email", () => {
    const [e] = toRosterEntries([row({ memberId: 1, fullName: "Ann Lee", cellPhone: "913-555-0100", email: "ann@example.com" })]);
    expect(e).toEqual({ memberId: 1, name: "Ann Lee", phone: "913-555-0100", email: "ann@example.com" });
  });

  it("sorts by name, case-insensitively, with unnamed members last", () => {
    const out = toRosterEntries([
      row({ memberId: 1, fullName: "zed Young" }),
      row({ memberId: 2, email: "noname@example.com" }),
      row({ memberId: 3, fullName: "Amy Baker" }),
      row({ memberId: 4, fullName: "  " , email: "blank@example.com" }),
      row({ memberId: 5, fullName: "bob Cole" }),
    ]);
    expect(out.map((e) => e.memberId)).toEqual([3, 5, 1, 4, 2]);
  });

  it("falls back to preferred name and work phone; blanks become null", () => {
    const [e] = toRosterEntries([row({ memberId: 1, preferredName: " Jim ", workPhone: "816-555-0199", cellPhone: " ", email: "" })]);
    expect(e).toEqual({ memberId: 1, name: "Jim", phone: "816-555-0199", email: null });
  });
});
