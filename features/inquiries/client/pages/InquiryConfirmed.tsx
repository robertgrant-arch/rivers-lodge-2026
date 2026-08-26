import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import SEOHead from '@shared/components/SEOHead';

const GOLD = "#9B4D19";

export default function InquiryConfirmed() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const type = params.get("type") || "general";
  const name = params.get("name") || "";

  // Map inquiry type to display info
  const typeMap: Record<string, { label: string; track: string; nextSteps: string[]; contact: string }> = {
    wedding: {
      label: "Wedding Inquiry",
      track: "Weddings & Events",
      nextSteps: [
        "Our weddings team will review your inquiry within 24 hours.",
        "You'll receive a personalized response with available dates and a venue overview.",
        "We'll schedule a private Lodge tour at your convenience.",
        "Your dedicated coordinator will guide you through every detail from there.",
      ],
      contact: "info@theriverslodge.com",
    },
    corporate: {
      label: "Corporate Event Inquiry",
      track: "Weddings & Events",
      nextSteps: [
        "Our events team will review your inquiry within 24 hours.",
        "We'll send a customized proposal based on your group size and objectives.",
        "A site visit can be arranged at your convenience.",
        "Your dedicated events manager will coordinate all logistics.",
      ],
      contact: "info@theriverslodge.com",
    },
    event: {
      label: "Event Inquiry",
      track: "Weddings & Events",
      nextSteps: [
        "Our events team will review your inquiry within 24 hours.",
        "We'll follow up with availability and a customized proposal.",
        "A site visit can be arranged at your convenience.",
      ],
      contact: "info@theriverslodge.com",
    },
    membership: {
      label: "Membership Inquiry",
      track: "Membership & Outdoors",
      nextSteps: [
        "Our membership director will review your inquiry personally.",
        "You'll receive a response within 48 hours with membership details.",
        "We'll arrange a private Lodge introduction at your convenience.",
        "Membership is extended by invitation — we look forward to learning more about you.",
      ],
      contact: "info@theriverslodge.com",
    },
    lodging: {
      label: "Lodging Inquiry",
      track: "Membership & Outdoors",
      nextSteps: [
        "Our hospitality team will review your dates and preferences.",
        "You'll receive availability confirmation within 24 hours.",
        "We'll send a detailed lodging proposal for your stay.",
      ],
      contact: "info@theriverslodge.com",
    },
    tour: {
      label: "Tour Request",
      track: "The Lodge",
      nextSteps: [
        "We'll confirm your tour request within 24 hours.",
        "A member of our team will reach out to schedule your visit.",
        "Private tours are available Tuesday through Saturday.",
      ],
      contact: "info@theriverslodge.com",
    },
    general: {
      label: "General Inquiry",
      track: "The Lodge",
      nextSteps: [
        "We've received your message and will respond within 24 hours.",
        "For urgent matters, you can reach us directly by phone.",
      ],
      contact: "info@theriverslodge.com",
    },
  };

  const info = typeMap[type] || typeMap.general;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PublicLayout>
      <SEOHead
        title="Inquiry Received — Rivers Lodge"
        description="Thank you for your inquiry. Our team will be in touch shortly."
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="min-h-[50vh] flex items-center justify-center bg-[#2B2823] relative overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #9B4D19 0%, transparent 70%)" }} />

        <div className="relative z-10 text-center px-5 max-w-2xl mx-auto">
          {/* Check mark */}
          <div className="w-16 h-16 rounded-full mx-auto mb-8 flex items-center justify-center"
            style={{ border: `1px solid ${GOLD}` }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: GOLD }} />
          <p className="eyebrow text-[#908B82] mb-4">{info.track}</p>
          <h1 className="font-serif text-[#E0D3BD] leading-tight mb-5"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            {name ? `Thank you, ${name.split(" ")[0]}.` : "Thank you."}
          </h1>
          <p className="font-sans text-[#BABAAE] text-base leading-relaxed">
            Your {info.label.toLowerCase()} has been received. We'll be in touch shortly.
          </p>
        </div>
      </section>

      {/* ── Next Steps ────────────────────────────────────────────────────── */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="max-w-2xl mx-auto">
            <div className="h-px w-10 mb-8" style={{ backgroundColor: GOLD }} />
            <h2 className="font-serif text-[#E0D3BD] text-2xl md:text-3xl mb-8">
              What happens next
            </h2>

            <ol className="space-y-6">
              {info.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-5">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-sans font-medium"
                    style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
                    {i + 1}
                  </span>
                  <p className="font-sans text-[#A8A29A] text-sm leading-relaxed pt-0.5">
                    {step}
                  </p>
                </li>
              ))}
            </ol>

            {/* Direct contact */}
            <div className="mt-12 pt-8 border-t border-[#4E4B45]">
              <p className="font-sans text-[#908B82] text-sm mb-2">
                Questions in the meantime?
              </p>
              <a href={`mailto:${info.contact}`}
                className="font-sans text-sm"
                style={{ color: GOLD }}>
                {info.contact}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Return CTAs ───────────────────────────────────────────────────── */}
      <section className="section bg-[#363330]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="max-w-xl mx-auto text-center">
            <div className="h-px w-10 mx-auto mb-8" style={{ backgroundColor: GOLD }} />
            <h2 className="font-serif text-[#E0D3BD] text-2xl md:text-3xl mb-4">
              While you wait, explore the Lodge.
            </h2>
            <p className="font-sans text-[#BABAAE] text-sm leading-relaxed mb-8">
              Discover the spaces, accommodations, and experiences that make Rivers Lodge unlike any other destination in the region.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {type === "wedding" || type === "corporate" || type === "event" ? (
                <>
                  <Link href="/lodging" className="btn-primary">Explore Lodging</Link>
                  <Link href="/gallery" className="btn-ghost">View Gallery</Link>
                </>
              ) : (
                <>
                  <Link href="/lodging" className="btn-primary">The Lodge</Link>
                  <Link href="/gallery" className="btn-ghost">View Gallery</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
