import { afterAll, describe, expect, it } from "vitest";
import { formatDateOnly, toDateInputValue, toDateOnlyString, todayInTimeZone, todayLocal } from "./dateOnly";

// Node honours runtime changes to process.env.TZ, so each case really runs
// "in" that timezone. Includes the owner (LA), staff (Central), UTC (Render)
// and a UTC+ zone to catch shifts in both directions.
const ORIGINAL_TZ = process.env.TZ;
const ZONES = ["America/Los_Angeles", "America/Chicago", "UTC", "Asia/Tokyo", "Pacific/Kiritimati"];
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe.each(ZONES)("date-only values in %s", (tz) => {
  it("shows the stored calendar date (regression: list showed Jul 3 for a stored Jul 4)", () => {
    process.env.TZ = tz;
    expect(formatDateOnly("2026-07-04")).toBe("Jul 4, 2026");
    expect(formatDateOnly("2027-11-11")).toBe("Nov 11, 2027");
    expect(formatDateOnly("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDateOnly("2026-12-31")).toBe("Dec 31, 2026");
  });

  it("the old list formatter really was off by a day in US zones (documents the bug)", () => {
    process.env.TZ = tz;
    const old = new Date("2026-07-04").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (tz.startsWith("America/")) expect(old).toBe("Jul 3, 2026");
  });

  it("round-trips through a date input unchanged (what the drawer and Member File save)", () => {
    process.env.TZ = tz;
    for (const stored of ["2026-07-04", "2027-11-11", "2024-02-29", "2026-03-08", "2026-11-01"]) {
      expect(toDateInputValue(stored)).toBe(stored);
      expect(toDateOnlyString(toDateInputValue(stored))).toBe(stored);
    }
  });
});

describe("toDateOnlyString / formatDateOnly edge cases", () => {
  it("handles blanks, ISO timestamps, Date objects and garbage", () => {
    expect(formatDateOnly(null)).toBe("—");
    expect(formatDateOnly("")).toBe("—");
    expect(formatDateOnly(undefined, "n/a")).toBe("n/a");
    expect(formatDateOnly("not a date")).toBe("—");
    expect(toDateOnlyString("2026-07-04T00:00:00.000Z")).toBe("2026-07-04");
    expect(toDateOnlyString(new Date(Date.UTC(2026, 6, 4)))).toBe("2026-07-04");
    expect(toDateInputValue(null)).toBe("");
  });
});

describe("today", () => {
  // 2026-11-10 02:30 UTC = Nov 9, 8:30 pm Central = Nov 9, 6:30 pm Pacific.
  const eveningInUS = new Date("2026-11-10T02:30:00Z");

  it("uses the Lodge's calendar day, not the UTC day", () => {
    expect(eveningInUS.toISOString().split("T")[0]).toBe("2026-11-10"); // the old, wrong default
    expect(todayInTimeZone("America/Chicago", eveningInUS)).toBe("2026-11-09");
    expect(todayInTimeZone("America/Los_Angeles", eveningInUS)).toBe("2026-11-09");
  });

  it("todayLocal uses the viewer's timezone", () => {
    process.env.TZ = "America/Los_Angeles";
    expect(todayLocal(eveningInUS)).toBe("2026-11-09");
    process.env.TZ = "Asia/Tokyo";
    expect(todayLocal(eveningInUS)).toBe("2026-11-10");
  });
});
