import { Link } from "wouter";
import PublicLayout from "@shared/components/PublicLayout";
import SEOHead from "@shared/components/SEOHead";

const ACCENT = "#6B7250";

export default function MembershipFaq() {
  return (
    <PublicLayout>
      <SEOHead
        title="Membership FAQ"
        description="Frequently asked questions about membership at The Rivers Lodge & Hunt Club."
        url="/membership/faq"
      />
      <div style={{ "--track-accent": ACCENT } as React.CSSProperties}>

        {/* Hero */}
        <section className="relative hero-full flex items-end pb-24 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[#2B2823] flex items-center justify-center" aria-hidden="true">
              <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/40 select-none pointer-events-none">
                FAQ Hero Image
              </span>
            </div>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.10) 40%, oklch(0 0 0/0.80) 100%)" }} />
          </div>
          <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-white/50 mb-4">Membership</p>
            <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
              Frequently asked questions.
            </h1>
          </div>
        </section>

        {/* Placeholder content */}
        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
            <div className="max-w-2xl">
              <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">Common Questions</p>
              <h2 className="font-serif font-light text-warm leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
                Membership FAQ.
              </h2>
              <p className="font-sans text-muted-brand leading-relaxed italic text-[#7A766F]" style={{ fontSize: "0.9375rem" }}>
                [FAQ content — to be provided.]
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section bg-surface">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/membership" className="btn-ghost">Membership Tiers</Link>
              <Link href="/contact" className="btn-ghost">Contact Us</Link>
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  );
}
