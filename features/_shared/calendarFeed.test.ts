import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calendarSourceMeta,
  clearCalendarSources,
  collectCalendarItems,
  datesInRange,
  getCalendarSources,
  isTentativeStatus,
  itemsByDate,
  normalizeCalendarItem,
  overlapsRange,
  redactForMembers,
  registerCalendarSource,
  type CalendarSource,
  type RawCalendarItem,
} from "./calendarFeed";

const STAFF = { userId: "a", role: "admin", audience: "staff" as const };
const MEMBER = { userId: "m", role: "employee", audience: "member" as const };

function raw(over: Partial<RawCalendarItem> = {}): RawCalendarItem {
  return {
    id: "x-1", kind: "corporate", recordId: 1, title: "Corporate: Acme",
    startDate: "2026-11-10", endDate: "2026-11-12", allDay: true,
    status: "confirmed", href: "/ops/corporate/1", hiddenFromMembers: true,
    ...over,
  };
}

const source = (kind: string, items: RawCalendarItem[], extra: Partial<CalendarSource> = {}): CalendarSource => ({
  kind, label: kind, color: "#123456", listInRange: async () => items, ...extra,
});

// November 2026
const NOV = ["2026-11-01", "2026-11-30"] as const;

describe("overlap logic", () => {
  it("single-day item inside the range", () => {
    expect(overlapsRange("2026-11-15", "2026-11-15", ...NOV)).toBe(true);
  });
  it("single-day item on the first and last day of the range", () => {
    expect(overlapsRange("2026-11-01", "2026-11-01", ...NOV)).toBe(true);
    expect(overlapsRange("2026-11-30", "2026-11-30", ...NOV)).toBe(true);
  });
  it("multi-day item crossing the month START (Oct 30 – Nov 2)", () => {
    expect(overlapsRange("2026-10-30", "2026-11-02", ...NOV)).toBe(true);
  });
  it("multi-day item crossing the month END (Nov 28 – Dec 3)", () => {
    expect(overlapsRange("2026-11-28", "2026-12-03", ...NOV)).toBe(true);
  });
  it("multi-day item spanning the whole month", () => {
    expect(overlapsRange("2026-10-25", "2026-12-05", ...NOV)).toBe(true);
  });
  it("items entirely before or after the range are out", () => {
    expect(overlapsRange("2026-10-20", "2026-10-31", ...NOV)).toBe(false);
    expect(overlapsRange("2026-12-01", "2026-12-02", ...NOV)).toBe(false);
  });
  it("the old containment rule would have hidden a cross-month retreat — normalize keeps it", () => {
    const it1 = normalizeCalendarItem(raw({ startDate: "2026-10-30", endDate: "2026-11-02" }), ...NOV);
    expect(it1).not.toBeNull();
    expect([it1!.startDate, it1!.endDate]).toEqual(["2026-10-30", "2026-11-02"]);
    const it2 = normalizeCalendarItem(raw({ startDate: "2026-11-29", endDate: "2026-12-02" }), ...NOV);
    expect(it2).not.toBeNull();
  });
});

describe("normalizeCalendarItem", () => {
  it("cancelled and lost are excluded", () => {
    expect(normalizeCalendarItem(raw({ status: "cancelled" }), ...NOV)).toBeNull();
    expect(normalizeCalendarItem(raw({ status: "lost" }), ...NOV)).toBeNull();
  });
  it("items without a date are skipped (no error)", () => {
    expect(normalizeCalendarItem(raw({ startDate: null, endDate: null, status: "inquiry" }), ...NOV)).toBeNull();
    expect(normalizeCalendarItem(raw({ startDate: undefined, endDate: "2026-11-03" }), ...NOV)).toBeNull();
    expect(normalizeCalendarItem(raw({ startDate: "", status: "inquiry" }), ...NOV)).toBeNull();
    expect(normalizeCalendarItem(raw({ startDate: "not a date" }), ...NOV)).toBeNull();
  });
  it("a dated inquiry IS shown, flagged tentative", () => {
    const it1 = normalizeCalendarItem(raw({ status: "inquiry" }), ...NOV)!;
    expect(it1.tentative).toBe(true);
  });
  it("tentative vs confirmed", () => {
    for (const s of ["inquiry", "contacted", "proposal_sent", "contract_out", "site_visit", "requested"]) {
      expect(normalizeCalendarItem(raw({ status: s }), ...NOV)!.tentative).toBe(true);
    }
    for (const s of ["confirmed", "completed", "in_progress", null]) {
      expect(normalizeCalendarItem(raw({ status: s }), ...NOV)!.tentative).toBe(false);
    }
  });
  it("a source may set tentative itself", () => {
    expect(normalizeCalendarItem(raw({ status: "confirmed", tentative: true }), ...NOV)!.tentative).toBe(true);
  });
  it("missing end date = one-day item; end before start is clamped to one day", () => {
    expect(normalizeCalendarItem(raw({ endDate: null }), ...NOV)!.endDate).toBe("2026-11-10");
    expect(normalizeCalendarItem(raw({ startDate: "2026-11-10", endDate: "2026-11-05" }), ...NOV)!.endDate).toBe("2026-11-10");
  });
  it("accepts Date objects from the driver", () => {
    const it1 = normalizeCalendarItem(raw({ startDate: new Date("2026-11-03T00:00:00Z"), endDate: new Date("2026-11-04T00:00:00Z") }), ...NOV)!;
    expect([it1.startDate, it1.endDate]).toEqual(["2026-11-03", "2026-11-04"]);
  });
  it("isTentativeStatus never marks excluded statuses", () => {
    expect(isTentativeStatus("cancelled")).toBe(false);
    expect(isTentativeStatus(undefined)).toBe(false);
  });
});

