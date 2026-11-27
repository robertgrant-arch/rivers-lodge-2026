import { describe, expect, it } from "vitest";
import { collectCalendarItems } from "@shared/calendarFeed";
import {
  blockedItem,
  corporateItem,
  createBlockedCalendarSource,
  createCorporateCalendarSource,
  createHuntFishCalendarSource,
  createMemberEventCalendarSource,
  createOpsEventCalendarSource,
  createWeddingCalendarSource,
  eventItem,
  huntFishItem,
  weddingItems,
} from "./calendarSources";
import { loadUnavailableDates } from "./calendarAccess";

/** Fake drizzle: select() resolves to the queued rows, whatever the chain. */
function fakeDb(rows: unknown[]) {
  return {
    select: () => {
      const p: any = Promise.resolve(rows);
      p.from = () => p; p.where = () => p; p.limit = () => p; p.orderBy = () => p;
      return p;
    },
  };
}
const STAFF = { userId: "a", role: "admin", audience: "staff" as const };
const NOV = ["2026-11-01", "2026-11-30"] as const;

describe("row → calendar item mappers", () => {
  it("wedding: one item on the wedding date, plus the rehearsal as a separate item when set", () => {
    const items = weddingItems({ id: 4, coupleName: "Smith / Jones", weddingDate: "2026-11-21", rehearsalDate: "2026-11-20", status: "confirmed" });
    expect(items.map((i) => [i.id, i.title, i.startDate])).toEqual([
      ["wedding-4", "Wedding: Smith / Jones", "2026-11-21"],
      ["wedding-4-rehearsal", "Rehearsal: Smith / Jones", "2026-11-20"],
    ]);
    expect(items.every((i) => i.href === "/ops/weddings/4" && i.hiddenFromMembers)).toBe(true);
    expect(weddingItems({ id: 5, coupleName: "A", weddingDate: "2026-11-21", rehearsalDate: null, status: "inquiry" })).toHaveLength(1);
  });

  it("corporate: arrival–departure; no departure → one day", () => {
    const c = corporateItem({ id: 5, companyName: "Acme", arrivalDate: "2026-11-02", departureDate: null, status: "contract_out" });
    expect([c.startDate, c.endDate, c.href]).toEqual(["2026-11-02", "2026-11-02", "/ops/corporate/5"]);
  });

  it("hunt & fish: labelled by booking type and party", () => {
    const h = huntFishItem({ id: 6, bookingType: "guided_hunt", clientName: "R. Hunter", partySize: 3, bookingDate: "2026-11-09", status: "confirmed" });
    expect(h.title).toBe("Guided hunt: R. Hunter (3)");
    expect(h.href).toBe("/ops/hunt-fish/6");
  });

  it("events: ops vs member by hiddenFromMembers; link to the calendar month", () => {
    const ops = eventItem({ id: 1, title: "Liquor inspection", startDate: "2026-11-18", endDate: "2026-11-18", hiddenFromMembers: true, allDay: false, startTime: "10:00", endTime: "11:00" });
    const mem = eventItem({ id: 2, title: "Members Dinner", startDate: "2026-11-20", endDate: "2026-11-20", hiddenFromMembers: false });
    expect([ops.id, ops.kind, ops.hiddenFromMembers, ops.href]).toEqual(["ops-1", "ops_event", true, "/ops/calendar?month=2026-11"]);
    expect([mem.id, mem.kind, mem.hiddenFromMembers]).toEqual(["member-2", "member_event", false]);
  });

  it("blocks: hidden only while they have a title to hide (Member Master Calendar rule)", () => {
    expect(blockedItem({ id: 3, title: null, startDate: "2026-11-24", endDate: "2026-11-25", hiddenFromMembers: true }).hiddenFromMembers).toBe(false);
    expect(blockedItem({ id: 3, title: "Owner weekend", startDate: "2026-11-24", endDate: "2026-11-25", hiddenFromMembers: true }).hiddenFromMembers).toBe(true);
    expect(blockedItem({ id: 3, title: null, startDate: "2026-11-24", endDate: "2026-11-25" }).title).toBe("Blocked");
  });

  it("carries no client contact details", () => {
    const all = [
      ...weddingItems({ id: 1, coupleName: "A", weddingDate: "2026-11-01", status: "confirmed", ...({ contactEmail: "x@y.z" } as any) }),
      corporateItem({ id: 1, companyName: "A", arrivalDate: "2026-11-01", departureDate: null, status: "confirmed", ...({ contactEmail: "x@y.z" } as any) }),
    ];
    expect(JSON.stringify(all)).not.toContain("x@y.z");
  });
});

