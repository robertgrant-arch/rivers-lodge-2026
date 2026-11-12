/**
 * MemberPortalLayout — wraps every /portal page.
 *
 * Renders the admin-preview banner (when ?preview=1), and the member portal
 * menu (desktop bar + mobile menu) built from portalNav.ts. The menu only
 * appears for users who can use the portal; each page still does its own
 * access checks, and each API enforces its own permissions.
 */
import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Eye, Menu, X } from "lucide-react";
import { useAuth } from "@features/auth/public";
import { trpc } from "@shared/lib/trpc";
import PublicLayout from "@/components/PublicLayout";
import {
  isPortalNavItemActive,
  parsePortalPreview,
  portalNavHref,
  visiblePortalNavItems,
  withPreview,
  type PortalNavItem,
  type PortalPreview,
} from "../portalNav";

// Same rule MemberPortal uses: staff roles always reach the portal.
const STAFF_ROLES = ["admin", "employee", "owner", "venue_sales", "events_manager", "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance"];

/** Shared portal state for the menu (preview params + Master Calendar gate). */
export function usePortalNav() {
  const search = useSearch();
  const preview = useMemo(() => parsePortalPreview(search), [search]);
  const { user, isAuthenticated } = useAuth({});
  const memberStatus = trpc.membership.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const masterInput = useMemo(
    () => (preview.skillGroupId ? { previewSkillGroupId: preview.skillGroupId } : undefined),
    [preview.skillGroupId],
  );
  const canViewMasterCalendar = trpc.memberPortal.canViewMasterCalendar.useQuery(masterInput, {
    enabled: isAuthenticated && (!preview.isPreviewMode || !!preview.skillGroupId),
  });
  // Staff-only Ops Calendar. Hidden in admin preview, which shows what a member sees.
  const canViewOpsCalendar = trpc.memberPortal.canViewOpsCalendar.useQuery(undefined, {
    enabled: isAuthenticated && !preview.isPreviewMode,
  });
  const isStaff = !!user?.role && STAFF_ROLES.includes(user.role as string);
  const hasPortalAccess = isAuthenticated && (isStaff || !!memberStatus.data?.active);
  const items = visiblePortalNavItems({
    canViewMasterCalendar: !!canViewMasterCalendar.data,
    canViewOpsCalendar: !preview.isPreviewMode && !!canViewOpsCalendar.data,
  });
  return {
    user,
    isAuthenticated,
    preview,
    hasPortalAccess,
    items,
    masterCalendarLoading: preview.isPreviewMode && canViewMasterCalendar.isLoading && canViewMasterCalendar.fetchStatus !== "idle",
  };
}

function PreviewBanner() {
  return (
    <div className="bg-amber-600 text-white text-sm font-medium flex items-center justify-between gap-3 px-4 py-2 shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="w-4 h-4 flex-shrink-0" />
        <span className="truncate sm:whitespace-normal">
          Admin Preview Mode — you are viewing the Member Portal with a preview member account.
        </span>
      </div>
      <a
        href="/ops"
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap"
      >
        <X className="w-3.5 h-3.5" />
        Exit Preview
      </a>
    </div>
  );
}

function NavLink({
  item, href, active, onClick, variant,
}: { item: PortalNavItem; href: string; active: boolean; onClick?: () => void; variant: "bar" | "menu" }) {
  const Icon = item.icon;
  const cls =
    variant === "bar"
      ? `inline-flex items-center gap-2 px-3 py-5 text-[11px] tracking-[0.14em] uppercase font-sans border-b-2 transition-colors whitespace-nowrap ${
          active ? "border-[var(--gold)] text-white" : "border-transparent text-white/55 hover:text-white"
        }`
      : `flex items-center gap-3 px-6 py-3.5 text-xs tracking-[0.14em] uppercase font-sans border-l-2 transition-colors ${
          active ? "border-[var(--gold)] text-white bg-white/5" : "border-transparent text-white/60 hover:text-white hover:bg-white/5"
        }`;
  const content = (
    <>
      <Icon className={variant === "bar" ? "w-3.5 h-3.5" : "w-4 h-4"} aria-hidden="true" />
      {item.label}
    </>
  );
  if (item.external) {
    return <a href={href} className={cls} onClick={onClick}>{content}</a>;
  }
  return (
    <Link href={href} className={cls} onClick={onClick} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}

export function MemberPortalNav({
  items, preview, email,
}: { items: PortalNavItem[]; preview: PortalPreview; email?: string | null }) {
  const [location] = useLocation();
  const search = useSearch();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location, search]);

  return (
    <nav aria-label="Member portal" className="bg-[#2B2823] border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-16 flex items-center justify-between gap-6">
        <Link
          href={withPreview("/portal", preview)}
          className="py-4 text-[11px] tracking-[0.2em] uppercase font-sans font-medium text-[var(--gold)] whitespace-nowrap"
        >
          Member Portal
        </Link>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-1" data-testid="portal-nav-desktop">
          {items.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              variant="bar"
              href={portalNavHref(item, { email, preview })}
              active={isPortalNavItemActive(item, location, search)}
            />
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="lg:hidden inline-flex items-center gap-2 py-3 text-[11px] tracking-[0.14em] uppercase font-sans text-white/70 hover:text-white"
          aria-expanded={open}
          aria-controls="portal-nav-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          Menu
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="portal-nav-mobile" className="lg:hidden border-t border-white/10 bg-[#2B2823] pb-2" data-testid="portal-nav-mobile">
          {items.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              variant="menu"
              href={portalNavHref(item, { email, preview })}
              active={isPortalNavItemActive(item, location, search)}
              onClick={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </nav>
  );
}

export default function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, preview, hasPortalAccess, items } = usePortalNav();
  return (
    <PublicLayout hideNav={isAuthenticated || preview.isPreviewMode}>
      {(preview.isPreviewMode || hasPortalAccess) && (
        <div className="sticky top-0 z-[150]">
          {preview.isPreviewMode && <PreviewBanner />}
          {hasPortalAccess && <MemberPortalNav items={items} preview={preview} email={user?.email} />}
        </div>
      )}
      {children}
    </PublicLayout>
  );
}
