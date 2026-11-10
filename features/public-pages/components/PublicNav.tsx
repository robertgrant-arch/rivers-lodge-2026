import { useState, useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, ChevronRight, LogOut, User } from "lucide-react";
import { useAuth, getLoginUrl } from '@features/auth/public';


type Track = "events" | "outdoor" | "membership" | "food" | null;

function getTrackFromPath(path: string): Track {
  if (
    path.startsWith("/weddings") || path.startsWith("/venues") ||
    path.startsWith("/corporate") ||
    path.startsWith("/weddings-events")
  ) return "events";
  if (path.startsWith("/food-and-wine")) return "food";
  if (path.startsWith("/outdoor-activities")) return "outdoor";
  if (path.startsWith("/membership")) return "membership";
  return null;
}

type NavLink = { label: string; href: string; desc: string };
/** A dropdown entry. `children` adds a slide-out child panel (desktop) / inline accordion (mobile). */
type NavItem = NavLink & { children?: NavLink[] };

/** Shared child panel used under Corporate Events and Lodging & Venues. */
const LODGING_VENUES_SUBMENU: NavLink[] = [
  { label: "Lodging", href: "/lodging#lodging", desc: "Stay on the estate" },
  { label: "Venues",  href: "/lodging#venues",  desc: "Event spaces for your group" },
];

const eventsDropdown: NavItem[] = [
  { label: "Weddings",         href: "/weddings",        desc: "Ceremonies & receptions on the Lodge" },
  { label: "Corporate Events", href: "/corporate-events", desc: "Retreats, outings & client entertainment", children: LODGING_VENUES_SUBMENU },
];

const membershipDropdown: NavItem[] = [
  { label: "Membership Overview",   href: "/membership",           desc: "Compare membership options" },
  { label: "Benefits / Why Join",   href: "/membership/benefits",  desc: "What membership includes" },
  { label: "FAQ",                   href: "/membership/faq",       desc: "Common questions answered" },
  { label: "Member Events",         href: "/membership/events",    desc: "Exclusive member gatherings" },
  { label: "Outdoor Activities",    href: "/outdoor-activities",   desc: "Hunting, fishing & more on the land" },
  { label: "Lodging & Venues",      href: "/lodging",              desc: "Where members stay and gather", children: LODGING_VENUES_SUBMENU },
];

const CHILD_PANEL_WIDTH = 256; // w-64, same as the dropdowns

/** Stable DOM id for an item's child panel; `${id}-toggle` is its chevron button. */
const submenuId = (prefix: string, menu: string, href: string) =>
  `${prefix}-${menu}-${href.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-submenu`;

/** Focusable links/buttons that belong directly to `menu` (not to a nested child panel). */
function menuFocusables(menu: Element): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>("a[href], button")).filter(
    (el) => el.closest("[data-nav-menu]") === menu && !el.closest(".invisible"),
  );
}

/**
 * Desktop dropdown entries. Items with `children` get a chevron button and a child
 * panel that slides out to the right (or left when there's no room). Hover or
 * click/Enter on the chevron opens it; the label itself still navigates.
 */
