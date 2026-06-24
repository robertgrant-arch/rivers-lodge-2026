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

          {/* ── Lane 1: Explore Membership ────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Explore Membership
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/membership" className="text-[12px] font-sans hover:text-[oklch(0.58_0.065_145)] transition-colors">
                Membership Overview
              </Link>
              <Link href="/membership#apply" className="text-[12px] font-sans hover:text-[oklch(0.58_0.065_145)] transition-colors">
                Apply
              </Link>
              <Link href="/estate" className="text-[12px] font-sans hover:text-[oklch(0.58_0.065_145)] transition-colors">
                The Estate
              </Link>
            </nav>
          </div>

          {/* ── Lane 2: Outdoor Pursuits ──────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Outdoor Pursuits
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/hunt" className="text-[12px] font-sans hover:text-[oklch(0.58_0.065_145)] transition-colors">
                Hunt
              </Link>
              <Link href="/fish" className="text-[12px] font-sans hover:text-[oklch(0.58_0.065_145)] transition-colors">
                Fish
              </Link>
            </nav>
          </div>

          {/* ── Lane 3: Food & Wine ───────────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Food &amp; Wine
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/contact?type=dining" className="text-[12px] font-sans hover:text-[oklch(0.72_0.095_78)] transition-colors">
                Dining Inquiry
              </Link>
            </nav>
          </div>

          {/* ── Lane 4: Weddings ─────────────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Weddings
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/weddings" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Weddings
              </Link>
              <Link href="/venues" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Venue Spaces
              </Link>
              <Link href="/lodging" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Lodging
              </Link>
            </nav>
          </div>

          {/* ── Lane 5: Corporate Events ─────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Corporate Events
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/corporate" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Corporate Outings
              </Link>
              <Link href="/corporate" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Retreats
              </Link>
              <Link href="/contact?type=corporate" className="text-[12px] font-sans hover:text-[oklch(0.70_0.060_50)] transition-colors">
                Plan a Meeting
              </Link>
            </nav>
          </div>

          {/* ── Lane 6: Gallery ──────────────────────────────────────── */}
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

          {/* ── Lane 7: Contact ──────────────────────────────────────── */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.94_0.008_78)] mb-5">
              Contact
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/contact" className="text-[12px] font-sans hover:text-[oklch(0.94_0.008_78)] transition-colors">
                Contact Us
              </Link>
              {/* Member Login requires a full-page navigation to /api/oauth/start */}
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
