import { useRef, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import PublicLayout from "@shared/components/PublicLayout";
import Picture from "@shared/components/Picture";
import { trpc } from '@shared/lib/trpc';
import SEOHead, { structuredData } from '@shared/components/SEOHead';
import ReviewsCarousel from "../components/ReviewsCarousel";
import WeddingFaqAccordion from "../components/WeddingFaqAccordion";
import FindUsBadges from "../components/FindUsBadges";
import { WEDDING_REVIEWS } from "../weddingReviews";
import { WEDDING_FAQS, faqPageJsonLd } from "../weddingFaqs";

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

// ─── Text on photos ──────────────────────────────────────────────────────────
// Light touch: photos stay bright. Each text block gets a gentle, wide, very soft
// shade (SoftShade, ~¼–½ the strength of the old scrims) plus a letter shadow.
const TEXT_SHADOW = "0 1px 3px rgba(0,0,0,0.55), 0 2px 14px rgba(0,0,0,0.35)";
const SOFT_SHADE = { hero: 0.3, aerial: 0.26, barn: 0.3, gallery: 0.3 };
// "Rivers Lodge" heading sits on the hazy horizon at mobile widths: a slightly stronger letter shadow.
const AERIAL_HEADING_SHADOW = "0 1px 2px rgba(0,0,0,0.65), 0 0 10px rgba(0,0,0,0.5), 0 2px 18px rgba(0,0,0,0.35)";
// Space cards: a light gradient along the bottom edge only.
const CARD_GRADIENT = "linear-gradient(to top, rgba(43,40,35,0.55) 0%, rgba(43,40,35,0.28) 22%, rgba(43,40,35,0) 45%)";
// "The Event Barn" heading sits on near-white sky: deep Night text with a faint light glow.
const BARN_HEADING_COLOR = "#2B2823";
const BARN_HEADING_SHADOW = "0 0 2px rgba(255,255,255,0.6), 0 1px 12px rgba(255,255,255,0.45)";
// The barn photo is a dusk shot: lift exposure a little in CSS (source file untouched).
// Its sky is already near-white, so a slight contrast compression runs first to keep
// the sky from clipping while brightness lifts the barn's midtones (~16%).
const BARN_FILTER = "contrast(0.88) brightness(1.1)";
// The aerial is a dark sunset shot with an already-bright sky. A gamma lift (SVG filter,
// defined once in AerialLiftFilter) raises the trees, lawn and buildings ~75% while barely
// moving the sky's highlights, so the sunset keeps its color instead of clipping to white.
// A little saturation restores the warmth the lift mutes. Source file untouched.
const AERIAL_FILTER = "url(#rl-aerial-lift) saturate(1.35)";

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

/**
 * Gentle, wide shade behind a text block: a faint translucent rectangle much larger
 * than the text, heavily blurred so it fades out smoothly and never reads as a shape.
 */
function SoftShade({ alpha }: { alpha: number }) {
return (
<div aria-hidden="true" className="absolute pointer-events-none" style={{ inset: "-5rem -7rem", background: `rgba(43,40,35,${alpha})`, filter: "blur(72px)" }} />
);
}

/** SVG gamma curve used by AERIAL_FILTER (exponent < 1 lifts shadows/midtones, keeps highlights). */
function AerialLiftFilter() {
return (
<svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }} focusable="false">
<filter id="rl-aerial-lift" colorInterpolationFilters="sRGB">
<feComponentTransfer>
<feFuncR type="gamma" exponent="0.55" />
<feFuncG type="gamma" exponent="0.55" />
<feFuncB type="gamma" exponent="0.55" />
</feComponentTransfer>
</filter>
</svg>
);
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
 * Full-bleed property image with its text block anchored at the lower left.
 * A gentle SoftShade sits behind the text; most of the photo stays at full brightness.
 */
function PropertyPanel({ src, alt, objectPosition = "center", imgFilter, shade, children }: { src: string; alt: string; objectPosition?: string; imgFilter?: string; shade?: number; children: React.ReactNode }) {
return (
<section className="relative overflow-hidden flex items-end" style={{ minHeight: "90vh" }}>
<div className="absolute inset-0">
<Picture src={src} alt={alt} label={alt} className="absolute inset-0 w-full h-full" imgClassName="absolute inset-0 w-full h-full object-cover" imgStyle={{ objectPosition, filter: imgFilter }} sizes="100vw" loading="lazy" />
</div>
<div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full pt-40 pb-10 md:pb-12 lg:pb-14">
<div className="relative max-w-2xl text-white" style={{ textShadow: TEXT_SHADOW }}>
{shade ? <SoftShade alpha={shade} /> : null}
<div className="relative">
<Rule />
{children}
</div>
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
<div aria-hidden="true" className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-90 group-hover:opacity-100" style={{ background: CARD_GRADIENT }} />
<div className="absolute inset-x-0 bottom-0 p-7 lg:p-8 flex items-end justify-between gap-4">
<div>
<div aria-hidden="true" style={{ height: "1px", width: "1.5rem", backgroundColor: ACCENT, marginBottom: "0.75rem" }} />
<h3 className="font-serif text-white text-2xl lg:text-3xl leading-tight" style={{ textShadow: TEXT_SHADOW }}>{label}</h3>
</div>
<span aria-hidden="true" style={{ textShadow: TEXT_SHADOW }} className="text-white text-xl transition-transform duration-300 group-hover:translate-x-1">→</span>
</div>
</Link>
);
}

