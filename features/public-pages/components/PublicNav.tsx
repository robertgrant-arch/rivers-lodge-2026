import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, LogOut, User } from "lucide-react";
import { useAuth, getLoginUrl } from '@features/auth/public';
import { trpc } from '@shared/lib/trpc';

const STAFF_ROLES = ["admin", "owner", "venue_sales", "events_manager", "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance"];

type Track = "events" | "lodging" | "membership" | "about" | null;

function getTrackFromPath(path: string): Track {
  if (
    path.startsWith("/weddings") || path.startsWith("/venues") ||
    path.startsWith("/corporate") || path.startsWith("/food-and-wine") ||
    path.startsWith("/outdoor-activities")
  ) return "events";
  if (path.startsWith("/lodging")) return "lodging";
  if (path.startsWith("/membership") || path.startsWith("/estate")) return "membership";
  if (path.startsWith("/about") || path.startsWith("/contact")) return "about";
  return null;
}

const eventsDropdown = [
  { label: "Weddings",            href: "/weddings",            desc: "Ceremonies & receptions on the estate" },
  { label: "Corporate Events",    href: "/corporate",           desc: "Retreats, outings & meetings" },
  { label: "Food & Wine",         href: "/food-and-wine",       desc: "Chef-driven, land-to-table dining" },
  { label: "Outdoor Activities",  href: "/outdoor-activities",  desc: "Hunting, fishing & more on the estate" },
];

const lodgingDropdown = [
  { label: "The Lodge",           href: "/lodging#the-lodge",   desc: "Main lodge accommodations" },
  { label: "Riverhouse Suites",   href: "/lodging#riverhouse",  desc: "Suites on the Marais des Cygnes" },
  { label: "The Barn",            href: "/lodging#the-barn",    desc: "Rustic event & lodging barn" },
  { label: "Outdoor Activities",  href: "/outdoor-activities",  desc: "Hunting, fishing & more on the estate" },
];

const membershipDropdown = [
  { label: "Membership Tiers", href: "/membership",          desc: "Compare membership options" },
  { label: "Member Benefits",  href: "/membership/benefits", desc: "What membership includes" },
  { label: "FAQ",              href: "/membership/faq",      desc: "Common questions answered" },
];

const aboutDropdown = [
  { label: "Our Story",    href: "/about",          desc: "The history of Rivers Lodge" },
  { label: "Meet the Team",href: "/about/team",     desc: "The people behind the lodge" },
  { label: "The Property", href: "/about/property", desc: "The estate and its land" },
  { label: "Contact",      href: "/contact",        desc: "Get in touch" },
];

function getPortalHref(role?: string): string {
  if (!role) return "/portal";
  if (role === "admin" || role === "owner") return "/admin";
  const staffRoles = ["venue_sales","events_manager","membership_manager","hunt_fish_ops","hospitality","staff","finance"];
  if (staffRoles.includes(role)) return "/ops";
  return "/portal";
}

function getPortalLabel(role?: string): string {
  if (!role) return "Member Portal";
  if (role === "admin" || role === "owner") return "Admin";
  const staffRoles = ["venue_sales","events_manager","membership_manager","hunt_fish_ops","hospitality","staff","finance"];
  if (staffRoles.includes(role)) return "Operations";
  return "Member Portal";
}

const ORANGE = "#9B4D19";
const SAGE   = "#6B7250";
const GOLD   = "#9B4D19";

