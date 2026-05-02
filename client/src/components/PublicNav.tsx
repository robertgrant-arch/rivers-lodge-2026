import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type Track = "weddings" | "membership" | null;

function getTrackFromPath(path: string): Track {
  if (
    path.startsWith("/weddings") ||
    path.startsWith("/corporate") ||
    path.startsWith("/lodging") ||
    path.startsWith("/venues") ||
    path.startsWith("/events")
  ) return "weddings";
  if (
    path.startsWith("/membership") ||
    path.startsWith("/hunt") ||
    path.startsWith("/fish") ||
    path.startsWith("/estate")
  ) return "membership";
  return null;
}

const weddingsDropdown = [
  { label: "Weddings", href: "/weddings", desc: "Destination wedding packages" },
  { label: "Corporate Outings", href: "/corporate", desc: "Retreats & team experiences" },
  { label: "Lodging & Spaces", href: "/lodging", desc: "On-property accommodation" },
  { label: "Venues", href: "/venues", desc: "Rivers Barn, Clubhouse & more" },
];

const membershipDropdown = [
  { label: "Hunt", href: "/hunt", desc: "Whitetail, waterfowl & more" },
  { label: "Fish", href: "/fish", desc: "Five private fisheries" },
  { label: "Membership", href: "/membership", desc: "Apply for membership" },
  { label: "The Estate", href: "/estate", desc: "About the property" },
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
  const [weddingsOpen, setWeddingsOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [mobileWeddingsOpen, setMobileWeddingsOpen] = useState(false);
  const [mobileMembershipOpen, setMobileMembershipOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const track = getTrackFromPath(location);
  const isHome = location === "/";
  const isTransparent = !scrolled && !mobileOpen;

  const weddingsRef = useRef<HTMLDivElement>(null);
  const membershipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setWeddingsOpen(false);
    setMembershipOpen(false);
  }, [location]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (weddingsRef.current && !weddingsRef.current.contains(e.target as Node)) {
        setWeddingsOpen(false);
      }
      if (membershipRef.current && !membershipRef.current.contains(e.target as Node)) {
        setMembershipOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Lock body scroll when mobile menu is open
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
          <nav className="hidden lg:flex items-center gap-1">

            {/* Weddings & Events dropdown */}
            <div ref={weddingsRef} className="relative">
              <button
                onClick={() => { setWeddingsOpen(!weddingsOpen); setMembershipOpen(false); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium transition-colors ${
                  track === "weddings" ? "text-[oklch(0.70_0.060_50)]" : "text-[oklch(0.94_0.008_78)] hover:text-[oklch(0.70_0.060_50)]"
                }`}
              >
                Weddings &amp; Events
                <ChevronDown size={12} className={`transition-transform duration-200 ${weddingsOpen ? "rotate-180" : ""}`} />
              </button>
              {weddingsOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[oklch(0.115_0.007_64)] border border-[oklch(0.22_0.008_64)] shadow-2xl py-2">
                  {weddingsDropdown.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex flex-col px-5 py-3 hover:bg-[oklch(0.14_0.007_64)] transition-colors group"
                    >
                      <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] group-hover:text-[oklch(0.70_0.060_50)] transition-colors">{item.label}</span>
                      <span className="text-[11px] font-sans text-[oklch(0.55_0.012_70)] mt-0.5 normal-case tracking-normal">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Membership & Outdoors dropdown */}
            <div ref={membershipRef} className="relative">
              <button
                onClick={() => { setMembershipOpen(!membershipOpen); setWeddingsOpen(false); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium transition-colors ${
                  track === "membership" ? "text-[oklch(0.58_0.065_145)]" : "text-[oklch(0.94_0.008_78)] hover:text-[oklch(0.58_0.065_145)]"
                }`}
              >
                Membership &amp; Outdoors
                <ChevronDown size={12} className={`transition-transform duration-200 ${membershipOpen ? "rotate-180" : ""}`} />
              </button>
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

            {/* Static links */}
            <Link href="/gallery" className="px-4 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] hover:opacity-70 transition-opacity">
              Gallery
            </Link>
            <Link href="/contact" className="px-4 py-2 text-[11px] tracking-[0.13em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] hover:opacity-70 transition-opacity">
              Contact
            </Link>
          </nav>

          {/* ── Right CTA ────────────────────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            {isAuthenticated ? (
              <Link
                href={getPortalHref(user?.role)}
                className="text-[11px] tracking-[0.15em] uppercase font-sans font-medium border border-[oklch(0.72_0.095_78)] text-[oklch(0.72_0.095_78)] px-5 py-2.5 hover:bg-[oklch(0.72_0.095_78)] hover:text-[oklch(0.095_0.006_64)] transition-all duration-200"
              >
                {getPortalLabel(user?.role)}
              </Link>
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
        {/* Top bar spacer */}
        <div className="h-16 md:h-20 shrink-0" />

        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-0">
          {/* Member Login — prominent at top */}
          <div className="pb-8 mb-8 border-b border-[oklch(0.22_0.008_64)]">
            {isAuthenticated ? (
              <Link
                href={getPortalHref(user?.role)}
                className="inline-flex items-center justify-center w-full py-3.5 border border-[oklch(0.72_0.095_78)] text-[oklch(0.72_0.095_78)] text-[11px] tracking-[0.18em] uppercase font-sans font-medium"
              >
                {getPortalLabel(user?.role)}
              </Link>
            ) : (
              <a
                href={getLoginUrl()}
                className="inline-flex items-center justify-center w-full py-3.5 border border-[oklch(0.72_0.095_78)] text-[oklch(0.72_0.095_78)] text-[11px] tracking-[0.18em] uppercase font-sans font-medium"
              >
                Member Login
              </a>
            )}
          </div>

          {/* Weddings & Events section */}
          <div className="mb-6">
            <button
              onClick={() => setMobileWeddingsOpen(!mobileWeddingsOpen)}
              className="flex items-center justify-between w-full py-3 text-left"
            >
              <span className="text-[11px] tracking-[0.18em] uppercase font-sans font-medium text-[oklch(0.60_0.015_72)]">Weddings &amp; Events</span>
              <ChevronDown size={14} className={`text-[oklch(0.60_0.015_72)] transition-transform duration-200 ${mobileWeddingsOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileWeddingsOpen && (
              <div className="pl-4 mt-2 flex flex-col gap-0 border-l border-[oklch(0.70_0.060_50)/30]">
                {weddingsDropdown.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.70_0.060_50)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Membership & Outdoors section */}
          <div className="mb-6">
            <button
              onClick={() => setMobileMembershipOpen(!mobileMembershipOpen)}
              className="flex items-center justify-between w-full py-3 text-left"
            >
              <span className="text-[11px] tracking-[0.18em] uppercase font-sans font-medium text-[oklch(0.60_0.015_72)]">Membership &amp; Outdoors</span>
              <ChevronDown size={14} className={`text-[oklch(0.60_0.015_72)] transition-transform duration-200 ${mobileMembershipOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileMembershipOpen && (
              <div className="pl-4 mt-2 flex flex-col gap-0 border-l border-[oklch(0.58_0.065_145)/30]">
                {membershipDropdown.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.58_0.065_145)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Static links */}
          <Link href="/gallery" className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.72_0.095_78)] transition-colors">
            Gallery
          </Link>
          <Link href="/contact" className="py-3 text-[oklch(0.94_0.008_78)] font-serif text-xl italic hover:text-[oklch(0.72_0.095_78)] transition-colors">
            Contact
          </Link>
        </div>

        {/* Footer of overlay */}
        <div className="px-6 py-6 border-t border-[oklch(0.22_0.008_64)]">
          <p className="text-[10px] tracking-[0.18em] uppercase font-sans text-[oklch(0.40_0.008_70)]">
            La Cygne, Kansas · 60 min from Kansas City
          </p>
        </div>
      </div>
    </>
  );
}
