import { describe, expect, it } from "vitest";
import {
  PORTAL_NAV_ITEMS,
  isPortalNavItemActive,
  isPortalOptionVisible,
  parsePortalPreview,
  portalNavHref,
  portalTabFromSearch,
  visiblePortalNavItems,
  withPreview,
} from "./portalNav";

describe("portal menu config", () => {
  it("shows exactly the five options, in order", () => {
    expect(visiblePortalNavItems({ canViewMasterCalendar: true }).map((i) => i.label)).toEqual([
      "Book a Property", "Master Calendar", "My Calendar", "Membership Roster", "Profile",
    ]);
  });

  it("Master Calendar still follows the member's calendar permission", () => {
    expect(visiblePortalNavItems({ canViewMasterCalendar: false }).map((i) => i.label)).toEqual([
      "Book a Property", "My Calendar", "Membership Roster", "Profile",
    ]);
  });

  it("keeps the hidden options in the config so they can be restored", () => {
    for (const key of ["request-stay", "concierge", "my-bookings", "updates", "refer"] as const) {
      expect(PORTAL_NAV_ITEMS.some((i) => i.key === key)).toBe(true);
      expect(isPortalOptionVisible(key)).toBe(false);
    }
  });

  it("Book a Property keeps the existing Properties destination", () => {
    const item = PORTAL_NAV_ITEMS.find((i) => i.key === "book-property")!;
    expect(item.href({})).toBe("/portal/properties");
  });
});

describe("admin preview links", () => {
  const preview = parsePortalPreview("?preview=1&skillGroupId=7");

  it("parses preview params", () => {
    expect(preview).toEqual({ isPreviewMode: true, skillGroupId: 7 });
    expect(parsePortalPreview("")).toEqual({ isPreviewMode: false, skillGroupId: undefined });
    expect(parsePortalPreview("preview=1&skillGroupId=abc")).toEqual({ isPreviewMode: true, skillGroupId: undefined });
  });

  it("adds preview params to portal links only", () => {
    expect(withPreview("/portal/roster", preview)).toBe("/portal/roster?preview=1&skillGroupId=7");
    expect(withPreview("/portal?tab=profile", preview)).toBe("/portal?tab=profile&preview=1&skillGroupId=7");
    expect(withPreview("/contact", preview)).toBe("/contact");
    expect(withPreview("/portal/roster", { isPreviewMode: false })).toBe("/portal/roster");
  });

  it("every visible option keeps preview mode", () => {
    for (const item of visiblePortalNavItems({ canViewMasterCalendar: true })) {
      expect(portalNavHref(item, { preview })).toContain("preview=1&skillGroupId=7");
    }
  });
});

describe("tabs and active state", () => {
  it("reads the dashboard tab from the query string", () => {
    expect(portalTabFromSearch("tab=profile")).toBe("profile");
    expect(portalTabFromSearch("?tab=profile&preview=1")).toBe("profile");
    expect(portalTabFromSearch("")).toBe("dashboard");
    expect(portalTabFromSearch("tab=nope")).toBe("dashboard");
  });

  it("marks the current option active", () => {
    const byKey = (k: string) => PORTAL_NAV_ITEMS.find((i) => i.key === k)!;
    expect(isPortalNavItemActive(byKey("book-property"), "/portal/properties/12", "")).toBe(true);
    expect(isPortalNavItemActive(byKey("profile"), "/portal", "tab=profile")).toBe(true);
    expect(isPortalNavItemActive(byKey("profile"), "/portal", "")).toBe(false);
    expect(isPortalNavItemActive(byKey("roster"), "/portal/calendar/mine", "")).toBe(false);
  });
});
