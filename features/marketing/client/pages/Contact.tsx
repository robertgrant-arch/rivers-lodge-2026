import { useRef, useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import PublicLayout from "@shared/components/PublicLayout";
import InquiryForm from "@/components/InquiryForm";
import SEOHead from '@shared/components/SEOHead';
import { trpc } from '@shared/lib/trpc';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const CORPORATE_ACCENT = "#9B4D19";

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

function CorporateInquiryForm() {
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    guestCount: "",
    message: "",
  });

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const submit = trpc.inquiries.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: () => {
      turnstileRef.current?.reset();
      setCaptchaToken("");
    },
  });

  const canSubmit =
    !!form.name &&
    !!form.email &&
    !!form.phone &&
    !submit.isPending &&
    (!TURNSTILE_SITE_KEY || !!captchaToken);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const fullMessage = [
      "Inquiry type: Corporate Event",
      "Source: Corporate Events",
      form.company ? `Company: ${form.company}` : "",
      form.guestCount ? `Guest count: ${form.guestCount}` : "",
      form.message ? `\n${form.message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    submit.mutate({
      type: "corporate",
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      message: fullMessage,
      captchaToken,
    });
  };

  if (submitted) {
    return (
      <div className="max-w-2xl" role="status">
        <div
          className="flex items-start gap-4 p-6 border"
          style={{ borderColor: CORPORATE_ACCENT }}
        >
          <div
            className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
            style={{ border: `1px solid ${CORPORATE_ACCENT}` }}
            aria-hidden="true"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: CORPORATE_ACCENT }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="eyebrow mb-2" style={{ color: CORPORATE_ACCENT }}>Inquiry Received</p>
            <p className="font-sans text-warm leading-relaxed" style={{ fontSize: "0.9375rem" }}>
              Thank you — we've received your corporate events inquiry. A member of our team will be in touch within 24 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Corporate events inquiry form">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="c-name" className="block text-[9px] tracking-[0.14em] uppercase font-sans text-muted-brand mb-2">
            Full Name <span style={{ color: CORPORATE_ACCENT }} aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="c-name"
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition"
            required
            aria-required="true"
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="c-email" className="block text-[9px] tracking-[0.14em] uppercase font-sans text-muted-brand mb-2">
            Email Address <span style={{ color: CORPORATE_ACCENT }} aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="c-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition"
            required
            aria-required="true"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="c-phone" className="block text-[9px] tracking-[0.14em] uppercase font-sans text-muted-brand mb-2">
            Phone Number <span style={{ color: CORPORATE_ACCENT }} aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="c-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(555) 555-5555"
            className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition"
            required
            aria-required="true"
            autoComplete="tel"
          />
        </div>

        <div>
          <label htmlFor="c-company" className="block text-[9px] tracking-[0.14em] uppercase font-sans text-muted-brand mb-2">
            Company Name
          </label>
          <input
            id="c-company"
            type="text"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="Your company"
            className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition"
            autoComplete="organization"
          />
        </div>
      </div>

      <div>
        <label htmlFor="c-guests" className="block text-[9px] tracking-[0.14em] uppercase font-sans text-muted-brand mb-2">
          Guest Count
        </label>
        <input
          id="c-guests"
          type="text"
          value={form.guestCount}
          onChange={(e) => set("guestCount", e.target.value)}
          placeholder="Approximate guest count"
          className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition"
        />
      </div>

      <div>
        <label htmlFor="c-message" className="block text-[9px] tracking-[0.14em] uppercase font-sans text-muted-brand mb-2">
          Tell Us More
        </label>
        <textarea
          id="c-message"
          rows={4}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Share any details about your event, specific needs, or questions."
          className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition resize-none"
        />
      </div>

      {TURNSTILE_SITE_KEY && (
        <div>
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
            onError={() => setCaptchaToken("")}
            options={{ theme: "light", size: "normal" }}
          />
        </div>
      )}

      {submit.isError && (
        <p className="text-sm font-sans text-red-600" role="alert">
          Something went wrong. Please try again or email us at{" "}
          <a href="mailto:info@theriverslodge.com" className="underline">info@theriverslodge.com</a>.
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-outline disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: CORPORATE_ACCENT, color: CORPORATE_ACCENT }}
      >
        {submit.isPending ? "Sending…" : "Submit Inquiry"}
      </button>
    </form>
  );
}

export default function Contact() {
  // useSearch() is Wouter v3's correct hook for the query string (?foo=bar).
  // useLocation() returns only the pathname and omits search params.
  const search = useSearch();
  const params = new URLSearchParams(search);
  const defaultType = params.get("type") || "general";
  const initialType: InquiryType = validTypes.includes(defaultType as InquiryType)
    ? (defaultType as InquiryType)
    : "general";

  // Track the active inquiry type so switching to Corporate in the wizard's
  // step-0 tile grid also triggers the simple form (not just the deep link).
  const [selectedType, setSelectedType] = useState<InquiryType>(initialType);

  const track = ["wedding", "corporate", "event"].includes(selectedType)
    ? ("weddings" as const)
    : ["membership", "lodging", "tour"].includes(selectedType)
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

            {/* Form — single-step for corporate, multi-step wizard for all other types */}
            <div ref={formRef as React.RefObject<HTMLDivElement>} className="fade-up">
              <div className="border border-white/8 p-8 md:p-12 bg-white/2">
                {selectedType === "corporate" ? (
                  <CorporateInquiryForm />
                ) : (
                  <InquiryForm
                    defaultType={selectedType}
                    track={track}
                    allowedTypes={allowedTypes}
                    onTypeChange={(type) => setSelectedType(type)}
                  />
                )}
              </div>
            </div>

            {/* Info sidebar */}
            <div ref={infoRef as React.RefObject<HTMLDivElement>} className="fade-up stagger-2 space-y-12">

              <div>
                <div className="gold-rule mb-5" />
                <p className="eyebrow text-muted-brand mb-4">Response Time</p>
                <p className="font-sans text-muted-brand text-sm leading-relaxed">
                  We respond to all inquiries within 24 hours. For time-sensitive requests, email us directly at{" "}
                  <a href="mailto:info@theriverslodge.com" className="text-warm hover:text-gold transition-colors">
                    info@theriverslodge.com
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
                  href="https://www.google.com/maps/search/?api=1&query=38.359944,-94.768592"
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
                <p className="eyebrow text-muted-brand mb-1" style={{ fontSize: "9px" }}>All Inquiries</p>
                <a href="mailto:info@theriverslodge.com" className="font-sans text-warm text-sm hover:text-gold transition-colors">
                  info@theriverslodge.com
                </a>
              </div>

            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
