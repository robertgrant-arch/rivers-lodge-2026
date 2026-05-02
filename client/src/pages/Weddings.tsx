import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";
import SEOHead, { structuredData } from "@/components/SEOHead";
import StickyInquiryCTA from "@/components/StickyInquiryCTA";


const HERO      = "/manus-storage/UebeleinWed335_e6a9084a.jpg";
const CEREMONY  = "/manus-storage/UebeleinWed405_59f02b8c.jpg";
const RECEPTION = "/manus-storage/UebeleinWed557_b0b3b0ff.jpg";
const BARN_INT  = "/manus-storage/6M9A3239_d4c999f4.jpg";
const GROUNDS   = "/manus-storage/6M9A3253_319f3a3b.jpg";
const AERIAL    = "/manus-storage/DJI_0017_538feef1.jpg";
const RIVER_LWN = "/manus-storage/20200515-3M4A7947_af6607de.jpg";
const LODGE     = "/manus-storage/974A9398edit_294e71ff.jpg";
const INTERIOR  = "/manus-storage/974A8419edit_f37de96e.jpg";

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
      <div style={{ "--track-accent": "oklch(0.70 0.060 50)" } as React.CSSProperties}>

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Wedding at Rivers Lodge" className="w-full h-full object-cover object-top" fetchPriority="high" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.10) 40%, oklch(0 0 0/0.78) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.70 0.060 50)", marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Weddings</p>
          <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
            Your wedding weekend.
            <br /><em className="italic font-light">Entirely private.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            From intimate ceremonies on the River Lawn to grand receptions in the Rivers Barn — every wedding at the Lodge is exclusively yours. No other groups, no shared access.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/contact?type=wedding" className="btn-primary" style={{ backgroundColor: "oklch(0.70 0.060 50)", borderColor: "oklch(0.70 0.060 50)", color: "oklch(0.10 0.005 60)" }}>
              Begin Wedding Inquiry
            </Link>
            <Link href="/lodging" className="btn-ghost">View Spaces &amp; Lodging</Link>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">
            <div>
              <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.70 0.060 50)", marginBottom: "1.25rem" }} />
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
              <div className="col-span-2 aspect-[16/9] overflow-hidden">
                <img src={CEREMONY} alt="Outdoor ceremony" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="aspect-square overflow-hidden">
                <img src={RECEPTION} alt="Reception" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="aspect-square overflow-hidden">
                <img src={AERIAL} alt="Aerial estate view" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pull Quote */}
      <section className="section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-3xl">
            <blockquote className="pull-quote" style={{ borderLeftColor: "oklch(0.70 0.060 50)" }}>
              "Every wedding at Rivers Lodge is exclusive. One couple, one weekend, one estate — entirely theirs."
            </blockquote>
          </div>
        </div>
      </section>

      {/* Venues */}
      <section ref={venuesRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.70 0.060 50)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Ceremony &amp; Reception Spaces</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Every space is yours.
            </h2>
          </div>
          <div className="space-y-px bg-border">
            {venues.map((v, i) => (
              <div key={v.name} className={`grid grid-cols-1 md:grid-cols-2 bg-background ${i % 2 === 1 ? "md:[direction:rtl]" : ""}`}>
                <div className={`aspect-[4/3] overflow-hidden ${i % 2 === 1 ? "md:[direction:ltr]" : ""}`}>
                  <img src={v.img} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className={`p-10 lg:p-14 flex flex-col justify-center ${i % 2 === 1 ? "md:[direction:ltr]" : ""}`}>
                  <div style={{ height: "1px", width: "1.5rem", backgroundColor: "oklch(0.70 0.060 50)", marginBottom: "1rem" }} />
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
              <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.70 0.060 50)", marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand">From Our Couples</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {testimonials.slice(0, 3).map((t: any) => (
                <div key={t.id} className="testimonial-card bg-surface p-8 flex flex-col" style={{ borderTopColor: "oklch(0.70 0.060 50)" }}>
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

      {/* CTA */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-2xl">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.70 0.060 50)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Begin Your Inquiry</p>
            <h2 className="font-serif font-light text-warm leading-tight mb-6" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
              We'd love to hear about your wedding.
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
              We work with a limited number of couples each year. Share the basics and we'll respond within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact?type=wedding" className="btn-primary" style={{ backgroundColor: "oklch(0.70 0.060 50)", borderColor: "oklch(0.70 0.060 50)", color: "oklch(0.10 0.005 60)" }}>
                Begin Wedding Inquiry
              </Link>
              <Link href="/estate" className="btn-ghost">Explore the Estate</Link>
            </div>
          </div>
        </div>
      </section>

      </div>
      <StickyInquiryCTA
        href="/contact?type=wedding"
        label="Begin Wedding Inquiry"
        accentColor="oklch(0.70 0.060 50)"
      />
    </PublicLayout>
  );
}
