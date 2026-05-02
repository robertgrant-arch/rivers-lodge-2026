import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import SEOHead, { structuredData } from "@/components/SEOHead";


/* ── Image constants ─────────────────────────────────────────────────────── */
const HERO          = "/manus-storage/DJI_0017_538feef1.jpg";
const AERIAL_RIVER  = "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg";
const LODGE_EXT     = "/manus-storage/974A9398edit_294e71ff.jpg";
const FIRE_PIT      = "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg";
const CLUBHOUSE_BAR = "/manus-storage/3C0A0304_cb66bc23.jpg";
const WEDDING_1     = "/manus-storage/UebeleinWed335_e6a9084a.jpg";
const WEDDING_2     = "/manus-storage/UebeleinWed629_ebea0f99.jpg";
const WEDDING_3     = "/manus-storage/UebeleinWed557_b0b3b0ff.jpg";
const GROUNDS_1     = "/manus-storage/6M9A3253_319f3a3b.jpg";
const GROUNDS_2     = "/manus-storage/6M9A3239_d4c999f4.jpg";
const GROUNDS_3     = "/manus-storage/Rivers_SEPT2022_-241_9b9f5433.jpg";
const INTERIOR_1    = "/manus-storage/974A8419edit_f37de96e.jpg";
const INTERIOR_2    = "/manus-storage/Rivers_May2023-28_f44fb1bd.jpg";

