import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type Track = "weddings" | "membership" | null;

function getTrackFromPath(path: string): Track {
  if (
    path.startsWith("/weddings") ||
    path.startsWith("/corporate") ||
    path.startsWith("/lodging") ||
    path.startsWith("/venue")
  ) return "weddings";
  if (
    path.startsWith("/membership") ||
    path.startsWith("/hunt") ||
    path.startsWith("/fish")
  ) return "membership";
  return null;
}

const weddingsNav = [
  { label: "The Estate", href: "/estate" },
  { label: "Weddings", href: "/weddings" },
  { label: "Venues", href: "/venues" },
  { label: "Lodging", href: "/lodging" },
  { label: "Corporate", href: "/corporate" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

const membershipNav = [
  { label: "The Estate", href: "/estate" },
  { label: "Hunt", href: "/hunt" },
  { label: "Membership", href: "/membership" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

export default function PublicNav() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const track = getTrackFromPath(location);
  const navItems = track === "membership" ? membershipNav : weddingsNav;
  const isHome = location === "/";
  const isTransparent = (isHome || !scrolled) && !open;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location]);

  const navBg = scrolled || open
    ? "bg-[oklch(0.13_0.008_66)] shadow-md"
    : "bg-transparent";

  const textColor = "text-[oklch(0.97_0.005_80)]";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link href="/" className={`flex flex-col leading-none ${textColor} hover:opacity-80 transition-opacity`}>
          <span className="font-serif text-xl md:text-2xl tracking-wide">Rivers Lodge</span>
          <span className="text-[10px] tracking-[0.22em] uppercase opacity-70 font-sans font-light">& Hunt Club</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs tracking-[0.14em] uppercase font-sans font-medium transition-opacity hover:opacity-70 ${textColor}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right CTAs */}
        <div className="hidden lg:flex items-center gap-4">
          {isAuthenticated ? (
            <Link
              href={user?.role === "admin" ? "/admin" : "/portal"}
              className={`text-xs tracking-[0.14em] uppercase font-sans font-medium border border-current px-4 py-2 transition-opacity hover:opacity-70 ${textColor}`}
            >
              {user?.role === "admin" ? "Admin" : "Member Portal"}
            </Link>
          ) : (
            <a
              href={getLoginUrl()}
              className={`text-xs tracking-[0.14em] uppercase font-sans font-medium border border-current px-4 py-2 transition-opacity hover:opacity-70 ${textColor}`}
            >
              Member Login
            </a>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className={`lg:hidden p-2 ${textColor}`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden bg-[oklch(0.13_0.008_66)] border-t border-white/10 px-6 pb-8 pt-4">
          <nav className="flex flex-col gap-5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm tracking-[0.14em] uppercase font-sans text-[oklch(0.90_0.008_80)] hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-4 mt-2">
              {isAuthenticated ? (
                <Link
                  href={user?.role === "admin" ? "/admin" : "/portal"}
                  className="text-sm tracking-[0.14em] uppercase font-sans text-[oklch(0.75_0.080_78)] hover:text-white transition-colors"
                >
                  {user?.role === "admin" ? "Admin Dashboard" : "Member Portal"}
                </Link>
              ) : (
                <a
                  href={getLoginUrl()}
                  className="text-sm tracking-[0.14em] uppercase font-sans text-[oklch(0.75_0.080_78)] hover:text-white transition-colors"
                >
                  Member Login
                </a>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
