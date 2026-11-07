import { useRef, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import PublicLayout from "@shared/components/PublicLayout";
import Picture from "@shared/components/Picture";
import { trpc } from '@shared/lib/trpc';
import SEOHead, { structuredData } from '@shared/components/SEOHead';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
// redeploy: estate hero overlay 2026-07-03

const HERO = "/img/wedding%20hero.JPG";
const ESTATE_HERO = "/img/weddingsketch-1-.jpg.png";
// Property section backgrounds (existing property/landscape photography)
const PROPERTY_BG_1 = "/img/Lodge%20Aerial.jpg";
const PROPERTY_BG_2 = "/img/barn-14-hero.jpg";

// Light-section palette (brand tokens defined in features/_core/client/index.css)
const BG_SAND = "bg-rl-sand";
const BG_SAND_LIGHT = "bg-rl-sand-light";
// Generous vertical rhythm for the Weddings page (more room than the global .section)
const SECTION_Y = "py-24 md:py-32 lg:py-40";

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

// ─── Swappable imagery ──────────────────────────────────────────────────────
// Card images for "Ceremony, Reception & Lodging". Swap `img` to change a card's photo.
// Labels stay generic on purpose; property names live on the pages these link to.
const SPACE_CARDS = [
  { label: "Ceremony Spaces",  href: "/venues#ceremony",  img: "/img/Wedding%205.jpg",          alt: "Couple exchanging vows on an outdoor deck beneath string lights" },
  { label: "Reception Spaces", href: "/venues#reception", img: "/img/clubhousewedding.jpg",     alt: "Long candlelit reception tables set for dinner" },
  { label: "Lodging",          href: "/lodging#lodging",  img: "/img/lodge-1-hero.jpg",         alt: "The Lodge at Rivers Lodge on an autumn afternoon" },
];
// Full-width gallery card image. Swap to change the photo.
const GALLERY_CARD_IMG = "/img/wedding-gallery/wedding-gallery-12.jpg";
const GALLERY_CARD_ALT = "Outdoor ceremony under a wooden arch dressed in white flowers, with timber-covered hills beyond";
const GALLERY_HREF = "/gallery?category=weddings";

const ACCENT = "#9B4D19";

function WeddingInquiryForm() {
const [, navigate] = useLocation();
const turnstileRef = useRef<TurnstileInstance>(null);
const [captchaToken, setCaptchaToken] = useState("");
const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
const submit = trpc.inquiries.submit.useMutation({
onSuccess: () => {
  const encodedName = encodeURIComponent(form.name);
  navigate(`/inquiry-confirmed?type=wedding&name=${encodedName}`);
},
onError: (err) => {
  turnstileRef.current?.reset();
  setCaptchaToken("");
  console.error("[WeddingInquiryForm] Submission error:", err);
},
});
const canSubmit = !!form.name && !!form.email && !!form.phone && !submit.isPending && (!TURNSTILE_SITE_KEY || !!captchaToken);
const handleSubmit = (e: React.FormEvent) => {
e.preventDefault();
if (!canSubmit) return;
const fullMessage = [
"Inquiry type: Wedding",
"Source: Weddings page",
form.message ? `\n${form.message}` : "",
].filter(Boolean).join("\n");
submit.mutate({ type: "wedding", name: form.name, email: form.email, phone: form.phone || undefined, message: fullMessage, captchaToken });
};
return (
<form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
<div className="mt-5">
<label htmlFor="w-name" className="block text-[#2B2823]/80 tracking-wider text-xs mb-2">Full Name *</label>
<input id="w-name" type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" className="w-full rounded-md bg-white/70 border border-[#2B2823]/25 px-4 py-3 text-[#2B2823] placeholder:text-[#2B2823]/55 focus:outline-none focus:ring-2 focus:ring-[#576276]/60 focus:border-[#576276] transition" required aria-required="true" autoComplete="name" />
</div>
<div className="mt-5">
<label htmlFor="w-email" className="block text-[#2B2823]/80 tracking-wider text-xs mb-2">Email Address *</label>
<input id="w-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" className="w-full rounded-md bg-white/70 border border-[#2B2823]/25 px-4 py-3 text-[#2B2823] placeholder:text-[#2B2823]/55 focus:outline-none focus:ring-2 focus:ring-[#576276]/60 focus:border-[#576276] transition" required aria-required="true" autoComplete="email" />
</div>
<div className="mt-5">
<label htmlFor="w-phone" className="block text-[#2B2823]/80 tracking-wider text-xs mb-2">Phone Number *</label>
<input id="w-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 555-5555" className="w-full rounded-md bg-white/70 border border-[#2B2823]/25 px-4 py-3 text-[#2B2823] placeholder:text-[#2B2823]/55 focus:outline-none focus:ring-2 focus:ring-[#576276]/60 focus:border-[#576276] transition" required aria-required="true" autoComplete="tel" />
</div>
<div className="mt-5">
<label htmlFor="w-message" className="block text-[#2B2823]/80 tracking-wider text-xs mb-2">Tell Us About Your Wedding</label>
<textarea id="w-message" value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Share your wedding date, guest count, or anything else you'd like us to know." className="w-full rounded-md bg-white/70 border border-[#2B2823]/25 px-4 py-3 text-[#2B2823] placeholder:text-[#2B2823]/55 focus:outline-none focus:ring-2 focus:ring-[#576276]/60 focus:border-[#576276] transition min-h-[140px] resize-y" />
</div>
{TURNSTILE_SITE_KEY && (
<div className="mt-4">
<Turnstile
  ref={turnstileRef}
  siteKey={TURNSTILE_SITE_KEY}
  onSuccess={(token) => setCaptchaToken(token)}
  onError={() => setCaptchaToken("")}
  onExpire={() => setCaptchaToken("")}
  options={{ theme: "light" }}
/>
</div>
)}
{submit.isError && (
<p className="text-sm font-sans text-red-600" role="alert">
  {submit.error?.message || "Something went wrong. Please try again or email us at info@riverslodge.com"}
</p>
)}
<button type="submit" disabled={!canSubmit} className="inline-flex items-center justify-center rounded-md bg-rl-river hover:bg-rl-river-dark disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase tracking-widest text-sm px-8 py-3 transition">
{submit.isPending ? "Sending…" : "SUBMIT WEDDING INQUIRY"}
</button>
</form>
);
}

function Rule() {
return <div aria-hidden="true" style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />;
}

/** Slim labeled divider on a solid Night band — the break between every section on this page. */
function SectionDivider({ label }: { label: string }) {
return (
<div className="bg-[#2B2823] py-6 lg:py-8" role="presentation">
<div className="max-w-[1440px] mx-auto px-5 lg:px-14 flex items-center justify-center gap-6">
<div aria-hidden="true" className="flex-1 h-px bg-[#E0D3BD]/25" />
<p className="text-[11px] uppercase tracking-[0.2em] font-sans text-[#E0D3BD]/80 whitespace-nowrap">{label}</p>
<div aria-hidden="true" className="flex-1 h-px bg-[#E0D3BD]/25" />
</div>
</div>
);
}

/**
 * Full-bleed property image with its text block anchored at the lower left,
 * over a Night gradient that deepens toward that corner (tuned for WCAG AA
 * against the rendered photos at 1440px and 390px).
 */
function PropertyPanel({ src, alt, objectPosition = "center", children }: { src: string; alt: string; objectPosition?: string; children: React.ReactNode }) {
return (
<section className="relative overflow-hidden flex items-end" style={{ minHeight: "90vh" }}>
<div className="absolute inset-0">
<Picture src={src} alt={alt} label={alt} className="absolute inset-0 w-full h-full" imgClassName="absolute inset-0 w-full h-full object-cover" imgStyle={{ objectPosition }} sizes="100vw" loading="lazy" />
<div className="absolute inset-0 pointer-events-none lg:hidden" style={{ background: "linear-gradient(to top, rgba(43,40,35,0.86) 0%, rgba(43,40,35,0.76) 45%, rgba(43,40,35,0.70) 75%, rgba(43,40,35,0.35) 92%, rgba(43,40,35,0.15) 100%)" }} />
<div className="absolute inset-0 pointer-events-none hidden lg:block" style={{ background: "linear-gradient(to top, rgba(43,40,35,0.86) 0%, rgba(43,40,35,0.70) 40%, rgba(43,40,35,0.32) 66%, rgba(43,40,35,0) 84%), linear-gradient(to right, rgba(43,40,35,0.62) 0%, rgba(43,40,35,0.38) 42%, rgba(43,40,35,0) 68%)" }} />
</div>
<div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full pt-40 pb-16 md:pb-20 lg:pb-24">
<div className="max-w-2xl text-[#F4EEE4]" style={{ textShadow: "0 1px 14px rgba(43,40,35,0.55), 0 1px 2px rgba(43,40,35,0.5)" }}>
<Rule />
{children}
</div>
</div>
</section>
);
}

/** Whole-card link: image, gradient and text are sibling layers inside the positioned link. */
function SpaceCard({ label, href, img, alt }: { label: string; href: string; img: string; alt: string }) {
return (
<Link href={href} aria-label={`${label}: view details`} className="group relative block overflow-hidden aspect-[4/3] md:aspect-[4/5] bg-[#2B2823] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#576276]">
<Picture src={img} alt={alt} className="absolute inset-0 w-full h-full" imgClassName="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]" sizes="(max-width: 767px) 100vw, 33vw" loading="lazy" />
<div aria-hidden="true" className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-90 group-hover:opacity-100" style={{ background: "linear-gradient(to top, rgba(43,40,35,0.88) 0%, rgba(43,40,35,0.55) 32%, rgba(43,40,35,0) 62%)" }} />
<div className="absolute inset-x-0 bottom-0 p-7 lg:p-8 flex items-end justify-between gap-4">
<div>
<div aria-hidden="true" style={{ height: "1px", width: "1.5rem", backgroundColor: ACCENT, marginBottom: "0.75rem" }} />
<h3 className="font-serif text-[#F4EEE4] text-2xl lg:text-3xl leading-tight">{label}</h3>
</div>
<span aria-hidden="true" className="text-[#F4EEE4] text-xl transition-transform duration-300 group-hover:translate-x-1">→</span>
</div>
</Link>
);
}

export default function Weddings() {
const { data: testimonials } = trpc.cms.getTestimonials.useQuery({ division: "weddings", featuredOnly: true });
const hasTestimonials = !!testimonials && testimonials.length > 0;
const venuesRef = useFadeUp();
const galleryRef = useFadeUp(0.05);
const ctaRef = useFadeUp();
const bodyCopy = "space-y-5 font-serif text-[#F4EEE4] leading-relaxed";
return (
<PublicLayout>
<SEOHead title="Weddings" description="Intimate, cinematic weddings on a private Kansas Lodge. Rivers Barn, the Clubhouse, and your reserved lodging — all exclusively yours." url="/weddings" structuredData={structuredData.weddingVenue()} />
<div style={{ "--track-accent": ACCENT, "--btn-primary-text": "var(--rl-sand-light)" } as React.CSSProperties}>
{/* Hero */}
<section className="relative hero-full flex items-end pb-24 overflow-hidden">
<div className="absolute inset-0">
<Picture src={HERO} alt="Wedding ceremony at Rivers Lodge" label="Wedding Hero Image" className="absolute inset-0 w-full h-full" imgClassName="absolute inset-0 w-full h-full object-cover object-center" fetchPriority="high" loading="eager" decoding="async" width={1920} height={1080} sizes="100vw" />
{/* Lighter Night-tinted scrim: the upper photo stays clear; shade is concentrated behind the text block (tuned for WCAG AA) */}
<div className="absolute inset-0 pointer-events-none lg:hidden" style={{ background: "linear-gradient(to top, rgba(43,40,35,0.72) 0%, rgba(43,40,35,0.60) 45%, rgba(43,40,35,0.60) 66%, rgba(43,40,35,0.30) 76%, rgba(43,40,35,0) 88%)" }} />
<div className="absolute inset-0 pointer-events-none hidden lg:block" style={{ background: "linear-gradient(to top, rgba(43,40,35,0.70) 0%, rgba(43,40,35,0.50) 28%, rgba(43,40,35,0.15) 50%, rgba(43,40,35,0) 62%), linear-gradient(to right, rgba(43,40,35,0.50) 0%, rgba(43,40,35,0.30) 35%, rgba(43,40,35,0) 60%)" }} />
</div>
<div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full" style={{ textShadow: "0 1px 18px rgba(43,40,35,0.55), 0 1px 3px rgba(43,40,35,0.45)" }}>
<Rule />
<p className="eyebrow text-white mb-4">Weddings</p>
<h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
Your wedding weekend. <br /><em className="italic font-light">Entirely private.</em>
</h1>
<p className="font-sans text-white/95 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
From intimate ceremonies to grand receptions- every wedding at the Lodge is exclusively yours. No other groups, no shared access.
</p>
<div className="flex flex-col sm:flex-row gap-4" style={{ textShadow: "none" }}>
<a href="#inquire" className="btn-primary">Begin Wedding Inquiry</a>
<Link href="/lodging" className="btn-ghost bg-[#2B2823]/35 backdrop-blur-sm">View Spaces & Lodging</Link>
</div>
</div>
</section>
{/* Property — Rivers Lodge (aerial) */}
<SectionDivider label="Rivers Lodge" />
<PropertyPanel src={PROPERTY_BG_1} alt="Aerial view of the Rivers Lodge property at sunset — timber, ponds, and prairie around the lodge and event barn" objectPosition="center 40%">
<h2 className="font-serif font-light text-[#F4EEE4] leading-[1.02] mb-4" style={{ fontSize: "clamp(2.5rem,5.5vw,4.5rem)" }}>
Rivers Lodge
</h2>
<p className="eyebrow not-italic text-[#F4EEE4] mb-8" style={{ fontSize: "0.8125rem", letterSpacing: "0.2em" }}>
A PLACE TO CELEBRATE. A PLACE TO STAY.
</p>
<div className={bodyCopy} style={{ fontSize: "1.0625rem" }}>
<p>Set on approximately 113 acres of rolling oak and hickory timber surrounded by native prairie, Rivers Lodge offers a collection of thoughtfully designed spaces.</p>
<p>Our property features two primary event venues, The Event Barn and The Clubhouse, designed for weddings both large and intimate. On-site and nearby lodging includes The Lodge, The Farmhouse, The Annex, and Riverhouse Suites, offering a unique experience of hosting and staying in one place. In addition to on-site accommodations, the Ohana House offers an off-site lodging option located 20 minutes south of the main campus, appreciated for its comfort and privacy.</p>
</div>
</PropertyPanel>
{/* Property — The Event Barn */}
<SectionDivider label="The Event Barn" />
<PropertyPanel src={PROPERTY_BG_2} alt="The Event Barn at Rivers Lodge, a dark timber barn framed by autumn oaks at golden hour" objectPosition="center 45%">
<h2 className="font-serif font-light text-[#F4EEE4] leading-[1.02] mb-8" style={{ fontSize: "clamp(2.5rem,5.5vw,4.5rem)" }}>
The Event Barn
</h2>
<div className={bodyCopy} style={{ fontSize: "1.0625rem" }}>
<p>The Event Barn is the signature event space at Rivers Lodge, blending rustic charm with modern design. The barn features original raw materials preserved from generations past alongside contemporary amenities. This open-concept space is perfect for ceremonies, receptions, and large gatherings.</p>
<p>At Rivers Lodge, our pricing is thoughtfully designed to offer flexibility while providing an exceptional, full-property experience. Whether you're hosting a single-day celebration or a full weekend gathering, each option includes access to our most loved spaces and the convenience of on-site lodging.</p>
<p>The beauty of our property allows you and your guests to relax, connect, and truly settle in.</p>
</div>
</PropertyPanel>
{/* Pull Quote — its own section */}
<SectionDivider label="One Couple · One Weekend" />
<section className={`${SECTION_Y} ${BG_SAND}`}>
<div className="max-w-[1440px] mx-auto px-5 lg:px-14">
<div className="max-w-3xl">
<blockquote className="pull-quote" style={{ borderLeftColor: ACCENT, color: "var(--rl-night)" }}>
"Every wedding at Rivers Lodge is exclusive. One couple, one weekend, one Lodge — entirely theirs."
</blockquote>
</div>
</div>
</section>
{/* Intro — The Experience */}
<SectionDivider label="The Experience" />
<section className={`${SECTION_Y} ${BG_SAND_LIGHT}`}>
<div className="max-w-[1440px] mx-auto px-5 lg:px-14 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
<div className="max-w-2xl">
<Rule />
<p className="eyebrow text-[#2B2823]/75 mb-4">The Experience</p>
<h2 className="font-serif font-light text-[#2B2823] leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
Not a venue. <br /><em className="italic text-rl-grass">A private Lodge.</em>
</h2>
<div className="space-y-5 font-sans text-[#2B2823] leading-relaxed" style={{ fontSize: "0.9375rem" }}>
<p>When you book a wedding at Rivers Lodge, you book the entire Lodge. Your guests are the only guests. Rivers Barn, the Clubhouse, and your reserved lodging are all exclusively yours for the weekend.</p>
<p>We work with a limited number of couples each year to ensure every wedding receives the full attention of our team. We will never have multiple weddings going on at one time and the result is a totally private all weekend celebration with friends and family.</p>
</div>
</div>
<div className="relative aspect-[4/3] w-full">
<img src={ESTATE_HERO || undefined} alt="Illustrated sketch of the Rivers Lodge estate" className="absolute inset-0 w-full h-full object-contain block mix-blend-multiply" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
</div>
</div>
</section>
{/* Ceremony, Reception & Lodging — three linked cards */}
<SectionDivider label="Ceremony, Reception & Lodging" />
<section ref={venuesRef as React.RefObject<HTMLDivElement>} className={`fade-up ${SECTION_Y} ${BG_SAND}`}>
<div className="max-w-[1440px] mx-auto px-5 lg:px-14">
<div className="mb-14">
<Rule />
<p className="eyebrow text-[#2B2823]/75 mb-4">Ceremony, Reception &amp; Lodging</p>
<h2 className="font-serif font-light text-[#2B2823] leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
Every space is yours.
</h2>
</div>
<ul className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
{SPACE_CARDS.map((c) => (
<li key={c.label}><SpaceCard {...c} /></li>
))}
</ul>
</div>
</section>
{/* Wedding & Event Gallery — one full-width card (homepage editorial overlay) */}
<SectionDivider label="Wedding & Event Gallery" />
<section ref={galleryRef as React.RefObject<HTMLDivElement>} className="fade-up">
<Link href={GALLERY_HREF} aria-label="View Wedding & Event Gallery" className="group relative block overflow-hidden min-h-[600px] lg:min-h-[80vh] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#E0D3BD]">
<Picture src={GALLERY_CARD_IMG} alt={GALLERY_CARD_ALT} className="absolute inset-0 w-full h-full" imgClassName="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" width={2400} height={1601} sizes="100vw" loading="lazy" />
{/* Homepage editorial overlay, plus a bottom shade so the CTA stays AA on narrow screens */}
<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(43,40,35,0.55) 0%, rgba(43,40,35,0) 55%), linear-gradient(135deg, rgba(43,40,35,0.85) 0%, rgba(43,40,35,0.7) 40%, rgba(43,40,35,0.5) 100%)" }} />
<div className="absolute inset-0 z-10 flex flex-col justify-end">
<div className="max-w-[1440px] mx-auto px-5 lg:px-14 w-full pb-12 lg:pb-16">
<div className="max-w-lg">
<Rule />
<p className="eyebrow text-[#F4EEE4] mb-4">Wedding &amp; Event Gallery</p>
<h2 className="font-serif font-light text-white leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
THE LODGE IN IMAGES.
</h2>
<span className="btn-outline group-hover:bg-[#576276] transition-colors">View Wedding &amp; Event Gallery</span>
</div>
</div>
</div>
</Link>
</section>
{/* Testimonials */}
{hasTestimonials && (
<>
<SectionDivider label="From Our Couples" />
<section className={`${SECTION_Y} ${BG_SAND}`}>
<div className="max-w-[1440px] mx-auto px-5 lg:px-14">
<div className="mb-14">
<Rule />
<p className="eyebrow text-[#2B2823]/75">From Our Couples</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
{testimonials.slice(0, 3).map((t: any) => (
<div key={t.id} className={`testimonial-card ${BG_SAND_LIGHT} p-8 flex flex-col`} style={{ borderTopColor: ACCENT }}>
<blockquote className="font-serif italic text-[#2B2823] text-lg leading-relaxed flex-1 mb-6">"{t.quote}"</blockquote>
<div className="border-t border-[#2B2823]/15 pt-4">
<p className="text-[#2B2823] font-sans text-sm font-medium">{t.authorName}</p>
{t.authorTitle && <p className="eyebrow text-[#2B2823]/75 mt-1" style={{ fontSize: "10px" }}>{t.authorTitle}</p>}
</div>
</div>
))}
</div>
</div>
</section>
</>
)}
{/* CTA / Inline Inquiry Form */}
<SectionDivider label="Begin Your Inquiry" />
<section id="inquire" ref={ctaRef as React.RefObject<HTMLDivElement>} className={`fade-up ${SECTION_Y} ${hasTestimonials ? BG_SAND_LIGHT : BG_SAND}`}>
<div className="max-w-[1440px] mx-auto px-5 lg:px-14">
<div className="mb-10">
<Rule />
<p className="eyebrow text-[#2B2823]/75 mb-4">Begin Your Inquiry</p>
<h2 className="font-serif font-light text-[#2B2823] leading-tight mb-6" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
We'd love to hear about your wedding.
</h2>
<p className="font-sans text-[#2B2823]/80 leading-relaxed" style={{ fontSize: "0.9375rem", maxWidth: "38rem" }}>
We work with a limited number of couples each year. Share the basics and we'll respond within 24 hours.
</p>
</div>
<WeddingInquiryForm />
</div>
</section>
</div>
</PublicLayout>
);
}
