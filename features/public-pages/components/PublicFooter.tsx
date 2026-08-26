import { Link } from "wouter";
import { getLoginUrl } from "@features/auth/public";

export default function PublicFooter() {
  return (
    <footer className="bg-[#201E1C] text-[#908B82]">
      {/* Gold rule at top */}
      <div className="h-px bg-[#9B4D19]/20" />

      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 pt-16 pb-10 md:pt-20 md:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 pb-14 md:pb-16 border-b border-[oklch(1_0_0/0.06)]">

          {/* ── Left: Brand + Address + Social ──────────────────────────── */}
          <div>
            <div className="mb-5">
              <div className="font-serif text-[1.375rem] text-[#E0D3BD] leading-tight tracking-wide">
                Rivers Lodge
              </div>
            </div>
            <p className="text-[12px] font-sans leading-relaxed opacity-70 max-w-[280px] mb-6">
              A private lodge on the Marais des Cygnes. Exclusive membership, destination weddings, private events, and exceptional outdoor experiences in the Midwest.
            </p>
            <address className="not-italic text-[11px] font-sans leading-relaxed opacity-50 mb-6">
              18103 E 2300 Ln<br />
              La Cygne, KS 66040
            </address>
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/theriverslodge"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-[#908B82] hover:text-[#9B4D19] transition-colors"
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
                className="text-[#908B82] hover:text-[#9B4D19] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* ── Right: Utility Links ────────────────────────────────────── */}
          <div className="flex flex-col md:items-end gap-3">
            <Link href="/contact" className="text-[12px] font-sans hover:text-[#9B4D19] transition-colors">
              Contact
            </Link>
            <a href={getLoginUrl()} className="text-[12px] font-sans hover:text-[#9B4D19] transition-colors">
              Member Login
            </a>
            <Link href="/privacy" className="text-[12px] font-sans hover:text-[#9B4D19] transition-colors">
              Privacy Policy
            </Link>
          </div>

        </div>

        {/* ── Copyright bar ──────────────────────────────────────────────── */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[11px] font-sans opacity-35 tracking-wide">
            © {new Date().getFullYear()} Rivers Lodge. All rights reserved.
          </p>
          <p className="text-[11px] font-sans opacity-35 tracking-wide">
            La Cygne, Kansas
          </p>
        </div>
      </div>
    </footer>
  );
}