describe("sources (fake DB)", () => {
  it("corporate retreat crossing the month boundary appears in both months", async () => {
    const src = createCorporateCalendarSource(() => fakeDb([
      { id: 7, companyName: "Acme", arrivalDate: "2026-10-30", departureDate: "2026-11-02", status: "confirmed" },
    ]));
    const oct = await collectCalendarItems([src], "2026-10-01", "2026-10-31", STAFF);
    const nov = await collectCalendarItems([src], ...NOV, STAFF);
    expect(oct.map((i) => i.id)).toEqual(["corporate-7"]);
    expect(nov.map((i) => i.id)).toEqual(["corporate-7"]);
  });

  it("weddings: rehearsal in range is listed even when the wedding is next month", async () => {
    const src = createWeddingCalendarSource(() => fakeDb([
      { id: 8, coupleName: "Lee", weddingDate: "2026-12-01", rehearsalDate: "2026-11-30", status: "confirmed" },
    ]));
    const nov = await collectCalendarItems([src], ...NOV, STAFF);
    expect(nov.map((i) => i.id)).toEqual(["wedding-8-rehearsal"]);
  });

  it("ops/member event sources split one table", async () => {
    const rows = [
      { id: 1, title: "Ops", startDate: "2026-11-02", endDate: "2026-11-02", hiddenFromMembers: true },
      { id: 2, title: "Mem", startDate: "2026-11-03", endDate: "2026-11-03", hiddenFromMembers: false },
    ];
    const ops = await createOpsEventCalendarSource(() => fakeDb(rows)).listInRange(...NOV, STAFF);
    const mem = await createMemberEventCalendarSource(() => fakeDb(rows)).listInRange(...NOV, STAFF);
    expect(ops.map((i) => i.id)).toEqual(["ops-1"]);
    expect(mem.map((i) => i.id)).toEqual(["member-2"]);
  });

  it("hunt & fish and blocked sources map their rows", async () => {
    const hf = await createHuntFishCalendarSource(() => fakeDb([
      { id: 6, bookingType: "fishing", clientName: "Ann", partySize: 1, bookingDate: "2026-11-09", status: "requested" },
    ])).listInRange(...NOV, STAFF);
    const bl = await createBlockedCalendarSource(() => fakeDb([
      { id: 3, title: null, startDate: "2026-11-24", endDate: "2026-11-25", hiddenFromMembers: false },
    ])).listInRange(...NOV, STAFF);
    expect(hf[0].title).toBe("Fishing: Ann");
    expect(bl[0].id).toBe("blocked-3");
  });
});

describe("My Calendar unavailable dates (member view)", () => {
  it("only dates — from the sources that mark availability, cancelled/lost excluded", async () => {
    const dates = await loadUnavailableDates(...NOV, [
      { kind: "hunting_group", label: "", color: "", marksMemberUnavailable: true, listInRange: async () => [
        { id: "hunting_group-1", kind: "hunting_group", recordId: 1, title: "Hunting Group: Secret", startDate: "2026-10-31", endDate: "2026-11-02", allDay: true, status: "inquiry", href: "/ops/hunting-groups/1", hiddenFromMembers: true },
        { id: "hunting_group-2", kind: "hunting_group", recordId: 2, title: "Lost", startDate: "2026-11-15", endDate: "2026-11-15", allDay: true, status: "lost", href: null, hiddenFromMembers: true },
      ] },
      // Member/ops events don't make the estate unavailable.
      { kind: "member_event", label: "", color: "", listInRange: async () => [
        { id: "member-9", kind: "member_event", recordId: 9, title: "Dinner", startDate: "2026-11-20", allDay: true, status: null, href: null, hiddenFromMembers: false },
      ] },
    ]);
    expect(dates).toEqual(["2026-11-01", "2026-11-02"]);
  });
});
