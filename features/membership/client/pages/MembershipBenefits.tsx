import { Link } from "wouter";
import PublicLayout from "@features/public-pages/components/PublicLayout";
import SEOHead from "@shared/components/SEOHead";

const ACCENT = "oklch(0.58 0.065 145)";

export default function MembershipBenefits() {
  return (
    <PublicLayout>
      <SEOHead
        title="Member Benefits"
        description="Explore the full range of benefits available to members of The Rivers Lodge & Hunt Club."
        url="/membership/benefits"
      />
      <div style={{ "--track-accent": ACCENT } as React.CSSProperties}>

        {/* Hero */}
        <section className="relative hero-full flex items-end pb-24 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[oklch(0.11_0.012_64)] flex items-center justify-center" aria-hidden="true">
              <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/40 select-none pointer-events-none">
                Member Benefits Hero Image
              </span>
            </div>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.10) 40%, oklch(0 0 0/0.80) 100%)" }} />
          </div>
          <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-white/50 mb-4">Membership</p>
            <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
              Member benefits.
            </h1>
          </div>
        </section>

        {/* Placeholder content */}
        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
            <div className="max-w-2xl">
              <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">What's Included</p>
              <h2 className="font-serif font-light text-warm leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
                Everything membership provides.
              </h2>
              <p className="font-sans text-muted-brand leading-relaxed italic text-[oklch(0.45_0.012_70)]" style={{ fontSize: "0.9375rem" }}>
                [Member benefits details — to be provided.]
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section bg-surface">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/membership" className="btn-ghost">Membership Tiers</Link>
              <Link href="/membership/faq" className="btn-ghost">FAQ</Link>
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  );
}