/* ── Fade-up hook (single element) ──────────────────────────────────────── */
function useFadeUp(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { el.classList.add("visible"); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

/* ── Staggered group fade hook ───────────────────────────────────────────── */
function useStaggerFade(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const children = Array.from(container.children) as HTMLElement[];
    if (reduced) { children.forEach(c => c.classList.add("visible")); return; }
    children.forEach((c, i) => {
      c.classList.add("fade-up");
      c.style.transitionDelay = `${i * 100}ms`;
    });
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          children.forEach(c => c.classList.add("visible"));
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(container);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

/* ── Scroll indicator ────────────────────────────────────────────────────── */
function ScrollIndicator() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 transition-opacity duration-500"
      style={{ opacity: hidden ? 0 : 1 }}
      aria-hidden="true"
    >
      <p className="eyebrow text-white/30" style={{ fontSize: "9px", letterSpacing: "0.28em" }}>Scroll</p>
      <div className="relative w-px h-10 overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full bg-white/30"
          style={{
            height: "100%",
            animation: "scrollLine 1.4s cubic-bezier(0.4,0,0.6,1) infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes scrollLine {
          0%   { transform: translateY(-100%); opacity: 1; }
          60%  { transform: translateY(0%);    opacity: 1; }
          100% { transform: translateY(100%);  opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes scrollLine { 0%, 100% { transform: none; opacity: 0.3; } }
        }
      `}</style>
    </div>
  );
}

/* ── Dual-Track Panel ────────────────────────────────────────────────────── */
function TrackPanel({
  track, title, tagline, description, links, cta, ctaHref,
  image, accentColor, isExpanded, onHover,
}: {
  track: string; title: string; tagline: string; description: string;
  links: { label: string; href: string }[]; cta: string; ctaHref: string;
  image: string; accentColor: string; isExpanded: boolean; onHover: () => void;
}) {
  return (
    <div
      className={`relative overflow-hidden cursor-pointer group ${
        isExpanded ? "flex-[1.55]" : "flex-[0.72]"
      }`}
      style={{ transition: "flex 500ms cubic-bezier(0.16, 1, 0.3, 1)" }}
      onMouseEnter={onHover}
    >
      {/* Background image — NO scale on hover per design system */}
      <div className="absolute inset-0">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          style={{
            objectPosition: isExpanded ? "center 45%" : "center center",
            transition: "object-position 500ms ease",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: isExpanded
              ? "linear-gradient(to top, oklch(0 0 0/0.85) 0%, oklch(0 0 0/0.30) 55%, transparent 100%)"
              : "linear-gradient(to top, oklch(0 0 0/0.75) 0%, oklch(0 0 0/0.55) 100%)",
            transition: "background 500ms ease",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-8 lg:p-14">
        <p className="eyebrow text-white/50 mb-3">{track}</p>

        <h2
          className="font-serif font-light text-white leading-tight mb-3"
          style={{
            fontSize: isExpanded ? "clamp(1.875rem,3.5vw,3.25rem)" : "clamp(1.375rem,2vw,2rem)",
            transition: "font-size 500ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {title}
        </h2>

        <p
          className="font-serif italic text-white/75 mb-5"
          style={{
            fontSize: isExpanded ? "1.0625rem" : "0.875rem",
            transition: "font-size 500ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {tagline}
        </p>

        {/* Accent rule */}
        <div
          className="h-px mb-6"
          style={{
            width: isExpanded ? "2.5rem" : "1.25rem",
            backgroundColor: accentColor,
            transition: "width 400ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />

        {/* Description — slides in when expanded */}
        <div
          style={{
            maxHeight: isExpanded ? "6rem" : "0",
            opacity: isExpanded ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 500ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease",
            marginBottom: isExpanded ? "1.5rem" : "0",
          }}
        >
          <p className="text-white/65 text-sm font-sans leading-relaxed max-w-sm">
            {description}
          </p>
        </div>

        {/* Sub-links */}
        <div
          className="flex flex-wrap gap-x-5 gap-y-2 mb-7"
          style={{
            opacity: isExpanded ? 1 : 0,
            transition: "opacity 300ms ease",
          }}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[10px] tracking-[0.16em] uppercase font-sans text-white/55 hover:text-white transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Primary CTA */}
        <Link
          href={ctaHref}
          className="self-start text-[11px] tracking-[0.16em] uppercase font-sans font-medium px-7 py-3.5 border transition-all duration-200"
          style={{
            borderColor: accentColor,
            color: accentColor,
            backgroundColor: "transparent",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

/* ── Gallery images ──────────────────────────────────────────────────────── */
const galleryImages = [
  { src: WEDDING_1,    alt: "Outdoor ceremony on the deck" },
  { src: AERIAL_RIVER, alt: "Aerial view of the river at golden hour" },
  { src: WEDDING_2,    alt: "Reception tables in the Rivers Barn" },
  { src: LODGE_EXT,    alt: "The Lodge exterior" },
  { src: WEDDING_3,    alt: "Couple by the lake with string lights" },
  { src: INTERIOR_1,   alt: "Lodge living room" },
  { src: FIRE_PIT,     alt: "Fire pit by the river at dusk" },
  { src: INTERIOR_2,   alt: "Riverhouse Suites interior" },
];

const stats = [
  { value: "300+", label: "Acres" },
  { value: "1",    label: "River" },
  { value: "5",    label: "Buildings" },
  { value: "16+",  label: "Bedrooms" },
];

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function Home() {
  const [expandedTrack, setExpandedTrack] = useState<"weddings" | "membership">("weddings");
  const { data: testimonials } = trpc.cms.getTestimonials.useQuery({ featuredOnly: true });

  const statsRef      = useFadeUp();
  const statementRef  = useFadeUp();
  const tracksRef     = useFadeUp(0.05);
  const propertyRef   = useFadeUp();
  const galleryRef    = useFadeUp(0.05);
  const statsStagger  = useStaggerFade();
  const ctaRef        = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
  description="A private estate in La Cygne, Kansas — world-class weddings & events and an exclusive sporting membership with hunting, fishing, and luxury lodging."
  url="/"
  structuredData={structuredData.localBusiness()}
/>

      {/* ── 01. Cinematic Hero ─────────────────────────────────────────── */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO}
            alt="Rivers Lodge & Hunt Club — aerial view at golden hour"
            className="w-full h-full object-cover object-center"
            fetchPriority="high"
          />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.15) 40%, oklch(0 0 0/0.72) 100%)" }}
          />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div className="gold-rule mb-5" />
          <p className="eyebrow text-white/50 mb-5">La Cygne, Kansas</p>
          <h1
            className="font-serif font-light text-white leading-[0.92] mb-6"
            style={{ fontSize: "clamp(3.25rem,8.5vw,7.5rem)" }}
          >
            Rivers Lodge
            <br />
            <em className="italic font-light">&amp; Hunt Club</em>
          </h1>
          <p className="font-sans text-white/70 max-w-lg mb-10 leading-relaxed"
            style={{ fontSize: "clamp(0.9375rem,1.2vw,1.0625rem)" }}
          >
            A private estate on the Marais des Cygnes. A destination wedding venue one hour from Kansas City — and a private membership club for those who hunt, fish, and live on the land.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/events" className="btn-primary">Weddings &amp; Events</Link>
            <Link href="/outdoors" className="btn-ghost">Membership &amp; Outdoors</Link>
          </div>
        </div>

        <ScrollIndicator />
      </section>

      {/* ── 02. Stats Bar ──────────────────────────────────────────────── */}
      <div ref={statsRef} className="fade-up bg-surface border-y border-border">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14 py-10">
          <div ref={statsStagger} className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="stat-item">
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 03. Brand Statement ────────────────────────────────────────── */}
      <section ref={statementRef} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-2xl mx-auto text-center">
            <div className="gold-rule mx-auto mb-5" />
            <p className="eyebrow text-muted-brand mb-6">The Estate</p>
            <h2
              className="font-serif font-light italic text-warm leading-tight mb-8"
              style={{ fontSize: "clamp(1.875rem,3.8vw,3rem)" }}
            >
              Not a venue. Not a resort.
              <br />A private estate — entirely yours.
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed mb-10 mx-auto"
              style={{ fontSize: "0.9375rem", maxWidth: "38ch" }}
            >
              The Rivers Lodge &amp; Hunt Club is a working land estate on the Marais des Cygnes River. It is available exclusively — one event or one membership at a time. No shared access. No strangers.
            </p>
            <Link href="/estate" className="link-arrow mx-auto justify-center">
              Discover the Estate
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 04. Dual-Track Pathway Split ───────────────────────────────── */}
      <section ref={tracksRef} className="fade-up">
        {/* Desktop: flex-expansion panels */}
        <div className="hidden md:flex" style={{ height: "78vh", minHeight: "520px" }}>
          <TrackPanel
            track="Weddings & Events"
            title="Your wedding weekend, entirely private."
            tagline="Destination weddings, corporate retreats, and milestone events."
            description="From intimate ceremonies on the River Lawn to grand receptions in the Rivers Barn — every event at the Lodge is exclusively yours. No other groups, no shared access."
            links={[
              { label: "Weddings", href: "/weddings" },
              { label: "Corporate", href: "/corporate" },
              { label: "Lodging", href: "/lodging" },
            ]}
            cta="Plan Your Event"
            ctaHref="/events"
            image={WEDDING_2}
            accentColor="oklch(0.70 0.060 50)"
            isExpanded={expandedTrack === "weddings"}
            onHover={() => setExpandedTrack("weddings")}
          />
          <TrackPanel
            track="Membership & Outdoors"
            title="Hunt, fish, and belong."
            tagline="Private membership on 300 acres of prime Kansas land."
            description="Five private fisheries, managed whitetail and waterfowl hunting, sporting clays, and a community of members who share a deep respect for the land."
            links={[
              { label: "Hunt", href: "/hunt" },
              { label: "Fish", href: "/fish" },
              { label: "Membership", href: "/membership" },
            ]}
            cta="Explore Membership"
            ctaHref="/outdoors"
            image={AERIAL_RIVER}
            accentColor="oklch(0.58 0.065 145)"
            isExpanded={expandedTrack === "membership"}
            onHover={() => setExpandedTrack("membership")}
          />
        </div>

        {/* Mobile: stacked full-width cards */}
        <div className="md:hidden flex flex-col">
          {[
            { track: "Weddings & Events", title: "Your wedding weekend, entirely private.", cta: "Plan Your Event", href: "/events", image: WEDDING_2, accent: "oklch(0.70 0.060 50)" },
            { track: "Membership & Outdoors", title: "Hunt, fish, and belong.", cta: "Explore Membership", href: "/outdoors", image: AERIAL_RIVER, accent: "oklch(0.58 0.065 145)" },
          ].map((card) => (
            <div key={card.track} className="relative overflow-hidden" style={{ height: "62vw", minHeight: "280px" }}>
              <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, oklch(0 0 0/0.82) 0%, oklch(0 0 0/0.25) 60%, transparent 100%)" }} />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <p className="eyebrow text-white/50 mb-2" style={{ fontSize: "10px" }}>{card.track}</p>
                <h3 className="font-serif font-light text-white text-2xl leading-tight mb-5">{card.title}</h3>
                <Link
                  href={card.href}
                  className="self-start text-[11px] tracking-[0.16em] uppercase font-sans font-medium px-6 py-3 border"
                  style={{ borderColor: card.accent, color: card.accent }}
                >
                  {card.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 05. Property Overview ──────────────────────────────────────── */}
      <section ref={propertyRef} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div>
              <div className="gold-rule mb-5" />
              <p className="eyebrow text-muted-brand mb-4">The Property</p>
              <h2
                className="font-serif font-light text-warm leading-tight mb-6"
                style={{ fontSize: "clamp(1.75rem,3.2vw,2.75rem)" }}
              >
                Five buildings.<br />
                <em className="italic">One river.</em><br />
                Three hundred acres.
              </h2>
              <p className="font-sans text-muted-brand leading-relaxed mb-8" style={{ fontSize: "0.9375rem" }}>
                The Rivers Lodge &amp; Hunt Club is built around the natural drama of the Marais des Cygnes River valley. The Lodge sleeps up to 20. The Rivers Barn hosts up to 300 for events. The Clubhouse, Annex, and Riverhouse Suites complete a property that can accommodate an entire wedding party — or a private hunting party — without leaving the estate.
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-5 mb-10">
                {[
                  { label: "The Lodge", desc: "Main residence, up to 20 guests" },
                  { label: "Rivers Barn", desc: "Event venue, up to 300 guests" },
                  { label: "Clubhouse", desc: "Dining, bar & meeting space" },
                  { label: "Riverhouse Suites", desc: "Boutique suites by the water" },
                ].map((b) => (
                  <div key={b.label}>
                    <p className="text-warm font-sans text-sm font-medium mb-1">{b.label}</p>
                    <p className="text-muted-brand font-sans text-xs leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>
              <Link href="/lodging" className="link-arrow">
                View All Spaces
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>

            {/* Image collage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 aspect-[16/9] overflow-hidden">
                <img src={GROUNDS_2} alt="Rivers Barn interior" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="aspect-square overflow-hidden">
                <img src={LODGE_EXT} alt="The Lodge exterior" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="aspect-square overflow-hidden">
                <img src={INTERIOR_1} alt="Lodge living room" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 06. Testimonials ───────────────────────────────────────────── */}
      <section className="section bg-[oklch(0.10_0.010_66)]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-center">
            <div>
              <div className="gold-rule mb-6" />
              <p className="eyebrow text-white/40 mb-4">From Our Guests</p>
              <h2 className="font-serif text-3xl md:text-4xl text-white leading-tight">
                Words from those who know the Lodge best.
              </h2>
            </div>
            <TestimonialsCarousel featuredOnly={true} autoAdvanceMs={5000} />
          </div>
        </div>
      </section>

      {/* ── 07. Gallery Strip ──────────────────────────────────────────── */}
      <section ref={galleryRef} className="fade-up bg-surface py-10 overflow-hidden">
        <div className="scroll-strip px-5 lg:px-14 pb-2">
          {galleryImages.map((img, i) => (
            <div
              key={i}
              className="w-[280px] md:w-[340px] lg:w-[400px] aspect-[4/3] overflow-hidden shrink-0"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/gallery" className="link-arrow inline-flex">
            View Full Gallery
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>

      {/* ── 08. Dual CTA ───────────────────────────────────────────────── */}
      <section ref={ctaRef} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            <div className="bg-background p-10 lg:p-16 flex flex-col">
              <div className="h-px w-8 mb-6" style={{ backgroundColor: "oklch(0.70 0.060 50)" }} />
              <p className="eyebrow text-muted-brand mb-3">Weddings &amp; Events</p>
              <h3 className="font-serif font-light text-warm leading-tight mb-5"
                style={{ fontSize: "clamp(1.625rem,2.5vw,2.25rem)" }}>
                Start planning your<br />wedding weekend.
              </h3>
              <p className="font-sans text-muted-brand text-sm leading-relaxed mb-10 flex-1">
                Our team works with a limited number of couples each year to ensure every wedding receives the full attention it deserves.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/events" className="btn-outline" style={{ borderColor: "oklch(0.70 0.060 50)", color: "oklch(0.70 0.060 50)" }}>
                  Explore Weddings
                </Link>
                <Link href="/contact?type=wedding" className="btn-ghost">Request a Tour</Link>
              </div>
            </div>

            <div className="bg-surface p-10 lg:p-16 flex flex-col">
              <div className="h-px w-8 mb-6" style={{ backgroundColor: "oklch(0.58 0.065 145)" }} />
              <p className="eyebrow text-muted-brand mb-3">Membership &amp; Outdoors</p>
              <h3 className="font-serif font-light text-warm leading-tight mb-5"
                style={{ fontSize: "clamp(1.625rem,2.5vw,2.25rem)" }}>
                Membership is<br />by invitation.
              </h3>
              <p className="font-sans text-muted-brand text-sm leading-relaxed mb-10 flex-1">
                A limited number of memberships are available each season. If you're interested in joining, we'd like to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/outdoors" className="btn-outline" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
                  Learn About Membership
                </Link>
                <Link href="/membership#apply" className="btn-ghost">Apply Now</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