export default function Weddings() {
const venuesRef = useFadeUp();
const galleryRef = useFadeUp(0.05);
const ctaRef = useFadeUp();
const bodyCopy = "space-y-5 font-serif text-white leading-relaxed";
// JSON-LD: the existing wedding-venue node plus a FAQPage built from the shared FAQ data.
const { "@context": _ctx, ...venueNode } = structuredData.weddingVenue();
const weddingsJsonLd = { "@context": "https://schema.org", "@graph": [venueNode, faqPageJsonLd(WEDDING_FAQS)] };
return (
<PublicLayout>
<SEOHead title="Weddings" description="Intimate, cinematic weddings on a private Kansas Lodge. The Event Barn, the Clubhouse, and your reserved lodging — all exclusively yours." url="/weddings" structuredData={weddingsJsonLd} />
<div style={{ "--track-accent": ACCENT, "--btn-primary-text": "var(--rl-sand-light)" } as React.CSSProperties}>
{/* Hero */}
<section className="relative hero-full flex items-end pb-12 lg:pb-14 overflow-hidden">
<div className="absolute inset-0">
<Picture src={HERO} alt="Wedding ceremony at Rivers Lodge" label="Wedding Hero Image" className="absolute inset-0 w-full h-full" imgClassName="absolute inset-0 w-full h-full object-cover object-center" fetchPriority="high" loading="eager" decoding="async" width={1920} height={1080} sizes="100vw" />
{/* Very faint full-width tint at the bottom edge only; no shaded patch behind the text */}
<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(43,40,35,0.18) 0%, rgba(43,40,35,0) 35%)" }} />
</div>
<div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
<div className="relative w-fit max-w-full" style={{ textShadow: TEXT_SHADOW }}>
<SoftShade alpha={SOFT_SHADE.hero} />
<div className="relative">
<Rule />
<p className="eyebrow font-medium text-white mb-4">Weddings</p>
<h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
Your wedding weekend. <br /><em className="italic font-light">Entirely private.</em>
</h1>
<p className="font-sans font-medium text-white max-w-lg leading-relaxed mb-10" style={{ fontSize: "1rem" }}>
From intimate ceremonies to grand receptions- every wedding at the Lodge is exclusively yours. No other groups, no shared access.
</p>
<div className="flex flex-col sm:flex-row gap-4" style={{ textShadow: "none" }}>
<a href="#inquire" className="btn-primary">Begin Wedding Inquiry</a>
<Link href="/lodging" className="btn-ghost bg-[#2B2823]/55 backdrop-blur-sm">View Spaces & Lodging</Link>
</div>
</div>
</div>
</div>
</section>
{/* Property — Rivers Lodge (aerial) */}
<SectionDivider label="Rivers Lodge" />
<AerialLiftFilter />
<PropertyPanel src={PROPERTY_BG_1} alt="Aerial view of the Rivers Lodge property at sunset — timber, ponds, and prairie around the lodge and event barn" objectPosition="center 40%" imgFilter={AERIAL_FILTER} shade={SOFT_SHADE.aerial}>
<h2 className="font-serif font-light text-white leading-[1.02] mb-4" style={{ fontSize: "clamp(2.5rem,5.5vw,4.5rem)", textShadow: AERIAL_HEADING_SHADOW }}>
Rivers Lodge
</h2>
<p className="eyebrow not-italic font-medium text-white mb-8" style={{ fontSize: "0.875rem", letterSpacing: "0.2em" }}>
A PLACE TO CELEBRATE. A PLACE TO STAY.
</p>
<div className={bodyCopy} style={{ fontSize: "1.1875rem" }}>
<p>Set on approximately 113 acres of rolling oak and hickory timber surrounded by native prairie, Rivers Lodge offers a collection of thoughtfully designed spaces.</p>
<p>Our property features two primary event venues, The Event Barn and The Clubhouse, designed for weddings both large and intimate. On-site and nearby lodging includes The Lodge, The Farmhouse, The Annex, and Riverhouse Suites, offering a unique experience of hosting and staying in one place. In addition to on-site accommodations, the Ohana House offers an off-site lodging option located 20 minutes south of the main campus, appreciated for its comfort and privacy.</p>
</div>
</PropertyPanel>
{/* Property — The Event Barn */}
<SectionDivider label="The Event Barn" />
<PropertyPanel src={PROPERTY_BG_2} alt="The Event Barn at Rivers Lodge, a dark timber barn framed by autumn oaks at golden hour" objectPosition="center 45%" imgFilter={BARN_FILTER}>
<h2 className="font-serif font-light leading-[1.02] mb-8" style={{ fontSize: "clamp(2.5rem,5.5vw,4.5rem)", color: BARN_HEADING_COLOR, textShadow: BARN_HEADING_SHADOW }}>
The Event Barn
</h2>
{/* Shade only behind the white body copy; the dark heading above sits on clear sky */}
<div className="relative">
<SoftShade alpha={SOFT_SHADE.barn} />
<div className={`relative ${bodyCopy}`} style={{ fontSize: "1.1875rem" }}>
<p>The Event Barn is the signature event space at Rivers Lodge, blending rustic charm with modern design. The barn features original raw materials preserved from generations past alongside contemporary amenities. This open-concept space is perfect for ceremonies, receptions, and large gatherings.</p>
<p>At Rivers Lodge, our pricing is thoughtfully designed to offer flexibility while providing an exceptional, full-property experience. Whether you're hosting a single-day celebration or a full weekend gathering, each option includes access to our most loved spaces and the convenience of on-site lodging.</p>
<p>The beauty of our property allows you and your guests to relax, connect, and truly settle in.</p>
</div>
</div>
</PropertyPanel>
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
<p>When you book a wedding at Rivers Lodge, you book the entire Lodge. Your guests are the only guests. The Event Barn, the Clubhouse, and your reserved lodging are all exclusively yours for the weekend.</p>
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
<div className="absolute inset-0 z-10 flex flex-col justify-end">
<div className="max-w-[1440px] mx-auto px-5 lg:px-14 w-full pb-12 lg:pb-16">
<div className="relative max-w-lg w-fit" style={{ textShadow: TEXT_SHADOW }}>
<SoftShade alpha={SOFT_SHADE.gallery} />
<div className="relative">
<Rule />
<p className="eyebrow font-medium text-white mb-4">Wedding &amp; Event Gallery</p>
<h2 className="font-serif font-light text-white leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
THE LODGE IN IMAGES.
</h2>
<span className="btn-outline bg-[#2B2823]/55 backdrop-blur-sm group-hover:bg-[#576276] transition-colors" style={{ textShadow: "none" }}>View Wedding &amp; Event Gallery</span>
</div>
</div>
</div>
</div>
</Link>
</section>
{/* Reviews — static, from weddingReviews.ts (not the CMS) */}
<SectionDivider label="Reviews" />
<section id="reviews" aria-labelledby="reviews-heading" className={`${SECTION_Y} ${BG_SAND_LIGHT}`}>
<div className="max-w-[1440px] mx-auto px-5 lg:px-14">
<div className="mb-12 text-center">
<div aria-hidden="true" className="mx-auto" style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
<h2 id="reviews-heading" className="font-serif font-light text-[#2B2823] leading-tight" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
From Our Guests
</h2>
</div>
<ReviewsCarousel reviews={WEDDING_REVIEWS} />
</div>
</section>
{/* FAQs — shared data with /events (weddingFaqs.ts) */}
<SectionDivider label="FAQs" />
<section id="faqs" aria-labelledby="faqs-heading" className={`${SECTION_Y} ${BG_SAND}`}>
<div className="max-w-[1440px] mx-auto px-5 lg:px-14">
<div className="max-w-3xl mx-auto">
<div className="mb-12 text-center">
<div aria-hidden="true" className="mx-auto" style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
<h2 id="faqs-heading" className="font-serif font-light text-[#2B2823] leading-tight" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
Questions, Answered.
</h2>
</div>
<WeddingFaqAccordion items={WEDDING_FAQS} />
</div>
</div>
</section>
{/* CTA / Inline Inquiry Form */}
<SectionDivider label="Begin Your Inquiry" />
<section id="inquire" ref={ctaRef as React.RefObject<HTMLDivElement>} className={`fade-up ${SECTION_Y} ${BG_SAND_LIGHT}`}>
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
<FindUsBadges />
</div>
</section>
</div>
</PublicLayout>
);
}
