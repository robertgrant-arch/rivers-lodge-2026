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
  { name: "River Lawn", img: "/img/riverlawn.jpg", desc: "An open lawn between the Lodge and the Marais des Cygnes — the Lodge's most dramatic outdoor ceremony site. Seats up to 200." },
  { name: "Rivers Barn", img: "/img/barnwedding.jpg", desc: "6,000 sq ft of open timber-frame space. Accommodates up to 300 guests for ceremonies and receptions. Full catering kitchen." },
  { name: "Timber Edge", img: "/img/timberedge.jpg", desc: "A ceremony space framed by old-growth timber on the river corridor. Intimate, shaded, and unlike anything else in the region." },
  { name: "The Clubhouse", img: "/img/clubhousewedding.jpg", desc: "A refined indoor gathering space for wedding weekend hosting, cocktail hours, private dinners, and smaller celebrations." },
{ name: "The Pavilion", img: "", desc: "An open-air setting that adds flexibility for ceremonies, cocktail hours, dinners, or relaxed outdoor receptions." },
];

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
<label htmlFor="w-name" className="block text-white/70 tracking-wider text-xs mb-2">Full Name *</label>
<input id="w-name" type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition" required aria-required="true" autoComplete="name" />
</div>
<div className="mt-5">
<label htmlFor="w-email" className="block text-white/70 tracking-wider text-xs mb-2">Email Address *</label>
<input id="w-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition" required aria-required="true" autoComplete="email" />
</div>
<div className="mt-5">
<label htmlFor="w-phone" className="block text-white/70 tracking-wider text-xs mb-2">Phone Number *</label>
<input id="w-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 555-5555" className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition" required aria-required="true" autoComplete="tel" />
</div>
<div className="mt-5">
<label htmlFor="w-message" className="block text-white/70 tracking-wider text-xs mb-2">Tell Us About Your Wedding</label>
<textarea id="w-message" value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Share your wedding date, guest count, or anything else you'd like us to know." className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition min-h-[140px] resize-y" />
</div>
{TURNSTILE_SITE_KEY && (
<div className="mt-4">
<Turnstile
  ref={turnstileRef}
  siteKey={TURNSTILE_SITE_KEY}
  onSuccess={(token) => setCaptchaToken(token)}
  onError={() => setCaptchaToken("")}
  onExpire={() => setCaptchaToken("")}
  options={{ theme: "dark" }}
/>
</div>
)}
{submit.isError && (
<p className="text-sm font-sans text-red-600" role="alert">
  {submit.error?.message || "Something went wrong. Please try again or email us at info@riverslodge.com"}
</p>
)}
<button type="submit" disabled={!canSubmit} className="inline-flex items-center justify-center rounded-md bg-[#9B4D19] hover:bg-[#B4591E] disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase tracking-widest text-sm px-8 py-3 transition">
{submit.isPending ? "Sending…" : "SUBMIT WEDDING INQUIRY"}
</button>
</form>
);
}