describe("member redaction", () => {
  it("hidden items become a bare Unavailable entry with dates only", () => {
    const it1 = normalizeCalendarItem(raw({ title: "Wedding: Smith / Jones", kind: "wedding", status: "inquiry", notes: "secret", extra: { a: 1 } }), ...NOV)!;
    const r = redactForMembers(it1);
    expect(r).toEqual({
      id: "unavailable-x-1", kind: "unavailable", recordId: 0, title: "Unavailable",
      startDate: "2026-11-10", endDate: "2026-11-12", allDay: true, startTime: null, endTime: null,
      status: null, tentative: false, href: null, hiddenFromMembers: true,
    });
    expect(JSON.stringify(r)).not.toMatch(/Smith|secret|wedding|ops\//);
  });
  it("member-visible items pass through untouched", () => {
    const it1 = normalizeCalendarItem(raw({ hiddenFromMembers: false, title: "Members Dinner" }), ...NOV)!;
    expect(redactForMembers(it1)).toBe(it1);
  });
});

describe("collectCalendarItems", () => {
  it("includes every source, applies the rules, sorts by date", async () => {
    const items = await collectCalendarItems([
      source("wedding", [raw({ id: "wedding-1", kind: "wedding", title: "Wedding: B", startDate: "2026-11-20", endDate: null })]),
      source("corporate", [
        raw({ id: "corporate-2", title: "Corporate: A", startDate: "2026-10-30", endDate: "2026-11-02" }),
        raw({ id: "corporate-3", status: "cancelled" }),
      ]),
      source("hunting_group", [
        raw({ id: "hunting_group-4", kind: "hunting_group", title: "Hunting Group: Ducks", startDate: "2026-11-05", endDate: "2026-11-07", status: "inquiry" }),
        raw({ id: "hunting_group-5", kind: "hunting_group", startDate: null, status: "inquiry" }),
        raw({ id: "hunting_group-6", kind: "hunting_group", status: "lost" }),
      ]),
    ], ...NOV, STAFF);
    expect(items.map((i) => i.id)).toEqual(["corporate-2", "hunting_group-4", "wedding-1"]);
    expect(items.find((i) => i.id === "hunting_group-4")!.tentative).toBe(true);
    expect(items.find((i) => i.id === "wedding-1")!.tentative).toBe(false);
  });

  it("member audience never receives booking details", async () => {
    const items = await collectCalendarItems([
      source("wedding", [raw({ id: "wedding-1", kind: "wedding", title: "Wedding: Smith", href: "/ops/weddings/1" })]),
      source("member_event", [raw({ id: "member-2", kind: "member_event", title: "Members Dinner", hiddenFromMembers: false, status: null })]),
    ], ...NOV, MEMBER);
    expect(items.map((i) => i.title).sort()).toEqual(["Members Dinner", "Unavailable"]);
    const hidden = items.find((i) => i.title === "Unavailable")!;
    expect(hidden.href).toBeNull();
    expect(hidden.kind).toBe("unavailable");
  });

  it("a failing source is skipped instead of blanking the calendar", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const items = await collectCalendarItems([
      source("broken", [], { listInRange: async () => { throw new Error("boom"); } }),
      source("corporate", [raw()]),
    ], ...NOV, STAFF);
    expect(items).toHaveLength(1);
    spy.mockRestore();
  });

  it("passes the range and viewer to each source", async () => {
    const listInRange = vi.fn(async () => []);
    await collectCalendarItems([source("x", [], { listInRange })], ...NOV, STAFF);
    expect(listInRange).toHaveBeenCalledWith("2026-11-01", "2026-11-30", STAFF);
  });
});

describe("registry", () => {
  afterEach(() => clearCalendarSources());

  it("registers sources in order; re-registering a kind replaces it", () => {
    clearCalendarSources();
    registerCalendarSource(source("wedding", []));
    registerCalendarSource(source("hunting_group", []));
    registerCalendarSource({ ...source("wedding", []), label: "Weddings!" });
    expect(getCalendarSources().map((s) => s.kind)).toEqual(["wedding", "hunting_group"]);
    expect(calendarSourceMeta()).toEqual([
      { kind: "wedding", label: "Weddings!", color: "#123456" },
      { kind: "hunting_group", label: "hunting_group", color: "#123456" },
    ]);
  });
});

describe("rendering helpers", () => {
  it("datesInRange expands inclusive and clips", () => {
    expect(datesInRange("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(datesInRange("2026-10-30", "2026-11-02", "2026-11-01", "2026-11-30")).toEqual(["2026-11-01", "2026-11-02"]);
  });
  it("itemsByDate puts a multi-day item on every day it spans (within the month)", () => {
    const m = itemsByDate([
      { id: "a", startDate: "2026-11-28", endDate: "2026-12-02" },
      { id: "b", startDate: "2026-11-29", endDate: "2026-11-29" },
    ], ...NOV);
    expect(Array.from(m.keys()).sort()).toEqual(["2026-11-28", "2026-11-29", "2026-11-30"]);
    expect(m.get("2026-11-29")!.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
