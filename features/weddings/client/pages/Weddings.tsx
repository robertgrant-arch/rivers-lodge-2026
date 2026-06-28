import { useRef, useEffect, useState } from "react";
import { Link } from "wouter";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import PublicLayout from "@features/public-pages/components/PublicLayout";
import Picture from "@shared/components/Picture";
import { trpc } from '@shared/lib/trpc';
import SEOHead, { structuredData } from '@shared/components/SEOHead';
import StickyInquiryCTA from "@/components/StickyInquiryCTA";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;


const HERO      = "/img/wedding%20hero.JPG";
const CEREMONY  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/qYCdMEPFXPqLETpW.jpg";
const RECEPTION = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/gWfYLmNXrOoFKvTt.jpg";
const BARN_INT  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/SSdcPuhkHXDvzhtk.jpg";
const GROUNDS   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/RNvGygATwGRMluZa.jpg";
const AERIAL    = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/xZXSDWkpiCXfqsiU.jpg";
const RIVER_LWN = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/JbMIltWvczRWbDaw.jpg";
const LODGE     = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/TdlSWCLWjUxbkCAY.jpg";
const INTERIOR  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/JcuUUmANmAAHItUn.jpg";

function useFadeUp(t = 0.12) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { el.classList.add("visible"); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } }, { threshold: t });
    obs.observe(el); return () => obs.disconnect();
  }, [t]);
  return ref;
}

const venues = [
  { name: "River Lawn",       desc: "An open lawn between the Lodge and the Marais des Cygnes — the estate's most dramatic outdoor ceremony site. Seats up to 200.", img: RIVER_LWN },
  { name: "Rivers Barn",      desc: "6,000 sq ft of open timber-frame space. Accommodates up to 300 guests for ceremonies and receptions. Full catering kitchen.", img: BARN_INT },
  { name: "Timber Edge",      desc: "A ceremony space framed by old-growth timber on the river corridor. Intimate, shaded, and unlike anything else in the region.", img: GROUNDS },
  { name: "The Lodge",        desc: "The main residence sleeps up to 20 overnight guests. Available exclusively to the wedding party for the full weekend.", img: LODGE },
  { name: "Riverhouse Suites", desc: "Four boutique suites on the river bank. Private porches, premium finishes, and unobstructed water views for the bridal party.", img: INTERIOR },
];

const ACCENT = "#9B4D19";

