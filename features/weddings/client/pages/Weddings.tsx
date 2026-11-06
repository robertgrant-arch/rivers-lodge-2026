import { useRef, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import PublicLayout from "@shared/components/PublicLayout";
import WeddingGallery from "../components/WeddingGallery";
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

const ALL_VENUES = [
  // HIDDEN: River Lawn (may be restored later)
  // { name: "River Lawn", img: "/img/riverlawn.jpg", desc: "An open lawn between the Lodge and the Marais des Cygnes — the Lodge's most dramatic outdoor ceremony site. Seats up to 200." },
  { name: "Rivers Barn", img: "/img/barnwedding.jpg", desc: "6,000 sq ft of open timber-frame space. Accommodates up to 300 guests for ceremonies and receptions. Full catering kitchen." },
  // HIDDEN: Timber Edge (may be restored later)
  // { name: "Timber Edge", img: "/img/timberedge.jpg", desc: "A ceremony space framed by old-growth timber on the river corridor. Intimate, shaded, and unlike anything else in the region." },
  { name: "The Clubhouse", img: "/img/clubhousewedding.jpg", desc: "A refined indoor gathering space for wedding weekend hosting, cocktail hours, private dinners, and smaller celebrations." },
  // HIDDEN: The Pavilion (may be restored later)
  // { name: "The Pavilion", img: "", desc: "An open-air setting that adds flexibility for ceremonies, cocktail hours, dinners, or relaxed outdoor receptions." },
];

// Filter to show only available venues
const venues = ALL_VENUES.filter(v => !v.name.includes("River Lawn") && !v.name.includes("Timber Edge") && !v.name.includes("Pavilion"));

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

/** Full-bleed property image with copy overlaid directly on the photo over a see-through Night scrim. */
function PropertyPanel({ src, alt, align, children }: { src: string; alt: string; align: "left" | "right"; children: React.ReactNode }) {
// Scrims tuned for WCAG AA against the rendered photos (measured at 1440px and 390px).
// Desktop: shade concentrated on the text side, fading out so the rest of the photo stays clear.
// Mobile: text spans the full width, so a more even shade sits behind it.
const toward = align === "right" ? "to left" : "to right";
return (
<section className="relative overflow-hidden py-24 md:py-32 lg:py-40 flex items-center" style={{ minHeight: "90vh" }}>
<div className="absolute inset-0">
<Picture src={src} alt={alt} label={alt} className="absolute inset-0 w-full h-full" imgClassName="absolute inset-0 w-full h-full object-cover object-center" sizes="100vw" loading="lazy" />
<div className="absolute inset-0 pointer-events-none lg:hidden" style={{ background: "linear-gradient(to bottom, rgba(43,40,35,0.62) 0%, rgba(43,40,35,0.74) 15%, rgba(43,40,35,0.74) 85%, rgba(43,40,35,0.62) 100%)" }} />
<div className="absolute inset-0 pointer-events-none hidden lg:block" style={{ background: `linear-gradient(${toward}, rgba(43,40,35,0.80) 0%, rgba(43,40,35,0.70) 38%, rgba(43,40,35,0.35) 58%, rgba(43,40,35,0) 78%)` }} />
</div>
<div className={`relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full flex ${align === "right" ? "lg:justify-end" : "lg:justify-start"}`}>
<div className="max-w-2xl text-[#F4EEE4]" style={{ textShadow: "0 1px 14px rgba(43,40,35,0.55), 0 1px 2px rgba(43,40,35,0.5)" }}>
<Rule />
{children}
</div>
</div>
</section>
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
{/* Property — panel 1 */}
<PropertyPanel src={PROPERTY_BG_1} alt="Aerial view of the Rivers Lodge property at sunset — timber, ponds, and prairie around the lodge and event barn" align="left">
<h2 className="font-sans font-medium not-italic uppercase text-rl-sand leading-snug mb-8" style={{ fontSize: "clamp(1.5rem,2.6vw,2.125rem)", letterSpacing: "0.08em" }}>
A PLACE TO CELEBRATE. A PLACE TO STAY.
</h2>
<div className={bodyCopy} style={{ fontSize: "1.125rem" }}>
<p>Set on approximately 113 acres of rolling oak and hickory timber surrounded by native prairie, Rivers Lodge offers a collection of thoughtfully designed spaces.</p>
<p>Our property features two primary event venues, The Event Barn and The Clubhouse, designed for weddings both large and intimate. On-site and nearby lodging includes The Lodge, The Farmhouse, The Annex, and Riverhouse Suites, offering a unique experience of hosting and staying in one place. In addition to on-site accommodations, the Ohana House offers an off-site lodging option located 20 minutes south of the main campus, appreciated for its comfort and privacy.</p>
</div>
</PropertyPanel>
{/* Property — panel 2 */}
<PropertyPanel src={PROPERTY_BG_2} alt="The Event Barn at Rivers Lodge, a dark timber barn framed by autumn oaks at golden hour" align="right">
<div className={bodyCopy} style={{ fontSize: "1.125rem" }}>
<p>The Event Barn is the signature event space at Rivers Lodge, blending rustic charm with modern design. The barn features original raw materials preserved from generations past alongside contemporary amenities. This open-concept space is perfect for ceremonies, receptions, and large gatherings.</p>
<p>At Rivers Lodge, our pricing is thoughtfully designed to offer flexibility while providing an exceptional, full-property experience. Whether you're hosting a single-day celebration or a full weekend gathering, each option includes access to our most loved spaces and the convenience of on-site lodging.</p>
<p>The beauty of our property allows you and your guests to relax, connect, and truly settle in.</p>
</div>
</PropertyPanel>
{/* Pull Quote */}
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
{/* Venues */}
<section ref={venuesRef as React.RefObject<HTMLDivElement>} className={`fade-up ${SECTION_Y} ${BG_SAND}`}>
<div className="max-w-[1440px] mx-auto px-5 lg:px-14">
<div className="mb-14">
<Rule />
<p className="eyebrow text-[#2B2823]/75 mb-4">Ceremony & Reception Spaces</p>
<h2 className="font-serif font-light text-[#2B2823] leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
Every space is yours.
</h2>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
{venues.map((v) => {
return v.img ? (
<div key={v.name} className="relative bg-[#2B2823] aspect-[4/3] overflow-hidden group">
<div className="absolute inset-0 flex items-center justify-center">
<span className="eyebrow text-muted-brand">{v.name}</span>
</div>
<img src={v.img} alt={v.name} className="absolute inset-0 w-full h-full object-cover block" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
<div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(43,40,35,0.85) 100%)" }} />
<div className="absolute bottom-0 left-0 right-0 p-8">
<div aria-hidden="true" style={{ height: "1px", width: "1.5rem", backgroundColor: ACCENT, marginBottom: "0.75rem" }} />
<h3 className="font-serif text-white text-2xl mb-2">{v.name}</h3>
<p className="font-sans text-white/90 text-sm leading-relaxed">{v.desc}</p>
</div>
</div>
) : (
<div key={v.name} className={`${BG_SAND_LIGHT} p-8 flex flex-col`}>
<div aria-hidden="true" style={{ height: "1px", width: "1.5rem", backgroundColor: ACCENT, marginBottom: "0.75rem" }} />
<h3 className="font-serif text-[#2B2823] text-2xl mb-3">{v.name}</h3>
<p className="font-sans text-[#2B2823]/80 text-sm leading-relaxed flex-1">{v.desc}</p>
</div>
);
})}
</div>
</div>
</section>
{/* Gallery */}
<section id="gallery" ref={galleryRef as React.RefObject<HTMLDivElement>} className={`fade-up ${SECTION_Y} ${BG_SAND_LIGHT}`}>
<div className="max-w-[1440px] mx-auto px-5 lg:px-14">
<div className="mb-14">
<Rule />
<p className="eyebrow text-[#2B2823]/75 mb-4">Gallery</p>
<h2 className="font-serif font-light text-[#2B2823] leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
Weddings at <em className="italic text-rl-grass">Rivers Lodge.</em>
</h2>
</div>
<WeddingGallery />
</div>
</section>
{/* Testimonials */}
{hasTestimonials && (
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
)}
{/* CTA / Inline Inquiry Form */}
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
