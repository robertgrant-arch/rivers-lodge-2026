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
import { ArrowLeft, ChevronDown, Eye, KeyRound, LogOut, Menu, UserCircle2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@shared/ui/dropdown-menu";
import { useAuth } from "@features/auth/public";
import { trpc } from "@shared/lib/trpc";
import { PublicLayout } from "@features/public-pages/public";
import {
  ADMIN_HOME_HREF,
  canShowBackToAdmin,
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
  const { user, isAuthenticated, logout } = useAuth({});
  const memberStatus = trpc.membership.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const masterInput = useMemo(
    () => (preview.skillGroupId ? { previewSkillGroupId: preview.skillGroupId } : undefined),
    [preview.skillGroupId],
  );
  const canViewMasterCalendar = trpc.memberPortal.canViewMasterCalendar.useQuery(masterInput, {
    enabled: isAuthenticated && (!preview.isPreviewMode || !!preview.skillGroupId),
  });
  // Staff-only Ops Calendar. In admin preview it follows the previewed group
  // (shown for the Admin/Employee groups, hidden for member groups).
  const canViewOpsCalendar = trpc.memberPortal.canViewOpsCalendar.useQuery(masterInput, {
    enabled: isAuthenticated && (!preview.isPreviewMode || !!preview.skillGroupId),
  });
  const isStaff = !!user?.role && STAFF_ROLES.includes(user.role as string);
  const hasPortalAccess = isAuthenticated && (isStaff || !!memberStatus.data?.active);
  const items = visiblePortalNavItems({
    canViewMasterCalendar: !!canViewMasterCalendar.data,
    canViewOpsCalendar: !!canViewOpsCalendar.data,
  });
  return {
    user,
    isAuthenticated,
    preview,
    hasPortalAccess,
    items,
    logout,
    // Admins (server session role) get a way back to the Operations Portal.
    showBackToAdmin: isAuthenticated && canShowBackToAdmin(user),
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

function BackToAdminLink({ compact }: { compact?: boolean }) {
  return (
    <Link
      href={ADMIN_HOME_HREF}
      aria-label="Back to Admin"
      data-testid={compact ? "back-to-admin-mobile" : "back-to-admin"}
      className={`inline-flex items-center gap-1.5 border border-[var(--gold)] text-[#E0D3BD] hover:bg-[var(--gold)] hover:text-white transition-colors font-sans uppercase whitespace-nowrap ${
        compact ? "px-2.5 py-1.5 text-[10px] tracking-[0.12em]" : "px-3 py-2 text-[11px] tracking-[0.14em]"
      }`}
    >
      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
      {/* Very narrow phones: "Admin" (accessible name stays "Back to Admin"). */}
      <span><span className={compact ? "hidden min-[400px]:inline" : ""}>Back to </span>Admin</span>
    </Link>
  );
}

export const CHANGE_PASSWORD_HREF = "/account/change-password";

/** Desktop account menu: who's signed in, Change Password, Sign Out. */
function AccountMenu({ email, onSignOut }: { email?: string | null; onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account"
        data-testid="portal-account-menu"
        className="inline-flex items-center gap-1 px-2 py-2 text-white/60 hover:text-white data-[state=open]:text-white"
      >
        <UserCircle2 className="w-5 h-5" aria-hidden="true" />
        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 z-[200]">
        {email && <DropdownMenuLabel className="font-normal text-xs text-muted-foreground truncate">Signed in as {email}</DropdownMenuLabel>}
        <DropdownMenuItem asChild>
          <Link href={CHANGE_PASSWORD_HREF} className="flex items-center gap-2 cursor-pointer" data-testid="portal-change-password">
            <KeyRound className="w-4 h-4" />Account / Change Password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="flex items-center gap-2 cursor-pointer">
          <LogOut className="w-4 h-4" />Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MemberPortalNav({
  items, preview, email, showBackToAdmin = false, onSignOut,
}: { items: PortalNavItem[]; preview: PortalPreview; email?: string | null; showBackToAdmin?: boolean; onSignOut?: () => void }) {
  const [location] = useLocation();
  const search = useSearch();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location, search]);
  // Widths the full bar needs (with the account menu): ~1220px for members,
  // ~1450px with "Back to Admin". Below that the compact Menu is used.
  // (Full class names so Tailwind generates them.)
  const bar = showBackToAdmin ? "hidden min-[1536px]:flex" : "hidden xl:flex";
  const compactOnly = showBackToAdmin ? "min-[1536px]:hidden" : "xl:hidden";

  return (
    <nav aria-label="Member portal" className="bg-[#2B2823] border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-16 flex items-center justify-between gap-3 sm:gap-6">
        <Link
          href={withPreview("/portal", preview)}
          className="py-4 text-[11px] tracking-[0.2em] uppercase font-sans font-medium text-[var(--gold)] whitespace-nowrap"
        >
          Member Portal
        </Link>

        {/* Desktop */}
        <div className={`${bar} items-center gap-1`} data-testid="portal-nav-desktop">
          {items.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              variant="bar"
              href={portalNavHref(item, { email, preview })}
              active={isPortalNavItemActive(item, location, search)}
            />
          ))}
          {showBackToAdmin && <span className="ml-3"><BackToAdminLink /></span>}
          {onSignOut && <span className="ml-1"><AccountMenu email={email} onSignOut={onSignOut} /></span>}
        </div>

        {/* Mobile: Back to Admin stays visible next to the menu toggle */}
        <div className={`${compactOnly} flex items-center gap-3`}>
        {showBackToAdmin && <BackToAdminLink compact />}
        <button
          type="button"
          className="inline-flex items-center gap-2 py-3 text-[11px] tracking-[0.14em] uppercase font-sans text-white/70 hover:text-white"
          aria-expanded={open}
          aria-controls="portal-nav-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          Menu
        </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="portal-nav-mobile" className={`${compactOnly} border-t border-white/10 bg-[#2B2823] pb-2`} data-testid="portal-nav-mobile">
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
          {onSignOut && (
            <div className="mt-2 pt-2 border-t border-white/10" data-testid="portal-account-mobile">
              {email && <p className="px-6 py-2 text-[11px] text-white/40 truncate">Signed in as {email}</p>}
              <Link href={CHANGE_PASSWORD_HREF} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-6 py-3.5 text-xs tracking-[0.14em] uppercase font-sans border-l-2 border-transparent text-white/60 hover:text-white hover:bg-white/5">
                <KeyRound className="w-4 h-4" aria-hidden="true" />Account / Change Password
              </Link>
              <button type="button" onClick={() => { setOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-3 px-6 py-3.5 text-xs tracking-[0.14em] uppercase font-sans border-l-2 border-transparent text-white/60 hover:text-white hover:bg-white/5">
                <LogOut className="w-4 h-4" aria-hidden="true" />Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, preview, hasPortalAccess, items, showBackToAdmin, logout } = usePortalNav();
  return (
    <PublicLayout hideNav={isAuthenticated || preview.isPreviewMode}>
      {(preview.isPreviewMode || hasPortalAccess) && (
        <div className="sticky top-0 z-[150]">
          {preview.isPreviewMode && <PreviewBanner />}
          {hasPortalAccess && <MemberPortalNav items={items} preview={preview} email={user?.email} showBackToAdmin={showBackToAdmin} onSignOut={isAuthenticated ? () => logout() : undefined} />}
        </div>
      )}
      {children}
    </PublicLayout>
  );
}