function DesktopDropdownItems({
  menu, items, linkCls, labelCls, openChild, onOpenChild, onNavigate,
}: {
  menu: string;
  items: NavItem[];
  linkCls: string;
  labelCls: string;
  openChild: { id: string; flip: boolean } | null;
  onOpenChild: (next: { id: string; flip: boolean } | null) => void;
  onNavigate: () => void;
}) {
  const hoverOpened = useRef(false);

  return (
    <>
      {items.map((item) => {
        if (!item.children) {
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={`flex flex-col px-5 py-3 ${linkCls}`}>
              <span className={`text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#E0D3BD] transition-colors ${labelCls}`}>{item.label}</span>
              <span className="text-[11px] font-sans text-[#908B82] mt-0.5 normal-case tracking-normal">{item.desc}</span>
            </Link>
          );
        }
        const id = submenuId("nav", menu, item.href);
        const open = openChild?.id === id;
        const flip = open && openChild!.flip;
        const openPanel = (row: HTMLElement) => {
          const r = row.getBoundingClientRect();
          onOpenChild({ id, flip: r.right + CHILD_PANEL_WIDTH + 8 > window.innerWidth });
        };
        return (
          <div
            key={item.href}
            className="relative flex items-stretch"
            onMouseEnter={(e) => { if (!open) { hoverOpened.current = true; openPanel(e.currentTarget); } }}
            onMouseLeave={() => { if (open) { hoverOpened.current = false; onOpenChild(null); } }}
          >
            <Link
              href={item.href}
              onClick={onNavigate}
              data-submenu={id}
              className={`flex-1 min-w-0 flex flex-col px-5 py-3 ${linkCls} ${open ? "bg-[#423F3B]" : ""}`}
            >
              <span className={`text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#E0D3BD] transition-colors ${labelCls}`}>{item.label}</span>
              <span className="text-[11px] font-sans text-[#908B82] mt-0.5 normal-case tracking-normal">{item.desc}</span>
            </Link>
            <button
              type="button"
              id={`${id}-toggle`}
              data-submenu={id}
              aria-label={`Open ${item.label} submenu`}
              aria-expanded={open}
              aria-controls={id}
              onClick={(e) => {
                const row = e.currentTarget.parentElement!;
                if (open && !hoverOpened.current) onOpenChild(null);
                else openPanel(row);
                hoverOpened.current = false;
              }}
              className={`absolute inset-y-0 right-0 w-7 flex items-center justify-center text-[#BABAAE] hover:text-[#E0D3BD] transition-colors ${open ? "text-[#E0D3BD]" : ""}`}
            >
              <ChevronRight size={12} aria-hidden="true" />
            </button>
            <NavChildPanel id={id} items={item.children} open={open} flip={flip} onNavigate={onNavigate} />
          </div>
        );
      })}
    </>
  );
}

/** Slide-out child panel, styled like the dropdowns. Kept mounted so aria-controls resolves; `invisible` when closed keeps it out of the tab order. */
function NavChildPanel({ id, items, open, flip, onNavigate }: { id: string; items: NavLink[]; open: boolean; flip: boolean; onNavigate: () => void }) {
  return (
    <div
      id={id}
      data-nav-menu
      data-parent-toggle={`${id}-toggle`}
      className={`absolute -top-[9px] ${flip ? "right-full" : "left-full"} w-64 bg-[#363330] border border-[#57544E] shadow-2xl py-2 z-50 ${
        // 180ms slide/fade. Visibility flips at once on open (so focus can move in) and after the fade on close.
        open
          ? "visible opacity-100 translate-x-0 [transition:opacity_180ms_ease-out,transform_180ms_ease-out]"
          : `invisible opacity-0 pointer-events-none ${flip ? "translate-x-2" : "-translate-x-2"} [transition:opacity_180ms_ease-out,transform_180ms_ease-out,visibility_0s_linear_180ms]`
      }`}
    >
      {items.map((c) => (
        <Link key={c.href} href={c.href} onClick={onNavigate} tabIndex={open ? undefined : -1} className="flex flex-col px-5 py-3 border-l-2 border-transparent hover:border-rl-river hover:bg-[#423F3B] focus-visible:border-rl-river focus-visible:bg-[#423F3B] transition-colors group">
          <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#E0D3BD] transition-colors">{c.label}</span>
          <span className="text-[11px] font-sans text-[#908B82] mt-0.5 normal-case tracking-normal">{c.desc}</span>
        </Link>
      ))}
    </div>
  );
}

