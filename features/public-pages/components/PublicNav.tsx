import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, LogOut, User } from "lucide-react";
import { useAuth, getLoginUrl } from '@features/auth/public';
import { trpc } from '@shared/lib/trpc';

const STAFF_ROLES = ["admin", "owner", "venue_sales", "events_manager", "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance"];

type Track = "membership" | "outdoors" | "weddings" | "corporate" | null;

function getTrackFromPath(path: string): Track {
  if (path.startsWith("/membership") || path.startsWith("/estate")) return "membership";
  if (path.startsWith("/hunt") || path.startsWith("/fish")) return "outdoors";
  if (path.startsWith("/weddings") || path.startsWith("/lodging") || path.startsWith("/venues")) return "weddings";
  if (path.startsWith("/corporate")) return "corporate";
  return null;
}

const membershipDropdown = [
  { label: "Membership Overview", href: "/membership", desc: "Benefits and how to join" },
  { label: "Apply", href: "/membership#apply", desc: "Start your application" },
  { label: "The Estate", href: "/estate", desc: "About the property" },
];

const outdoorsDropdown = [
  { label: "Hunt", href: "/hunt", desc: "Whitetail, waterfowl & more" },
  { label: "Fish", href: "/fish", desc: "Five private fisheries" },
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

export default function PublicNav() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [outdoorsOpen, setOutdoorsOpen] = useState(false);
  const [mobileMembershipOpen, setMobileMembershipOpen] = useState(false);
  const [mobileOutdoorsOpen, setMobileOutdoorsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const membershipRef = useRef<HTMLDivElement>(null);
  const outdoorsRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuth();

  const memberStatus = trpc.membership.myStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const isStaff = !!user?.role && STAFF_ROLES.includes(user.role as string);
  const hasPortalAccess = isStaff || (!!memberStatus.data && memberStatus.data.active);

  const track = getTrackFromPath(location);
  const isTransparent = !scrolled && !mobileOpen;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMembershipOpen(false);
    setOutdoorsOpen(false);
  }, [location]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (membershipRef.current && !membershipRef.current.contains(e.target as Node)) {
        setMembershipOpen(false);
      }
      if (outdoorsRef.current && !outdoorsRef.current.contains(e.target as Node)) {
        setOutdoorsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
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
    : "bg-[oklch(0.095_0.006_64)/95] backdrop-blur-sm shadow-[0_1px_0_oklch(1_0_0/0.06)]";

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 flex items-center justify-between h-16 md:h-20">

          {/* ── Wordmark ─────────────────────────────────────────────────── */}
          <Link href="/" className="flex flex-col leading-none text-[oklch(0.94_0.008_78)] hover:opacity-80 transition-opacity shrink-0 z-10">
            <span className="font-serif text-xl md:text-[1.375rem] tracking-wide">Rivers Lodge</span>
            <span className="text-[9px] tracking-[0.24em] uppercase opacity-60 font-sans font-light mt-0.5">& Hunt Club</span>
          </Link>

          {/* ── Desktop Nav ──────────────────────────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-0.5">

            {/* 1. Explore Membership */}
            <div ref={membershipRef} className="relative">
              <div className="flex items-center">
                <Link
                  href="/membership"
                  className={`px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium transition-colors ${
                    track === "membership" ? "text-[oklch(0.58_0.065_145)]" : "text-[oklch(0.94_0.008_78)] hover:text-[oklch(0.58_0.065_145)]"
                  }`}
                >
                  Explore Membership
                </Link>
                <button
                  onClick={() => { setMembershipOpen(!membershipOpen); setOutdoorsOpen(false); }}
                  aria-label="Open Explore Membership menu"
                  className={`p-1.5 -ml-1 transition-colors ${
                    track === "membership" ? "text-[oklch(0.58_0.065_145)]" : "text-[oklch(0.94_0.008_78)] hover:text-[oklch(0.58_0.065_145)]"
                  }`}
                >
                  <ChevronDown size={11} className={`transition-transform duration-200 ${membershipOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              {membershipOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[oklch(0.115_0.007_64)] border border-[oklch(0.22_0.008_64)] shadow-2xl py-2">
                  {membershipDropdown.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex flex-col px-5 py-3 hover:bg-[oklch(0.14_0.007_64)] transition-colors group"
                    >
                      <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] group-hover:text-[oklch(0.58_0.065_145)] transition-colors">{item.label}</span>
                      <span className="text-[11px] font-sans text-[oklch(0.55_0.012_70)] mt-0.5 normal-case tracking-normal">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Outdoor Pursuits */}
            <div ref={outdoorsRef} className="relative">
              <div className="flex items-center">
                <Link
                  href="/hunt"
                  className={`px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium transition-colors ${
                    track === "outdoors" ? "text-[oklch(0.58_0.065_145)]" : "text-[oklch(0.94_0.008_78)] hover:text-[oklch(0.58_0.065_145)]"
                  }`}
                >
                  Outdoor Pursuits
                </Link>
                <button
                  onClick={() => { setOutdoorsOpen(!outdoorsOpen); setMembershipOpen(false); }}
                  aria-label="Open Outdoor Pursuits menu"
                  className={`p-1.5 -ml-1 transition-colors ${
                    track === "outdoors" ? "text-[oklch(0.58_0.065_145)]" : "text-[oklch(0.94_0.008_78)] hover:text-[oklch(0.58_0.065_145)]"
                  }`}
                >
                  <ChevronDown size={11} className={`transition-transform duration-200 ${outdoorsOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              {outdoorsOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-[oklch(0.115_0.007_64)] border border-[oklch(0.22_0.008_64)] shadow-2xl py-2">
                  {outdoorsDropdown.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex flex-col px-5 py-3 hover:bg-[oklch(0.14_0.007_64)] transition-colors group"
                    >
                      <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] group-hover:text-[oklch(0.58_0.065_145)] transition-colors">{item.label}</span>
                      <span className="text-[11px] font-sans text-[oklch(0.55_0.012_70)] mt-0.5 normal-case tracking-normal">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Food & Wine */}
            <Link
              href="/contact?type=dining"
              className="px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] hover:opacity-70 transition-opacity"
            >
              Food &amp; Wine
            </Link>

            {/* 4. Weddings */}
            <Link
              href="/weddings"
              className={`px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium transition-colors ${
                track === "weddings" ? "text-[oklch(0.70_0.060_50)]" : "text-[oklch(0.94_0.008_78)] hover:text-[oklch(0.70_0.060_50)]"
              }`}
            >
              Weddings
            </Link>

            {/* 5. Corporate Events */}
            <Link
              href="/corporate"
              className={`px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium transition-colors ${
                track === "corporate" ? "text-[oklch(0.70_0.060_50)]" : "text-[oklch(0.94_0.008_78)] hover:text-[oklch(0.70_0.060_50)]"
              }`}
            >
              Corporate Events
            </Link>

            {/* 6. Gallery */}
            <Link
              href="/gallery"
              className="px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] hover:opacity-70 transition-opacity"
            >
              Gallery
            </Link>

            {/* 7. Contact */}
            <Link
              href="/contact"
              className="px-3 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] hover:opacity-70 transition-opacity"
            >
              Contact
            </Link>
          </nav>

          {/* ── Right CTA ────────────────────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase font-sans font-medium border border-[oklch(0.72_0.095_78)] text-[oklch(0.72_0.095_78)] px-4 py-2.5 hover:bg-[oklch(0.72_0.095_78)] hover:text-[oklch(0.095_0.006_64)] transition-all duration-200"
                >
                  <User size={13} />
                  <span>{user?.name?.split(" ")[0] ?? getPortalLabel(user?.role)}</span>
                  <ChevronDown size={11} className={`transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-[oklch(0.115_0.007_64)] border border-[oklch(0.22_0.008_64)] shadow-2xl z-50">
                    <Link
                      href={getPortalHref(user?.role)}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-[11px] tracking-[0.12em] uppercase font-sans text-[oklch(0.94_0.008_78)] hover:bg-[oklch(0.18_0.006_64)] transition-colors"
                    >
                      <User size={13} />
                      {getPortalLabel(user?.role)}
                    </Link>
                    <div className="border-t border-[oklch(0.22_0.008_64)]" />
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-[11px] tracking-[0.12em] uppercase font-sans text-[oklch(0.72_0.095_78)] hover:bg-[oklch(0.18_0.006_64)] transition-colors"
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
                className="text-[11px] tracking-[0.15em] uppercase font-sans font-medium border border-[oklch(0.72_0.095_78)] text-[oklch(0.72_0.095_78)] px-5 py-2.5 hover:bg-[oklch(0.72_0.095_78)] hover:text-[oklch(0.095_0.006_64)] transition-all duration-200"
              >
                Member Login
              </a>
            )}
          </div>

          {/* ── Mobile Hamburger ─────────────────────────────────────────── */}
          <button
            className="lg:hidden p-2 text-[oklch(0.94_0.008_78)] z-10"
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
          <div className="pb-8 mb-8 border-b border-[oklch(0.22_0.008_64)]">
            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] tracking-[0.16em] uppercase font-sans text-[oklch(0.50_0.010_70)] mb-1">
                  Signed in as {user?.name ?? user?.email ?? "you"}
                </p>
                <Link
                  href={getPortalHref(user?.role)}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 border border-[oklch(0.72_0.095_78)] text-[oklch(0.72_0.095_78)] text-[11px] tracking-[0.18em] uppercase font-sans font-medium"
                >
                  <User size={13} />
                  {getPortalLabel(user?.role)}
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 text-[11px] tracking-[0.16em] uppercase font-sans font-medium text-[oklch(0.72_0.095_78)] hover:opacity-70 transition-opacity"
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            ) : (
              <a
                href={getLoginUrl()}
                className="inline-flex items-center justify-center w-full py-3.5 border border-[oklch(0.72_0.095_78)] text-[oklch(0.72_0.095_78)] text-[11px] tracking-[0.18em] uppercase font-sans font-medium"
              >
                Member Login
              </a>
            )}
          </div>

          {/* 1. Explore Membership */}
          <div className="mb-6">
            <div className="flex items-center justify-between py-3">
              <Link
                href="/membership"
                onClick={() => setMobileOpen(false)}
                className="text-[11px] tracking-[0.18em] uppercase font-sans font-medium text-[oklch(0.58_0.065_145)]"
              >
                Explore Membership
              </Link>
              <button
                onClick={() => setMobileMembershipOpen(!mobileMembershipOpen)}
                aria-label="Toggle Explore Membership"
                className="p-1 text-[oklch(0.60_0.015_72)]"
              >
                <ChevronDown size={14} className={`transition-transform duration-200 ${mobileMembershipOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            {mobileMembershipOpen && (
              <div className="pl-4 mt-1 flex flex-col gap-0 border-l border-[oklch(0.58_0.065_145)/30]">
                {membershipDropdown.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.58_0.065_145)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 2. Outdoor Pursuits */}
          <div className="mb-6">
            <div className="flex items-center justify-between py-3">
              <Link
                href="/hunt"
                onClick={() => setMobileOpen(false)}
                className="text-[11px] tracking-[0.18em] uppercase font-sans font-medium text-[oklch(0.58_0.065_145)]"
              >
                Outdoor Pursuits
              </Link>
              <button
                onClick={() => setMobileOutdoorsOpen(!mobileOutdoorsOpen)}
                aria-label="Toggle Outdoor Pursuits"
                className="p-1 text-[oklch(0.60_0.015_72)]"
              >
                <ChevronDown size={14} className={`transition-transform duration-200 ${mobileOutdoorsOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            {mobileOutdoorsOpen && (
              <div className="pl-4 mt-1 flex flex-col gap-0 border-l border-[oklch(0.58_0.065_145)/30]">
                {outdoorsDropdown.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.58_0.065_145)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 3. Food & Wine */}
          <Link
            href="/contact?type=dining"
            onClick={() => setMobileOpen(false)}
            className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.72_0.095_78)] transition-colors"
          >
            Food &amp; Wine
          </Link>

          {/* 4. Weddings */}
          <Link
            href="/weddings"
            onClick={() => setMobileOpen(false)}
            className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.70_0.060_50)] transition-colors"
          >
            Weddings
          </Link>

          {/* 5. Corporate Events */}
          <Link
            href="/corporate"
            onClick={() => setMobileOpen(false)}
            className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.70_0.060_50)] transition-colors"
          >
            Corporate Events
          </Link>

          {/* 6. Gallery */}
          <Link
            href="/gallery"
            onClick={() => setMobileOpen(false)}
            className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.72_0.095_78)] transition-colors"
          >
            Gallery
          </Link>

          {/* 7. Contact */}
          <Link
            href="/contact"
            onClick={() => setMobileOpen(false)}
            className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.72_0.095_78)] transition-colors"
          >
            Contact
          </Link>
        </div>

        <div className="px-6 py-6 border-t border-[oklch(0.22_0.008_64)]">
          <p className="text-[10px] tracking-[0.18em] uppercase font-sans text-[oklch(0.40_0.008_70)]">
            La Cygne, Kansas · 60 min from Kansas City
          </p>
        </div>
      </div>
    </>
  );
}