function WeddingInquiryForm() {
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

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
      "Inquiry type: Wedding",
      "Source: Weddings page",
      form.message ? `\n${form.message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    submit.mutate({
      type: "wedding",
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
          style={{ borderColor: ACCENT }}
        >
          <div
            className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
            style={{ border: `1px solid ${ACCENT}` }}
            aria-hidden="true"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: ACCENT }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="eyebrow mb-2" style={{ color: ACCENT }}>Inquiry Received</p>
            <p className="font-sans text-warm leading-relaxed" style={{ fontSize: "0.9375rem" }}>
              Thank you — we've received your wedding inquiry. A member of our team will be in touch within 24 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-5" aria-label="Wedding inquiry form">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="w-name" className="block text-[9px] tracking-[0.14em] uppercase font-sans text-muted-brand mb-2">
            Full Name <span style={{ color: ACCENT }} aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="w-name"
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Your full name"
            className="form-field w-full"
            required
            aria-required="true"
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="w-email" className="block text-[9px] tracking-[0.14em] uppercase font-sans text-muted-brand mb-2">
            Email Address <span style={{ color: ACCENT }} aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="w-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className="form-field w-full"
            required
            aria-required="true"
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <label htmlFor="w-phone" className="block text-[9px] tracking-[0.14em] uppercase font-sans text-muted-brand mb-2">
          Phone Number <span style={{ color: ACCENT }} aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          id="w-phone"
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="(555) 555-5555"
          className="form-field w-full"
          required
          aria-required="true"
          autoComplete="tel"
        />
      </div>

      <div>
        <label htmlFor="w-message" className="block text-[9px] tracking-[0.14em] uppercase font-sans text-muted-brand mb-2">
          Tell Us About Your Wedding
        </label>
        <textarea
          id="w-message"
          rows={4}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Share your wedding date, guest count, or anything else you'd like us to know."
          className="form-field w-full resize-none"
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
          <a href="mailto:info@riverslodge.com" className="underline">info@riverslodge.com</a>.
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-outline disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: ACCENT, color: ACCENT }}
      >
        {submit.isPending ? "Sending…" : "Submit Wedding Inquiry"}
      </button>
    </form>
  );
}

export default function Weddings() {
  const { data: testimonials } = trpc.cms.getTestimonials.useQuery({ division: "weddings", featuredOnly: true });
  const venuesRef = useFadeUp();
  const ctaRef    = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
  title="Weddings"
  description="Intimate, cinematic weddings on a private Kansas estate. Ceremony lawns, the Rivers Barn, and the Timber Edge Clubhouse — all exclusively yours."
  url="/weddings"
  structuredData={structuredData.weddingVenue()}
/>
      <div style={{ "--track-accent": "#9B4D19" } as React.CSSProperties}>

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <Picture
            src={HERO}
            alt="Wedding at Rivers Lodge"
            label="Wedding Hero Image"
            className="absolute inset-0 w-full h-full"
            imgClassName="absolute inset-0 w-full h-full object-cover object-top"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            width={1920}
            height={1080}
            sizes="100vw"
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.10) 40%, oklch(0 0 0/0.78) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: "#9B4D19", marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Weddings</p>
          <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
            Your wedding weekend.
            <br /><em className="italic font-light">Entirely private.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            From intimate ceremonies on the River Lawn to grand receptions in the Rivers Barn — every wedding at the Lodge is exclusively yours. No other groups, no shared access.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#inquire" className="btn-primary" style={{ backgroundColor: ACCENT, borderColor: ACCENT, color: "#2B2823" }}>
              Begin Wedding Inquiry
            </a>
            <Link href="/lodging" className="btn-ghost">View Spaces &amp; Lodging</Link>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">
            <div>
              <div style={{ height: "1px", width: "2rem", backgroundColor: "#9B4D19", marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">The Experience</p>
              <h2 className="font-serif font-light text-warm leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
                Not a venue.
                <br /><em className="italic">A private estate.</em>
              </h2>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                <p>When you book a wedding at Rivers Lodge, you book the entire estate. Your guests are the only guests. The Lodge, the Barn, the Riverhouse Suites, and the grounds are yours for the weekend.</p>
                <p>We work with a limited number of couples each year to ensure every wedding receives the full attention of our team. The result is a weekend that feels less like an event and more like a private gathering on land that belongs to you — at least for those three days.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Picture
                src="/img/wedding%20photo%201.jpg"
                alt="Outdoor wedding ceremony"
                label="Wedding photo"
                className="col-span-2 aspect-[16/9] overflow-hidden"
                sizes="(max-width: 1024px) 100vw, 50vw"
                width={1200}
                height={675}
              />
              <Picture
                src="/img/wedding%204.jpg"
                alt="Wedding reception"
                label="Wedding photo"
                className="aspect-square overflow-hidden"
                sizes="(max-width: 1024px) 50vw, 25vw"
                width={768}
                height={768}
              />
              <Picture
                src="/img/Wedding%205.jpg"
                alt="Wedding at Rivers Lodge"
                label="Wedding photo"
                className="aspect-square overflow-hidden"
                sizes="(max-width: 1024px) 50vw, 25vw"
                width={768}
                height={768}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pull Quote */}
      <section className="section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-3xl">
            <blockquote className="pull-quote" style={{ borderLeftColor: "#9B4D19" }}>
              "Every wedding at Rivers Lodge is exclusive. One couple, one weekend, one estate — entirely theirs."
            </blockquote>
          </div>
        </div>
      </section>

      {/* Venues */}
      <section ref={venuesRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "#9B4D19", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Ceremony &amp; Reception Spaces</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Every space is yours.
            </h2>
          </div>
          <div className="space-y-px bg-border">
            {venues.map((v, i) => (
              <div key={v.name} className={`grid grid-cols-1 md:grid-cols-2 bg-background ${i % 2 === 1 ? "md:[direction:rtl]" : ""}`}>
                <Picture
                  src={v.img}
                  alt={v.name}
                  className={`aspect-[4/3] overflow-hidden ${i % 2 === 1 ? "md:[direction:ltr]" : ""}`}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  width={800}
                  height={600}
                />
                <div className={`p-10 lg:p-14 flex flex-col justify-center ${i % 2 === 1 ? "md:[direction:ltr]" : ""}`}>
                  <div style={{ height: "1px", width: "1.5rem", backgroundColor: "#9B4D19", marginBottom: "1rem" }} />
                  <h3 className="font-serif text-warm text-2xl mb-4">{v.name}</h3>
                  <p className="font-sans text-muted-brand text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials && testimonials.length > 0 && (
        <section className="section bg-surface">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
            <div className="mb-14">
              <div style={{ height: "1px", width: "2rem", backgroundColor: "#9B4D19", marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand">From Our Couples</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {testimonials.slice(0, 3).map((t: any) => (
                <div key={t.id} className="testimonial-card bg-surface p-8 flex flex-col" style={{ borderTopColor: "#9B4D19" }}>
                  <blockquote className="font-serif italic text-warm text-lg leading-relaxed flex-1 mb-6">"{t.quote}"</blockquote>
                  <div className="border-t border-border pt-4">
                    <p className="text-warm font-sans text-sm font-medium">{t.authorName}</p>
                    {t.authorTitle && <p className="eyebrow text-muted-brand mt-1" style={{ fontSize: "10px" }}>{t.authorTitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA / Inline Inquiry Form */}
      <section id="inquire" ref={ctaRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-10">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Begin Your Inquiry</p>
            <h2 className="font-serif font-light text-warm leading-tight mb-6" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
              We'd love to hear about your wedding.
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem", maxWidth: "38rem" }}>
              We work with a limited number of couples each year. Share the basics and we'll respond within 24 hours.
            </p>
          </div>
          <WeddingInquiryForm />
        </div>
      </section>

      </div>
      <StickyInquiryCTA
        href="#inquire"
        label="Begin Wedding Inquiry"
        accentColor={ACCENT}
      />
    </PublicLayout>
  );
}
