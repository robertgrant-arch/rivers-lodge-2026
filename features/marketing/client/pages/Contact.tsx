import { useRef, useEffect } from "react";
import { useLocation } from "wouter";
import PublicLayout from "@shared/components/PublicLayout";
import InquiryForm from "@/components/InquiryForm";
import SEOHead from '@shared/components/SEOHead';

function useFadeUp(t = 0.12) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { el.classList.add("visible"); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: t }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [t]);
  return ref;
}

type InquiryType = "wedding" | "corporate" | "membership" | "lodging" | "tour" | "event" | "general";
const validTypes: InquiryType[] = ["general", "wedding", "corporate", "tour", "membership", "lodging", "event"];

export default function Contact() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const defaultType = params.get("type") || "general";
  const safeType: InquiryType = validTypes.includes(defaultType as InquiryType)
    ? (defaultType as InquiryType)
    : "general";

  const track = ["wedding", "corporate", "event"].includes(safeType)
    ? ("weddings" as const)
    : ["membership", "lodging", "tour"].includes(safeType)
    ? ("outdoors" as const)
    : undefined;

  // Weddings/events contact path shows only the two event inquiry types.
  // Other tracks remain unrestricted.
  const allowedTypes = track === "weddings" ? (["wedding", "corporate"] as InquiryType[]) : undefined;

  const heroRef = useFadeUp();
  const formRef = useFadeUp(0.08);
  const infoRef = useFadeUp(0.08);

  return (
    <PublicLayout>
      <SEOHead
        title="Contact"
        description="Get in touch with The Rivers Lodge & Hunt Club — inquire about weddings, events, membership, lodging, or schedule a property tour."
        url="/contact"
      />

      {/* Hero */}
      <section className="relative pt-40 pb-20 bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div ref={heroRef as React.RefObject<HTMLDivElement>} className="fade-up max-w-xl">
            <div className="gold-rule mb-5" />
            <p className="eyebrow text-muted-brand mb-4">Contact</p>
            {/* The {" "} before <br /> ensures the two text nodes are separated
                in the accessibility tree, so screen readers read the full sentence
                correctly rather than "Let's talk aboutwhat you're planning." */}
            <h1 className="font-serif font-light text-warm leading-[0.92]" style={{ fontSize: "clamp(2.5rem,5.5vw,4.5rem)" }}>
              Let's talk about{" "}
              <br /><em className="italic font-light">what you're planning.</em>
            </h1>
          </div>
        </div>
      </section>

      {/* Split: Form + Info */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-16 lg:gap-24">

            {/* Multi-step form */}
            <div ref={formRef as React.RefObject<HTMLDivElement>} className="fade-up">
              <div className="border border-white/8 p-8 md:p-12 bg-white/2">
                <InquiryForm defaultType={safeType} track={track} allowedTypes={allowedTypes} />
              </div>
            </div>

            {/* Info sidebar */}
            <div ref={infoRef as React.RefObject<HTMLDivElement>} className="fade-up stagger-2 space-y-12">

              <div>
                <div className="gold-rule mb-5" />
                <p className="eyebrow text-muted-brand mb-4">Response Time</p>
                <p className="font-sans text-muted-brand text-sm leading-relaxed">
                  We respond to all inquiries within 24 hours. For time-sensitive requests, email us directly at{" "}
                  <a href="mailto:events@riverslodge.com" className="text-warm hover:text-gold transition-colors">
                    events@riverslodge.com
                  </a>
                  .
                </p>
              </div>

              <div>
                <p className="eyebrow text-muted-brand mb-4">Location</p>
                <address className="not-italic">
                  <p className="font-serif text-warm text-lg leading-snug mb-1">18103 E 2300 Ln</p>
                  <p className="font-serif text-warm text-lg leading-snug mb-4">La Cygne, KS 66040</p>
                </address>
                <a
                  href="https://maps.google.com/?q=18103+E+2300+Ln,+La+Cygne,+KS+66040"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-arrow text-sm"
                  aria-label="Get directions to Rivers Lodge (opens Google Maps)"
                >
                  Get Directions
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>

              <div>
                <p className="eyebrow text-muted-brand mb-4">From Kansas City</p>
                <p className="font-sans text-muted-brand text-sm leading-relaxed">
                  About 1 hour south via US-69 — 60 miles from downtown Kansas City, MO.
                </p>
              </div>

              <div>
                <p className="eyebrow text-muted-brand mb-4">Inquiries</p>
                <div className="space-y-4">
                  <div>
                    <p className="eyebrow text-muted-brand mb-1" style={{ fontSize: "9px" }}>Weddings &amp; Events</p>
                    <a href="mailto:events@riverslodge.com" className="font-sans text-warm text-sm hover:text-gold transition-colors">
                      events@riverslodge.com
                    </a>
                  </div>
                  <div>
                    <p className="eyebrow text-muted-brand mb-1" style={{ fontSize: "9px" }}>Membership &amp; Outdoors</p>
                    <a href="mailto:membership@riverslodge.com" className="font-sans text-warm text-sm hover:text-gold transition-colors">
                      membership@riverslodge.com
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
