/**
 * Member Portal navigation — the single place that decides which portal
 * options members see, and in what order.
 *
 * Every portal menu reads this list: the desktop nav bar, the mobile menu and
 * the dashboard tiles. To bring back a hidden option, set `visible: true`
 * (and move the entry to where it should appear). Hidden options keep their
 * pages, routes and data; they are only left out of the menus, so links inside
 * workflows (e.g. "My Bookings" after booking a property) still work.
 *
 * Visibility here never grants access: each page and API still enforces its
 * own permissions, and `requires` adds a per-user gate on top (e.g. Master
 * Calendar only shows for members whose skill group may view it).
 */
import type { LucideIcon } from "lucide-react";
import { useSearch } from "wouter";
import {
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  ClipboardList,
  MapPin,
  MessageSquare,
  Newspaper,
  UserCircle,
  UserPlus,
  Users,
} from "lucide-react";

export type PortalNavKey =
  | "book-property"
  | "master-calendar"
  | "my-calendar"
  | "roster"
  | "profile"
  | "request-stay"
  | "concierge"
  | "my-bookings"
  | "updates"
  | "refer";

/** Dashboard tabs inside /portal (selected with ?tab=…). */
export type PortalTab = "dashboard" | "bookings" | "request" | "updates" | "messages" | "profile" | "properties";
export const PORTAL_TABS: readonly PortalTab[] = ["dashboard", "bookings", "request", "updates", "messages", "profile", "properties"];

export type PortalNavItem = {
  key: PortalNavKey;
  label: string;
  icon: LucideIcon;
  /** Shown in the portal menus. false = hidden but kept (pages/routes still work). */
  visible: boolean;
  /** Extra per-user condition for showing the option. */
  requires?: "masterCalendar";
  /** Where the option goes. Portal paths get the admin-preview params added. */
  href: (ctx: { email?: string | null }) => string;
  /** Leaves the portal (no preview params, plain link). */
  external?: boolean;
};

export const PORTAL_NAV_ITEMS: readonly PortalNavItem[] = [
  // ── Visible, in display order ────────────────────────────────────────────
  { key: "book-property",   label: "Book a Property",   icon: MapPin,        visible: true, href: () => "/portal/properties" },
  { key: "master-calendar", label: "Master Calendar",   icon: CalendarRange, visible: true, requires: "masterCalendar", href: () => "/portal/calendar/master" },
  { key: "my-calendar",     label: "My Calendar",       icon: CalendarDays,  visible: true, href: () => "/portal/calendar/mine" },
  { key: "roster",          label: "Membership Roster", icon: Users,         visible: true, href: () => "/portal/roster" },
  { key: "profile",         label: "Profile",           icon: UserCircle,    visible: true, href: () => "/portal?tab=profile" },

  // ── Hidden (kept so they can be restored) ────────────────────────────────
  { key: "request-stay",    label: "Request a Stay",    icon: CalendarPlus,  visible: false, href: () => "/portal?tab=request" },
  { key: "concierge",       label: "Concierge",         icon: MessageSquare, visible: false, href: () => "/portal?tab=messages" },
  { key: "my-bookings",     label: "My Bookings",       icon: ClipboardList, visible: false, href: () => "/portal/my-bookings" },
  { key: "updates",         label: "Updates",           icon: Newspaper,     visible: false, href: () => "/portal?tab=updates" },
  {
    key: "refer", label: "Refer", icon: UserPlus, visible: false, external: true,
    href: ({ email }) =>
      `/contact?type=membership&ref=${encodeURIComponent(email ?? "")}&note=${encodeURIComponent("I'd like to refer a friend for membership at The Rivers Lodge.")}`,
  },
];

/** Is this option switched on in the menus? (Ignores per-user `requires`.) */
export function isPortalOptionVisible(key: PortalNavKey): boolean {
  return PORTAL_NAV_ITEMS.some((i) => i.key === key && i.visible);
}

/** The options to show this user, in order. */
export function visiblePortalNavItems(opts: { canViewMasterCalendar: boolean }): PortalNavItem[] {
  return PORTAL_NAV_ITEMS.filter((i) => {
    if (!i.visible) return false;
    if (i.requires === "masterCalendar" && !opts.canViewMasterCalendar) return false;
    return true;
  });
}

export type PortalPreview = { isPreviewMode: boolean; skillGroupId?: number };

/** Read admin-preview params (?preview=1&skillGroupId=N) from a query string. */
export function parsePortalPreview(search: string): PortalPreview {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const raw = p.get("skillGroupId");
  const id = raw ? Number.parseInt(raw, 10) : NaN;
  return { isPreviewMode: p.get("preview") === "1", skillGroupId: Number.isFinite(id) && id > 0 ? id : undefined };
}

/** Add the admin-preview params to a portal link so preview survives navigation. */
export function withPreview(href: string, preview: PortalPreview): string {
  if (!preview.isPreviewMode || !href.startsWith("/portal")) return href;
  const [path, query = ""] = href.split("?");
  const p = new URLSearchParams(query);
  p.set("preview", "1");
  if (preview.skillGroupId) p.set("skillGroupId", String(preview.skillGroupId));
  return `${path}?${p.toString()}`;
}

/** Resolve an option's link for this user (preview params added for portal links). */
export function portalNavHref(item: PortalNavItem, ctx: { email?: string | null; preview: PortalPreview }): string {
  const href = item.href({ email: ctx.email });
  return item.external ? href : withPreview(href, ctx.preview);
}

/** Which dashboard tab a /portal query string selects (unknown → dashboard). */
export function portalTabFromSearch(search: string): PortalTab {
  const t = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("tab");
  return (PORTAL_TABS as readonly string[]).includes(t ?? "") ? (t as PortalTab) : "dashboard";
}

/** Is `item` the page currently shown? */
export function isPortalNavItemActive(item: PortalNavItem, location: string, search: string): boolean {
  const href = item.href({});
  const [path, query] = href.split("?");
  if (query) {
    const want = new URLSearchParams(query).get("tab");
    return location === path && portalTabFromSearch(search) === want;
  }
  return location === path || location.startsWith(`${path}/`);
}

/** Hook: keep admin-preview params on in-portal links (`portalLink("/portal")`). */
export function usePortalLink(): (href: string) => string {
  const search = useSearch();
  return (href: string) => withPreview(href, parsePortalPreview(search));
}
