import { Link } from "wouter";
import { getLoginUrl } from "@features/auth/public";

export default function PublicFooter() {
  return (
    <footer className="bg-[oklch(0.075_0.005_64)] text-[oklch(0.55_0.012_70)]">
      {/* Gold rule at top */}
      <div className="h-px bg-[oklch(0.72_0.095_78)/20]" />

      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 pt-16 pb-10 md:pt-20 md:pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-8 md:gap-6 pb-14 md:pb-16 border-b border-[oklch(1_0_0/0.06)]">

          {/* ── Brand ──────────────────────────────────────────────────── */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-5">
              <div className="font-serif text-[1.375rem] text-[oklch(0.94_0.008_78)] leading-tight tracking-wide">
                Rivers Lodge
              </div>
              <div className="text-[9px] tracking-[0.24em] uppercase font-sans font-light opacity-50 mt-1">
                &amp; Hunt Club
              </div>
            </div>
            <p className="text-[12px] font-sans leading-relaxed opacity-70 max-w-[200px] mb-5">
              A private estate on the Marais des Cygnes. Exclusive membership, destination weddings, and the finest private hunting and fishing in the Midwest.
            </p>
            <address className="not-italic text-[11px] font-sans leading-relaxed opacity-50 mb-5">
              18103 E 2300 Ln<br />
              La Cygne, KS 66040
            </address>
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/theriverslodge"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-[oklch(0.55_0.012_70)] hover:text-[oklch(0.72_0.095_78)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
                </svg>
              </a>
              <a
                href="https://www.facebook.com/theriverslodge"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-[oklch(0.55_0.012_70)] hover:text-[oklch(0.72_0.095_78)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* ── Lane 1: Events ────────────────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Events
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/weddings" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Weddings
              </Link>
              <Link href="/corporate" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Corporate Events
              </Link>
              <Link href="/food-and-wine" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Food &amp; Wine
              </Link>
              <Link href="/hunt" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Hunt
              </Link>
              <Link href="/fish" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Fish
              </Link>
            </nav>
          </div>

          {/* ── Lane 2: Lodging ───────────────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Lodging
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/lodging#the-lodge" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                The Lodge
              </Link>
              <Link href="/lodging#riverhouse" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Riverhouse Suites
              </Link>
              <Link href="/lodging#the-barn" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                The Barn
              </Link>
            </nav>
          </div>

          {/* ── Lane 3: Explore Membership ────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Explore Membership
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/membership" className="text-[12px] font-sans hover:text-[oklch(0.58_0.065_145)] transition-colors">
                Membership Tiers
              </Link>
              <Link href="/membership/benefits" className="text-[12px] font-sans hover:text-[oklch(0.58_0.065_145)] transition-colors">
                Member Benefits
              </Link>
              <Link href="/membership/faq" className="text-[12px] font-sans hover:text-[oklch(0.58_0.065_145)] transition-colors">
                FAQ
              </Link>
            </nav>
          </div>

          {/* ── Lane 4: About ─────────────────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              About
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/about" className="text-[12px] font-sans hover:text-[oklch(0.72_0.095_78)] transition-colors">
                Our Story
              </Link>
              <Link href="/about/team" className="text-[12px] font-sans hover:text-[oklch(0.72_0.095_78)] transition-colors">
                Meet the Team
              </Link>
              <Link href="/about/property" className="text-[12px] font-sans hover:text-[oklch(0.72_0.095_78)] transition-colors">
                The Property
              </Link>
              <Link href="/contact" className="text-[12px] font-sans hover:text-[oklch(0.72_0.095_78)] transition-colors">
                Contact
              </Link>
            </nav>
          </div>

          {/* ── Lane 5: Gallery ──────────────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Gallery
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/gallery" className="text-[12px] font-sans hover:text-[oklch(0.94_0.008_78)] transition-colors">
                View Gallery
              </Link>
            </nav>
          </div>

          {/* ── Lane 6: Member Access ─────────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Member Access
            </h4>
            <nav className="flex flex-col gap-3">
              <a href={getLoginUrl()} className="text-[12px] font-sans hover:text-[oklch(0.94_0.008_78)] transition-colors">
                Member Login
              </a>
              <Link href="/privacy" className="text-[12px] font-sans hover:text-[oklch(0.94_0.008_78)] transition-colors">
                Privacy Policy
              </Link>
            </nav>
          </div>

        </div>

        {/* ── Copyright bar ──────────────────────────────────────────────── */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[11px] font-sans opacity-35 tracking-wide">
            © {new Date().getFullYear()} The Rivers Lodge &amp; Hunt Club. All rights reserved.
          </p>
          <p className="text-[11px] font-sans opacity-35 tracking-wide">
            La Cygne, Kansas
          </p>
        </div>
      </div>
    </footer>
  );
}
