import { describe, expect, it } from "vitest";
import { navGroups } from "./opsNav";

const allItems = navGroups.flatMap((g) => g.items);

describe("Ops sidebar", () => {
  it("no longer has All Bookings (or any /ops/bookings link)", () => {
    expect(allItems.map((i) => i.label)).not.toContain("All Bookings");
    expect(allItems.some((i) => i.path.startsWith("/ops/bookings"))).toBe(false);
  });

  it('events group is "All Booked Events" with Weddings, Corporate Groups, Hunting Groups, Other Groups in order', () => {
    expect(navGroups.map((g) => g.label)).not.toContain("Events");
    const group = navGroups.find((g) => g.label === "All Booked Events");
    expect(group).toBeDefined();
    expect(group!.items.map((i) => [i.label, i.path])).toEqual([
      ["Weddings", "/ops/weddings"],
      ["Corporate Groups", "/ops/corporate"],
      ["Hunting Groups", "/ops/hunting-groups"],
      ["Other Groups", "/ops/other-groups"],
    ]);
  });

  it('"Corporate Retreats" is gone from the sidebar', () => {
    expect(allItems.map((i) => i.label)).not.toContain("Corporate Retreats");
  });

  it("every item has an icon and a unique path", () => {
    for (const i of allItems) expect(i.icon).toBeTruthy();
    expect(new Set(allItems.map((i) => i.path)).size).toBe(allItems.length);
  });
});