function desktopItemCls(active: boolean, color: string) {
  return `px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium transition-colors ${
    active
      ? `text-[${color}]`
      : `text-[#E0D3BD] hover:text-[${color}]`
  }`;
}

type DropItem = { label: string; href: string; desc: string };

function DropdownMenu({ items, accentColor }: { items: DropItem[]; accentColor: string }) {
  return (
    <div className="absolute top-full left-0 mt-1 w-64 bg-[#363330] border border-[#57544E] shadow-2xl py-2 z-50">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-col px-5 py-3 hover:bg-[#423F3B] transition-colors group"
        >
          <span
            className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#E0D3BD] transition-colors"
            style={{ "--hover-color": accentColor } as React.CSSProperties}
          >
            {item.label}
          </span>
          <span className="text-[11px] font-sans text-[#908B82] mt-0.5 normal-case tracking-normal">{item.desc}</span>
        </Link>
      ))}
    </div>
  );
}

export default function PublicNav() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Desktop dropdowns
  const [eventsOpen,     setEventsOpen]     = useState(false);
  const [lodgingOpen,    setLodgingOpen]    = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [aboutOpen,      setAboutOpen]      = useState(false);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);

  // Mobile accordions
  const [mobileEventsOpen,     setMobileEventsOpen]     = useState(false);
  const [mobileLodgingOpen,    setMobileLodgingOpen]    = useState(false);
  const [mobileMembershipOpen, setMobileMembershipOpen] = useState(false);
  const [mobileAboutOpen,      setMobileAboutOpen]      = useState(false);

  const eventsRef     = useRef<HTMLDivElement>(null);
  const lodgingRef    = useRef<HTMLDivElement>(null);
  const membershipRef = useRef<HTMLDivElement>(null);
  const aboutRef      = useRef<HTMLDivElement>(null);
  const userMenuRef   = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, logout } = useAuth();

  const memberStatus = trpc.membership.myStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const isStaff = !!user?.role && STAFF_ROLES.includes(user.role as string);
  const hasPortalAccess = isStaff || (!!memberStatus.data && memberStatus.data.active);

  const track = getTrackFromPath(location);
  const isTransparent = !scrolled && !mobileOpen;

  function closeAll() {
    setEventsOpen(false);
    setLodgingOpen(false);
    setMembershipOpen(false);
    setAboutOpen(false);
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
      if (lodgingRef.current    && !lodgingRef.current.contains(target))    setLodgingOpen(false);
      if (membershipRef.current && !membershipRef.current.contains(target)) setMembershipOpen(false);
      if (aboutRef.current      && !aboutRef.current.contains(target))      setAboutOpen(false);
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

  const chevronCls = (open: boolean) =>
    `transition-transform duration-200 ${open ? "rotate-180" : ""}`;

  function DesktopDropdownTrigger({
    label, isOpen, onToggle, activeColor, active,
  }: {
    label: string; isOpen: boolean; onToggle: () => void; activeColor: string; active: boolean;
  }) {
    const color = active ? activeColor : "#E0D3BD";
    const style: React.CSSProperties = active
      ? { color: activeColor }
      : {};
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-1 px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium text-[#E0D3BD] transition-colors"
        style={style}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = activeColor; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = active ? activeColor : "#E0D3BD"; }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown size={11} className={chevronCls(isOpen)} />
      </button>
    );
  }

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

        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 flex items-center justify-between h-16 md:h-20">

          {/* ── Wordmark ─────────────────────────────────────────────────── */}
          <Link href="/" className="flex flex-col leading-none text-[#E0D3BD] hover:opacity-80 transition-opacity shrink-0 z-10">
            <span className="font-serif text-xl md:text-[1.375rem] tracking-wide">Rivers Lodge</span>
            <span className="text-[9px] tracking-[0.24em] uppercase opacity-60 font-sans font-light mt-0.5">&amp; Hunt Club</span>
          </Link>

          {/* ── Desktop Nav ──────────────────────────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-0.5">

            {/* 1. Events ▾ */}
            <div ref={eventsRef} className="relative">
              <DesktopDropdownTrigger
                label="Events"
                isOpen={eventsOpen}
                activeColor={ORANGE}
                active={track === "events"}
                onToggle={() => { setEventsOpen(!eventsOpen); setLodgingOpen(false); setMembershipOpen(false); setAboutOpen(false); }}
              />
              {eventsOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[#363330] border border-[#57544E] shadow-2xl py-2 z-50">
                  {eventsDropdown.map((item) => (
                    <Link key={item.href} href={item.href} className="flex flex-col px-5 py-3 hover:bg-[#423F3B] transition-colors group">
                      <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#E0D3BD] group-hover:text-[#9B4D19] transition-colors">{item.label}</span>
                      <span className="text-[11px] font-sans text-[#908B82] mt-0.5 normal-case tracking-normal">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Lodging ▾ */}
            <div ref={lodgingRef} className="relative">
              <DesktopDropdownTrigger
                label="Lodging"
                isOpen={lodgingOpen}
                activeColor={ORANGE}
                active={track === "lodging"}
                onToggle={() => { setLodgingOpen(!lodgingOpen); setEventsOpen(false); setMembershipOpen(false); setAboutOpen(false); }}
              />
              {lodgingOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[#363330] border border-[#57544E] shadow-2xl py-2 z-50">
                  {lodgingDropdown.map((item) => (
                    <Link key={item.href} href={item.href} className="flex flex-col px-5 py-3 hover:bg-[#423F3B] transition-colors group">
                      <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#E0D3BD] group-hover:text-[#9B4D19] transition-colors">{item.label}</span>
                      <span className="text-[11px] font-sans text-[#908B82] mt-0.5 normal-case tracking-normal">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Explore Membership ▾ */}
            <div ref={membershipRef} className="relative">
              <div className="flex items-center">
                <Link
                  href="/membership"
                  className={`px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium transition-colors ${
                    track === "membership" ? "text-[#6B7250]" : "text-[#E0D3BD] hover:text-[#6B7250]"
                  }`}
                >
                  Explore Membership
                </Link>
                <button
                  onClick={() => { setMembershipOpen(!membershipOpen); setEventsOpen(false); setLodgingOpen(false); setAboutOpen(false); }}
                  aria-label="Open Explore Membership menu"
                  className={`p-1.5 -ml-1 transition-colors ${
                    track === "membership" ? "text-[#6B7250]" : "text-[#E0D3BD] hover:text-[#6B7250]"
                  }`}
                >
                  <ChevronDown size={11} className={chevronCls(membershipOpen)} />
                </button>
              </div>
              {membershipOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[#363330] border border-[#57544E] shadow-2xl py-2 z-50">
                  {membershipDropdown.map((item) => (
                    <Link key={item.href} href={item.href} className="flex flex-col px-5 py-3 hover:bg-[#423F3B] transition-colors group">
                      <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#E0D3BD] group-hover:text-[#6B7250] transition-colors">{item.label}</span>
                      <span className="text-[11px] font-sans text-[#908B82] mt-0.5 normal-case tracking-normal">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 4. About ▾ */}
            <div ref={aboutRef} className="relative">
              <DesktopDropdownTrigger
                label="About"
                isOpen={aboutOpen}
                activeColor={GOLD}
                active={track === "about"}
                onToggle={() => { setAboutOpen(!aboutOpen); setEventsOpen(false); setLodgingOpen(false); setMembershipOpen(false); }}
              />
              {aboutOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[#363330] border border-[#57544E] shadow-2xl py-2 z-50">
                  {aboutDropdown.map((item) => (
                    <Link key={item.href} href={item.href} className="flex flex-col px-5 py-3 hover:bg-[#423F3B] transition-colors group">
                      <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#E0D3BD] group-hover:text-[#9B4D19] transition-colors">{item.label}</span>
                      <span className="text-[11px] font-sans text-[#908B82] mt-0.5 normal-case tracking-normal">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Gallery */}
            <Link
              href="/gallery"
              className="px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium text-[#E0D3BD] hover:opacity-70 transition-opacity"
            >
              Gallery
            </Link>

          </nav>

          {/* ── Right CTA (Member Login) ──────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase font-sans font-medium border border-[#9B4D19] text-[#9B4D19] px-4 py-2.5 hover:bg-[#9B4D19] hover:text-[#2B2823] transition-all duration-200"
                >
                  <User size={13} />
                  <span>{user?.name?.split(" ")[0] ?? getPortalLabel(user?.role)}</span>
                  <ChevronDown size={11} className={chevronCls(userMenuOpen)} />
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
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-[11px] tracking-[0.12em] uppercase font-sans text-[#9B4D19] hover:bg-[#363330] transition-colors"
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
                className="text-[11px] tracking-[0.15em] uppercase font-sans font-medium border border-[#9B4D19] text-[#9B4D19] px-5 py-2.5 hover:bg-[#9B4D19] hover:text-[#2B2823] transition-all duration-200"
              >
                Member Login
              </a>
            )}
          </div>

          {/* ── Mobile Hamburger ─────────────────────────────────────────── */}
          <button
            className="lg:hidden p-2 text-[#E0D3BD] z-10"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* ── Mobile Full-Screen Overlay ──────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-background flex flex-col transition-all duration-400 lg:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="h-16 md:h-20 shrink-0" />

        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-0">

          {/* Member Login — prominent at top */}
          <div className="pb-8 mb-8 border-b border-[#57544E]">
            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] tracking-[0.16em] uppercase font-sans text-[#7A766F] mb-1">
                  Signed in as {user?.name ?? user?.email ?? "you"}
                </p>
                <Link
                  href={getPortalHref(user?.role)}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 border border-[#9B4D19] text-[#9B4D19] text-[11px] tracking-[0.18em] uppercase font-sans font-medium"
                >
                  <User size={13} />
                  {getPortalLabel(user?.role)}
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 text-[11px] tracking-[0.16em] uppercase font-sans font-medium text-[#9B4D19] hover:opacity-70 transition-opacity"
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            ) : (
              <a
                href={getLoginUrl()}
                className="inline-flex items-center justify-center w-full py-3.5 border border-[#9B4D19] text-[#9B4D19] text-[11px] tracking-[0.18em] uppercase font-sans font-medium"
              >
                Member Login
              </a>
            )}
          </div>

          {/* 1. Events */}
          <div className="mb-2">
            <div className="flex items-center justify-between py-3">
              <span className="text-[11px] tracking-[0.18em] uppercase font-sans font-medium text-[#9B4D19]">
                Events
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
              <div className="pl-4 mt-1 flex flex-col gap-0 border-l border-[#9B4D19/30]">
                {eventsDropdown.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 text-[#E0D3BD] font-serif text-xl italic hover:text-[#9B4D19] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 2. Lodging */}
          <div className="mb-2">
            <div className="flex items-center justify-between py-3">
              <span className="text-[11px] tracking-[0.18em] uppercase font-sans font-medium text-[#9B4D19]">
                Lodging
              </span>
              <button
                onClick={() => setMobileLodgingOpen(!mobileLodgingOpen)}
                aria-label="Toggle Lodging"
                className="p-1 text-[#BABAAE]"
              >
                <ChevronDown size={14} className={chevronCls(mobileLodgingOpen)} />
              </button>
            </div>
            {mobileLodgingOpen && (
              <div className="pl-4 mt-1 flex flex-col gap-0 border-l border-[#9B4D19/30]">
                {lodgingDropdown.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 text-[#E0D3BD] font-serif text-xl italic hover:text-[#9B4D19] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 3. Explore Membership */}
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
              <div className="pl-4 mt-1 flex flex-col gap-0 border-l border-[#6B7250/30]">
                {membershipDropdown.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 text-[#E0D3BD] font-serif text-xl italic hover:text-[#6B7250] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 4. About */}
          <div className="mb-2">
            <div className="flex items-center justify-between py-3">
              <span className="text-[11px] tracking-[0.18em] uppercase font-sans font-medium text-[#9B4D19]">
                About
              </span>
              <button
                onClick={() => setMobileAboutOpen(!mobileAboutOpen)}
                aria-label="Toggle About"
                className="p-1 text-[#BABAAE]"
              >
                <ChevronDown size={14} className={chevronCls(mobileAboutOpen)} />
              </button>
            </div>
            {mobileAboutOpen && (
              <div className="pl-4 mt-1 flex flex-col gap-0 border-l border-[#9B4D19/30]">
                {aboutDropdown.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 text-[#E0D3BD] font-serif text-xl italic hover:text-[#9B4D19] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 5. Gallery */}
          <Link
            href="/gallery"
            onClick={() => setMobileOpen(false)}
            className="py-3 text-[#E0D3BD] font-serif text-xl italic hover:text-[#9B4D19] transition-colors"
          >
            Gallery
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