/** Mobile accordion entries; items with `children` get an indented inline sub-accordion. */
function MobileDropdownItems({
  menu, items, linkCls, openChild, onToggleChild, onNavigate,
}: {
  menu: string;
  items: NavItem[];
  linkCls: (item: NavLink) => string;
  openChild: string | null;
  onToggleChild: (id: string) => void;
  onNavigate: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const link = (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={`py-3 font-serif text-xl italic transition-colors ${linkCls(item)}`}>
            {item.label}
          </Link>
        );
        if (!item.children) return link;
        const id = submenuId("m-nav", menu, item.href);
        const open = openChild === id;
        return (
          <div key={item.href}>
            <div className="flex items-center justify-between">
              {link}
              <button
                type="button"
                onClick={() => onToggleChild(id)}
                aria-label={`Open ${item.label} submenu`}
                aria-expanded={open}
                aria-controls={id}
                className="p-1 text-[#BABAAE]"
              >
                <ChevronDown size={14} className={chevronCls(open)} aria-hidden="true" />
              </button>
            </div>
            <div id={id} hidden={!open} className="pl-4 mb-2 flex flex-col gap-0 border-l border-rl-river/60">
              {item.children.map((c) => (
                <Link key={c.href} href={c.href} onClick={onNavigate} className={`py-2 font-serif text-lg italic transition-colors ${linkCls(c)}`}>
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function getPortalHref(role?: string): string {
  return role === "admin" ? "/ops" : "/portal";
}

function getPortalLabel(role?: string): string {
  return role === "admin" ? "Admin Portal" : "Member Portal";
}

const SAGE   = "#6B7250";

// River (#576276) is too low-contrast for text on the dark nav (~2.4:1), so
// hover/active nav links stay Sand and show a River underline instead.
const riverLinkCls = (active: boolean) =>
  `text-[#E0D3BD] underline-offset-[6px] decoration-2 ${
    active ? "underline decoration-rl-river" : "hover:underline hover:decoration-rl-river"
  }`;

const chevronCls = (open: boolean) =>
  `transition-transform duration-200 ${open ? "rotate-180" : ""}`;

export default function PublicNav() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Desktop dropdowns
  const [eventsOpen,     setEventsOpen]     = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);

  // Mobile accordions
  const [mobileEventsOpen,     setMobileEventsOpen]     = useState(false);
  const [mobileMembershipOpen, setMobileMembershipOpen] = useState(false);

  // Child panels (one open at a time): desktop slide-out, mobile inline accordion
  const [openChild,       setOpenChild]       = useState<{ id: string; flip: boolean } | null>(null);
  const [mobileOpenChild, setMobileOpenChild] = useState<string | null>(null);

  const eventsRef     = useRef<HTMLDivElement>(null);
  const membershipRef = useRef<HTMLDivElement>(null);
  const userMenuRef   = useRef<HTMLDivElement>(null);
  const eventsTriggerRef     = useRef<HTMLButtonElement>(null);
  const membershipTriggerRef = useRef<HTMLButtonElement>(null);

  const { user, isAuthenticated, logout } = useAuth();

  const hasPortalAccess = isAuthenticated && (user?.role === "admin" || user?.role === "employee");

  const track = getTrackFromPath(location);
  const isTransparent = !scrolled && !mobileOpen;

  function closeAll() {
    setEventsOpen(false);
    setMembershipOpen(false);
    setOpenChild(null);
    setMobileOpenChild(null);
  }

  // Esc closes an open child panel first, then the dropdown; focus returns to the opener.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const active = document.activeElement;
      if (openChild) {
        const panel = document.getElementById(openChild.id);
        const toggle = document.getElementById(`${openChild.id}-toggle`);
        if (panel?.contains(active) || toggle === active) toggle?.focus();
        setOpenChild(null);
      } else if (eventsOpen) {
        if (eventsRef.current?.contains(active)) eventsTriggerRef.current?.focus();
        setEventsOpen(false);
      } else if (membershipOpen) {
        if (membershipRef.current?.contains(active)) membershipTriggerRef.current?.focus();
        setMembershipOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openChild, eventsOpen, membershipOpen]);

  // Closing a dropdown closes its child panels.
  useEffect(() => {
    if (!eventsOpen && !membershipOpen) setOpenChild(null);
  }, [eventsOpen, membershipOpen]);
  useEffect(() => {
    if (!mobileOpen) setMobileOpenChild(null);
  }, [mobileOpen]);

  /** ArrowDown on a dropdown trigger opens it and focuses the first entry. */
  function onTriggerKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>, which: "events" | "membership") {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    setEventsOpen(which === "events");
    setMembershipOpen(which === "membership");
    const wrap = which === "events" ? eventsRef : membershipRef;
    requestAnimationFrame(() => {
      const menu = wrap.current?.querySelector("[data-nav-menu]");
      if (menu) menuFocusables(menu)[0]?.focus();
    });
  }

  /** Arrow-key movement inside an open dropdown / child panel. */
  function onDropdownKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return;
    const menu = active.closest("[data-nav-menu]");
    if (!menu || !e.currentTarget.contains(menu)) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const items = menuFocusables(menu);
      const i = items.indexOf(active);
      if (i === -1) return;
      e.preventDefault();
      const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next]?.focus();
    } else if (e.key === "ArrowRight") {
      const id = active.getAttribute("data-submenu");
      if (!id) return;
      e.preventDefault();
      const toggle = document.getElementById(`${id}-toggle`);
      const row = toggle?.parentElement;
      if (!row) return;
      const r = row.getBoundingClientRect();
      setOpenChild({ id, flip: r.right + CHILD_PANEL_WIDTH + 8 > window.innerWidth });
      requestAnimationFrame(() => {
        const panel = document.getElementById(id);
        if (panel) menuFocusables(panel)[0]?.focus();
      });
    } else if (e.key === "ArrowLeft") {
      const toggleId = menu.getAttribute("data-parent-toggle");
      if (!toggleId) return;
      e.preventDefault();
      setOpenChild(null);
      document.getElementById(toggleId)?.focus();
    }
  }

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    closeAll();
  }, [location]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (eventsRef.current     && !eventsRef.current.contains(target))     setEventsOpen(false);
      if (membershipRef.current && !membershipRef.current.contains(target)) setMembershipOpen(false);
      if (userMenuRef.current   && !userMenuRef.current.contains(target))   setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navBg = isTransparent
    ? "bg-transparent"
    : "bg-[#2B2823]/95 backdrop-blur-sm shadow-[0_1px_0_oklch(1_0_0/0.06)]";

  const activeColor = (active: boolean, color: string) =>
    active ? color : "#E0D3BD";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {isTransparent && (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)",
              height: "160px",
              top: 0,
              left: 0,
              right: 0,
              zIndex: -1,
            }}
          />
        )}

        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 flex items-center h-16 md:h-20">

          {/* ── Wordmark ─────────────────────────────────────────────────── */}
          <Link href="/" className="flex flex-col leading-none text-[#E0D3BD] hover:opacity-80 transition-opacity shrink-0 z-10">
            <span className="font-serif text-xl md:text-[1.375rem] tracking-wide">Rivers Lodge</span>
          </Link>

          {/* ── Desktop Nav ──────────────────────────────────────────────── */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-0">

            {/* 1. Weddings & Events ▾ */}
            <div ref={eventsRef} className="relative">
              <button
                ref={eventsTriggerRef}
                onKeyDown={(e) => onTriggerKeyDown(e, "events")}
                onClick={() => { setEventsOpen(!eventsOpen); setMembershipOpen(false); }}
                aria-expanded={eventsOpen}
                aria-haspopup="true"
                className={`flex items-center gap-1 px-2 py-2 text-[11px] tracking-[0.09em] uppercase font-sans font-medium whitespace-nowrap transition-colors ${riverLinkCls(track === "events")}`}
              >
                Weddings &amp; Events
                <ChevronDown size={11} className={chevronCls(eventsOpen)} />
              </button>
              {eventsOpen && (
                <div data-nav-menu onKeyDown={onDropdownKeyDown} className="absolute top-full left-0 mt-1 w-64 bg-[#363330] border border-[#57544E] shadow-2xl py-2 z-50">
                  <DesktopDropdownItems
                    menu="events"
                    items={eventsDropdown}
                    linkCls="border-l-2 border-transparent hover:border-rl-river hover:bg-[#423F3B] transition-colors group"
                    labelCls=""
                    openChild={openChild}
                    onOpenChild={setOpenChild}
                    onNavigate={closeAll}
                  />
                </div>
              )}
            </div>

            {/* 2. Explore Membership ▾ */}
            <div ref={membershipRef} className="relative">
              <div className="flex items-center">
                <Link
                  href="/membership"
                  className="px-2 py-2 text-[11px] tracking-[0.09em] uppercase font-sans font-medium whitespace-nowrap transition-colors"
                  style={{ color: track === "membership" ? SAGE : "#E0D3BD" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = SAGE; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = track === "membership" ? SAGE : "#E0D3BD"; }}
                >
                  Explore Membership
                </Link>
                <button
                  ref={membershipTriggerRef}
                  onKeyDown={(e) => onTriggerKeyDown(e, "membership")}
                  onClick={() => { setMembershipOpen(!membershipOpen); setEventsOpen(false); }}
                  aria-label="Open Explore Membership menu"
                  aria-expanded={membershipOpen}
                  className="p-1.5 -ml-1 transition-colors"
                  style={{ color: track === "membership" ? SAGE : "#E0D3BD" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = SAGE; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = track === "membership" ? SAGE : "#E0D3BD"; }}
                >
                  <ChevronDown size={11} className={chevronCls(membershipOpen)} />
                </button>
              </div>
              {membershipOpen && (
                <div data-nav-menu onKeyDown={onDropdownKeyDown} className="absolute top-full left-0 mt-1 w-64 bg-[#363330] border border-[#57544E] shadow-2xl py-2 z-50">
                  <DesktopDropdownItems
                    menu="membership"
                    items={membershipDropdown}
                    linkCls="hover:bg-[#423F3B] transition-colors group"
                    labelCls="group-hover:text-[#6B7250]"
                    openChild={openChild}
                    onOpenChild={setOpenChild}
                    onNavigate={closeAll}
                  />
                </div>
              )}
            </div>

            {/* 3. Food & Wine */}
            <Link
              href="/food-and-wine"
              className={`px-2 py-2 text-[11px] tracking-[0.09em] uppercase font-sans font-medium whitespace-nowrap transition-colors ${riverLinkCls(track === "food")}`}
            >
              Food &amp; Wine
            </Link>

            {/* 4. Outdoor Activities */}
            <Link
              href="/outdoor-activities"
              className="px-2 py-2 text-[11px] tracking-[0.09em] uppercase font-sans font-medium whitespace-nowrap transition-colors"
              style={{ color: activeColor(track === "outdoor", SAGE) }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = SAGE; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = activeColor(track === "outdoor", SAGE); }}
            >
              Outdoor Activities
            </Link>

          </nav>

          {/* ── Right CTA (Member Login) ──────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-4 flex-none">
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase font-sans font-medium border border-rl-river text-[#E0D3BD] px-4 py-2.5 hover:bg-rl-river transition-all duration-200"
                >
                  <User size={13} />
                  <span>{user?.email?.split("@")[0] ?? getPortalLabel(user?.role)}</span>
                  <ChevronDown size={11} className={`transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-[#363330] border border-[#57544E] shadow-2xl z-50">
                    <Link
                      href={getPortalHref(user?.role)}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-[11px] tracking-[0.12em] uppercase font-sans text-[#E0D3BD] hover:bg-[#363330] transition-colors"
                    >
                      <User size={13} />
                      {getPortalLabel(user?.role)}
                    </Link>
                    <div className="border-t border-[#57544E]" />
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-[11px] tracking-[0.12em] uppercase font-sans text-[#E0D3BD] hover:bg-[#423F3B] transition-colors"
                    >
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a
                href={getLoginUrl()}
                className="text-[11px] tracking-[0.15em] uppercase font-sans font-medium border border-rl-river text-[#E0D3BD] px-5 py-2.5 hover:bg-rl-river transition-all duration-200"
              >
                Member Login
              </a>
            )}
          </div>

          {/* ── Mobile Hamburger ─────────────────────────────────────────── */}
          <button
            className="md:hidden p-2 text-[#E0D3BD] z-10 ml-auto"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* ── Mobile Full-Screen Overlay ──────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-background flex flex-col transition-all duration-400 md:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="h-16 md:h-20 shrink-0" />

        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-0">

          {/* Member Login — prominent at top */}
          <div className="pb-8 mb-8 border-b border-[#57544E]">
            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] tracking-[0.16em] uppercase font-sans text-[oklch(0.50_0.010_70)] mb-1">
                  Signed in as {user?.email ?? "you"}
                </p>
                <Link
                  href={getPortalHref(user?.role)}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 border border-rl-river text-[#E0D3BD] text-[11px] tracking-[0.18em] uppercase font-sans font-medium"
                >
                  <User size={13} />
                  {getPortalLabel(user?.role)}
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 text-[11px] tracking-[0.16em] uppercase font-sans font-medium text-[#E0D3BD] hover:opacity-70 transition-opacity"
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            ) : (
              <a
                href={getLoginUrl()}
                className="inline-flex items-center justify-center w-full py-3.5 border border-rl-river text-[#E0D3BD] text-[11px] tracking-[0.18em] uppercase font-sans font-medium"
              >
                Member Login
              </a>
            )}
          </div>

          {/* 1. Weddings & Events */}
          <div className="mb-2">
            <div className="flex items-center justify-between py-3">
              <span className={`text-[11px] tracking-[0.18em] uppercase font-sans font-medium ${riverLinkCls(track === "events")}`}>
                Weddings &amp; Events
              </span>
              <button
                onClick={() => setMobileEventsOpen(!mobileEventsOpen)}
                aria-label="Toggle Events"
                className="p-1 text-[#BABAAE]"
              >
                <ChevronDown size={14} className={chevronCls(mobileEventsOpen)} />
              </button>
            </div>
            {mobileEventsOpen && (
              <div className="pl-4 mt-1 flex flex-col gap-0 border-l border-rl-river">
                <MobileDropdownItems
                  menu="events"
                  items={eventsDropdown}
                  linkCls={(item) => riverLinkCls(location === item.href)}
                  openChild={mobileOpenChild}
                  onToggleChild={(id) => setMobileOpenChild(mobileOpenChild === id ? null : id)}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            )}
          </div>

          {/* 2. Explore Membership */}
          <div className="mb-2">
            <div className="flex items-center justify-between py-3">
              <Link
                href="/membership"
                onClick={() => setMobileOpen(false)}
                className="text-[11px] tracking-[0.18em] uppercase font-sans font-medium text-[#6B7250]"
              >
                Explore Membership
              </Link>
              <button
                onClick={() => setMobileMembershipOpen(!mobileMembershipOpen)}
                aria-label="Toggle Explore Membership"
                className="p-1 text-[#BABAAE]"
              >
                <ChevronDown size={14} className={chevronCls(mobileMembershipOpen)} />
              </button>
            </div>
            {mobileMembershipOpen && (
              <div className="pl-4 mt-1 flex flex-col gap-0 border-l border-[#6B7250]/30">
                <MobileDropdownItems
                  menu="membership"
                  items={membershipDropdown}
                  linkCls={() => "text-[#E0D3BD] hover:text-[#6B7250]"}
                  openChild={mobileOpenChild}
                  onToggleChild={(id) => setMobileOpenChild(mobileOpenChild === id ? null : id)}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            )}
          </div>

          {/* 3. Food & Wine */}
          <Link
            href="/food-and-wine"
            onClick={() => setMobileOpen(false)}
            className={`py-3 text-[11px] tracking-[0.18em] uppercase font-sans font-medium transition-colors ${riverLinkCls(track === "food")}`}
          >
            Food &amp; Wine
          </Link>

          {/* 4. Outdoor Activities */}
          <Link
            href="/outdoor-activities"
            onClick={() => setMobileOpen(false)}
            className="py-3 text-[11px] tracking-[0.18em] uppercase font-sans font-medium text-[#E0D3BD] hover:text-[#6B7250] transition-colors"
          >
            Outdoor Activities
          </Link>

        </div>

        <div className="px-6 py-6 border-t border-[#57544E]">
          <p className="text-[10px] tracking-[0.18em] uppercase font-sans text-[#6B6760]">
            La Cygne, Kansas · 60 min from Kansas City
          </p>
        </div>
      </div>
    </>
  );
}