export default function Weddings() {
const { data: testimonials } = trpc.cms.getTestimonials.useQuery({ division: "weddings", featuredOnly: true });
const venuesRef = useFadeUp();
const ctaRef = useFadeUp();
return (
<PublicLayout>
<SEOHead title="Weddings" description="Intimate, cinematic weddings on a private Kansas Lodge. Ceremony lawns, the Rivers Barn, and the Timber Edge Clubhouse — all exclusively yours." url="/weddings" structuredData={structuredData.weddingVenue()} />
<div style={{ "--track-accent": "#9B4D19" } as React.CSSProperties}>
{/* Hero */}
<section className="relative hero-full flex items-end pb-24 overflow-hidden">
<div className="absolute inset-0">
<Picture src={HERO} alt="Wedding ceremony at Rivers Lodge" label="Wedding Hero Image" className="absolute inset-0 w-full h-full" imgClassName="absolute inset-0 w-full h-full object-cover object-center" fetchPriority="high" loading="eager" decoding="async" width={1920} height={1080} sizes="100vw" />
<div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.10) 40%, oklch(0 0 0/0.78) 100%)" }} />
</div>
<div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
<div style={{ height: "1px", width: "2rem", backgroundColor: "#9B4D19", marginBottom: "1.25rem" }} />
<p className="eyebrow text-white/50 mb-4">Weddings</p>
<h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
Your wedding weekend. <br /><em className="italic font-light">Entirely private.</em>
</h1>
<p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
From intimate ceremonies to grand receptions- every wedding at the Lodge is exclusively yours. No other groups, no shared access.
</p>
<div className="flex flex-col sm:flex-row gap-4">
<a href="#inquire" className="btn-primary" style={{ backgroundColor: ACCENT, borderColor: ACCENT, color: "#2B2823" }}>Begin Wedding Inquiry</a>
<Link href="/lodging" className="btn-ghost">View Spaces & Lodging</Link>
</div>
</div>
</section>
{/* Pull Quote */}
<section className="section bg-surface">
<div className="max-w-[1440px] mx-auto px-5 lg:px-14">
<div className="max-w-3xl">
<blockquote className="pull-quote" style={{ borderLeftColor: "#9B4D19" }}>
"Every wedding at Rivers Lodge is exclusive. One couple, one weekend, one Lodge — entirely theirs."
</blockquote>
</div>
</div>
</section>
{/* Intro — Estate Hero with overlaid content */}
<section className="relative flex items-end overflow-hidden bg-[#2B2823]" style={{ minHeight: "90vh" }}>
<div className="absolute inset-0 bg-white">
<div className="absolute inset-0 flex items-center justify-center">
<span className="eyebrow text-muted-brand">EMPTY #1 — Private Estate Hero</span>
</div>
<img src={ESTATE_HERO || undefined} alt="EMPTY #1 — Private Estate Hero" className="absolute inset-0 w-full h-full object-contain block" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
<div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, oklch(0 0 0/0.30) 0%, oklch(0 0 0/0.55) 60%, oklch(0 0 0/0.82) 100%)" }} />
</div>
<div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full py-20 lg:py-28">
<div className="max-w-2xl">
<div style={{ height: "1px", width: "2rem", backgroundColor: "#9B4D19", marginBottom: "1.25rem" }} />
<p className="eyebrow text-white/50 mb-4">The Experience</p>
<h2 className="font-serif font-light text-white leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
Not a venue. <br /><em className="italic">A private Lodge.</em>
</h2>
<div className="space-y-5 font-sans text-white/70 leading-relaxed" style={{ fontSize: "0.9375rem" }}>
<p>When you book a wedding at Rivers Lodge, you book the entire Lodge. Your guests are the only guests. The ceremony lawns, Rivers Barn, Timber Edge, and your reserved lodging are all exclusively yours for the weekend.</p>
<p>We work with a limited number of couples each year to ensure every wedding receives the full attention of our team. We will never have multiple weddings going on at one time and the result is a totally private all weekend celebration with friends and family.</p>
</div>
</div>
</div>
</section>
{/* Venues */}
<section ref={venuesRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
<div className="max-w-[1440px] mx-auto px-5 lg:px-14">
<div className="mb-14">
<div style={{ height: "1px", width: "2rem", backgroundColor: "#9B4D19", marginBottom: "1.25rem" }} />
<p className="eyebrow text-muted-brand mb-4">Ceremony & Reception Spaces</p>
<h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
Every space is yours.
</h2>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
{venues.map((v, i) => {
const venuePlaceholderId = String(i + 1).padStart(2, '0');
return v.img ? (
<div key={v.name} className="relative bg-[#2B2823] aspect-[4/3] overflow-hidden group">
<div className="absolute inset-0 flex items-center justify-center">
<span className="eyebrow text-muted-brand">{v.name}</span>
</div>
<img src={v.img} alt={v.name} className="absolute inset-0 w-full h-full object-cover block" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
<div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 30%, oklch(0 0 0/0.82) 100%)" }} />
<div className="absolute bottom-0 left-0 right-0 p-8">
<div style={{ height: "1px", width: "1.5rem", backgroundColor: "#9B4D19", marginBottom: "0.75rem" }} />
<h3 className="font-serif text-white text-2xl mb-2">{v.name}</h3>
<p className="font-sans text-white/70 text-sm leading-relaxed">{v.desc}</p>
</div>
</div>
) : (
<div key={v.name} className={`bg-background p-8 flex flex-col ${i === venues.length - 1 && venues.length % 2 === 1 ? 'md:col-span-2' : ''}`}>
<div style={{ height: "1px", width: "1.5rem", backgroundColor: "#9B4D19", marginBottom: "0.75rem" }} />
<h3 className="font-serif text-warm text-2xl mb-3">{v.name}</h3>
<p className="font-sans text-muted-brand text-sm leading-relaxed flex-1">{v.desc}</p>
<p className="text-[10px] text-muted-brand mt-4 uppercase tracking-wide" data-placeholder-id={venuePlaceholderId}>Slot {venuePlaceholderId}</p>
</div>
);
})}
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
</PublicLayout>
);
}
