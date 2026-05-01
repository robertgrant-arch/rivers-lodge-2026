import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";

/* ── Image constants ─────────────────────────────────────────────────────── */
const HERO          = "/manus-storage/DJI_0017_538feef1.jpg";
const AERIAL_RIVER  = "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg";
const LODGE_EXT     = "/manus-storage/974A9398edit_294e71ff.jpg";
const FIRE_PIT      = "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg";
const CLUBHOUSE_BAR = "/manus-storage/3C0A0304_cb66bc23.jpg";
const WEDDING_1     = "/manus-storage/UebeleinWed335_e6a9084a.jpg";
const WEDDING_2     = "/manus-storage/UebeleinWed629_ebea0f99.jpg";
const WEDDING_3     = "/manus-storage/UebeleinWed557_b0b3b0ff.jpg";
const GROUNDS_1     = "/manus-storage/6M9A3253_319f3a3b.jpg";
const GROUNDS_2     = "/manus-storage/6M9A3239_d4c999f4.jpg";
const GROUNDS_3     = "/manus-storage/Rivers_May2023-8_d07307f4.jpg";
const INTERIOR_1    = "/manus-storage/974A8419edit_f37de96e.jpg";
const INTERIOR_2    = "/manus-storage/Rivers_May2023-28_f44fb1bd.jpg";

/* ── Fade-up hook ────────────────────────────────────────────────────────── */
function useFadeUp(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

/* ── Gallery strip images ────────────────────────────────────────────────── */
const galleryImages = [
  { src: WEDDING_1,     alt: "Outdoor ceremony on the deck" },
  { src: AERIAL_RIVER,  alt: "Fire pit by the river at dusk" },
  { src: WEDDING_2,     alt: "Reception tables in the Rivers Barn" },
  { src: LODGE_EXT,     alt: "The Lodge exterior" },
  { src: WEDDING_3,     alt: "Couple by the lake with string lights" },
  { src: INTERIOR_1,    alt: "Lodge living room with antler chandelier" },
  { src: FIRE_PIT,      alt: "Estate grounds wide shot" },
  { src: INTERIOR_2,    alt: "Riverhouse Suites interior" },
];

/* ── Stats ───────────────────────────────────────────────────────────────── */
const stats = [
  { value: "300+", label: "Acres" },
  { value: "1",    label: "River" },
  { value: "5",    label: "Buildings" },
  { value: "16+",  label: "Bedrooms" },
];

/* ── Dual-Track Panel ────────────────────────────────────────────────────── */
function TrackPanel({
  track,
  title,
  tagline,
  description,
  links,
  cta,
  ctaHref,
  image,
  accentColor,
  isExpanded,
  onHover,
}: {
  track: string;
  title: string;
  tagline: string;
  description: string;
  links: { label: string; href: string }[];
  cta: string;
  ctaHref: string;
  image: string;
  accentColor: string;
  isExpanded: boolean;
  onHover: () => void;
}) {
  return (
    <div
      className={`relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer group ${
        isExpanded ? "flex-[1.6]" : "flex-[0.7]"
      }`}
      onMouseEnter={onHover}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background: isExpanded
              ? "linear-gradient(to top, oklch(0 0 0/0.82) 0%, oklch(0 0 0/0.35) 55%, transparent 100%)"
              : "linear-gradient(to top, oklch(0 0 0/0.72) 0%, oklch(0 0 0/0.50) 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-8 lg:p-12">
        {/* Eyebrow */}
        <p className="eyebrow text-[oklch(0.94_0.008_78)/60] mb-3">{track}</p>

        {/* Title */}
        <h2
          className="font-serif text-white leading-tight mb-3 transition-all duration-500"
          style={{ fontSize: isExpanded ? "clamp(2rem,4vw,3.5rem)" : "clamp(1.5rem,2.5vw,2.25rem)" }}
        >
          {title}
        </h2>

        {/* Tagline */}
        <p
          className="font-serif italic text-[oklch(0.94_0.008_78)/80] mb-4 transition-all duration-500"
          style={{ fontSize: isExpanded ? "1.125rem" : "0.9375rem" }}
        >
          {tagline}
        </p>

        {/* Accent rule */}
        <div
          className="h-px mb-5 transition-all duration-500"
          style={{ width: isExpanded ? "2.5rem" : "1.5rem", backgroundColor: accentColor }}
        />

        {/* Description — only visible when expanded */}
        <p
          className={`text-[oklch(0.94_0.008_78)/70] text-sm font-sans leading-relaxed mb-6 max-w-sm transition-all duration-500 ${
            isExpanded ? "opacity-100 max-h-24" : "opacity-0 max-h-0 overflow-hidden"
          }`}
        >
          {description}
        </p>

        {/* Sub-links */}
        <div
          className={`flex flex-wrap gap-x-5 gap-y-2 mb-7 transition-all duration-500 ${
            isExpanded ? "opacity-100" : "opacity-0"
          }`}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[10px] tracking-[0.16em] uppercase font-sans text-[oklch(0.94_0.008_78)/60] hover:text-[oklch(0.94_0.008_78)] transition-colors"
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
            color: isExpanded ? oklchToHex(accentColor) : "oklch(0.94 0.008 78)",
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

// Simple passthrough — we use CSS color strings directly
function oklchToHex(c: string) { return c; }

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function Home() {
  const [expandedTrack, setExpandedTrack] = useState<"weddings" | "membership">("weddings");
  const { data: testimonials } = trpc.cms.getTestimonials.useQuery({ featuredOnly: true });

  const statsRef    = useFadeUp();
  const statementRef = useFadeUp();
  const tracksRef   = useFadeUp(0.05);
  const galleryRef  = useFadeUp(0.05);

  return (
    <PublicLayout>

      {/* ── 01. Cinematic Hero ─────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[620px] flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO}
            alt="Rivers Lodge & Hunt Club — aerial view at golden hour"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/75" />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
          <p className="eyebrow text-[oklch(0.94_0.008_78)/50] mb-5">
            La Cygne, Kansas
          </p>
          <h1
            className="font-serif font-light text-white leading-[0.92] mb-6"
            style={{ fontSize: "clamp(3.5rem,9vw,8rem)", textShadow: "0 2px 48px rgba(0,0,0,0.35)" }}
          >
            Rivers Lodge
            <br />
            <em className="italic font-light">&amp; Hunt Club</em>
          </h1>
          <p className="text-base md:text-lg font-sans text-[oklch(0.94_0.008_78)/75] max-w-xl mb-10 leading-relaxed">
            A private estate on the Marais des Cygnes. A destination wedding venue one hour from Kansas City — and a private membership club for those who hunt, fish, and live on the land.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/weddings" className="btn-primary">
              Weddings &amp; Events
            </Link>
            <Link href="/membership" className="btn-ghost">
              Membership &amp; Outdoors
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <p className="eyebrow text-[oklch(0.94_0.008_78)/35]" style={{ fontSize: "9px" }}>Scroll</p>
          <div className="w-px h-10 bg-[oklch(0.94_0.008_78)/25]" />
        </div>
      </section>

      {/* ── 02. Stats Bar ──────────────────────────────────────────────── */}
      <div ref={statsRef} className="fade-up bg-[oklch(0.115_0.007_64)] border-y border-[oklch(0.22_0.008_64)]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-serif text-3xl md:text-4xl text-[oklch(0.72_0.095_78)] leading-none mb-1">{s.value}</p>
                <p className="eyebrow text-[oklch(0.55_0.012_70)]" style={{ fontSize: "10px" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 03. Brand Statement ────────────────────────────────────────── */}
      <section ref={statementRef} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="gold-rule mx-auto" />
            <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-6">The Estate</p>
            <h2
              className="font-serif font-light italic text-[oklch(0.94_0.008_78)] mb-8 leading-tight"
              style={{ fontSize: "clamp(2rem,4vw,3.25rem)" }}
            >
              Not a venue. Not a resort.<br />
              A private estate — entirely yours.
            </h2>
            <p className="text-[oklch(0.60_0.015_72)] font-sans text-base leading-relaxed max-w-xl mx-auto mb-10">
              The Rivers Lodge &amp; Hunt Club occupies 300 acres along the Marais des Cygnes River. When you book the estate, the entire property is yours — no other guests, no shared spaces, no compromises. Whether you're planning a wedding weekend or a private hunting season, this is your land.
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
        {/* Desktop: side-by-side panels */}
        <div className="hidden md:flex h-[75vh] min-h-[520px]">
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
            ctaHref="/weddings"
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
            ctaHref="/membership"
            image={AERIAL_RIVER}
            accentColor="oklch(0.58 0.065 145)"
            isExpanded={expandedTrack === "membership"}
            onHover={() => setExpandedTrack("membership")}
          />
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden flex flex-col">
          {[
            {
              track: "Weddings & Events",
              title: "Your wedding weekend, entirely private.",
              cta: "Plan Your Event",
              href: "/weddings",
              image: WEDDING_2,
              accent: "oklch(0.70 0.060 50)",
            },
            {
              track: "Membership & Outdoors",
              title: "Hunt, fish, and belong.",
              cta: "Explore Membership",
              href: "/membership",
              image: AERIAL_RIVER,
              accent: "oklch(0.58 0.065 145)",
            },
          ].map((card) => (
            <div key={card.track} className="relative h-[60vw] min-h-[280px] overflow-hidden">
              <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <p className="eyebrow text-[oklch(0.94_0.008_78)/55] mb-2" style={{ fontSize: "10px" }}>{card.track}</p>
                <h3 className="font-serif text-white text-2xl leading-tight mb-4">{card.title}</h3>
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
      <section className="section bg-[oklch(0.115_0.007_64)]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Text */}
            <div>
              <div className="gold-rule" />
              <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-4">The Property</p>
              <h2
                className="font-serif text-[oklch(0.94_0.008_78)] mb-6 leading-tight"
                style={{ fontSize: "clamp(1.75rem,3.5vw,2.75rem)" }}
              >
                Five buildings.<br />One river.<br />Three hundred acres.
              </h2>
              <p className="text-[oklch(0.60_0.015_72)] font-sans text-base leading-relaxed mb-8">
                The Rivers Lodge &amp; Hunt Club is built around the natural drama of the Marais des Cygnes River valley. The Lodge sleeps up to 20. The Rivers Barn hosts up to 300 for events. The Clubhouse, Annex, and Riverhouse Suites complete a property that can accommodate an entire wedding party — or a private hunting party — without leaving the estate.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                {[
                  { label: "The Lodge", desc: "Main residence, up to 20 guests" },
                  { label: "Rivers Barn", desc: "Event venue, up to 300 guests" },
                  { label: "Clubhouse", desc: "Dining, bar & meeting space" },
                  { label: "Riverhouse Suites", desc: "Boutique suites by the water" },
                ].map((b) => (
                  <div key={b.label}>
                    <p className="text-[oklch(0.94_0.008_78)] font-sans text-sm font-medium mb-0.5">{b.label}</p>
                    <p className="text-[oklch(0.55_0.012_70)] font-sans text-xs leading-relaxed">{b.desc}</p>
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
                <img src={GROUNDS_2} alt="Rivers Barn interior" className="w-full h-full object-cover" />
              </div>
              <div className="aspect-square overflow-hidden">
                <img src={LODGE_EXT} alt="The Lodge exterior" className="w-full h-full object-cover" />
              </div>
              <div className="aspect-square overflow-hidden">
                <img src={INTERIOR_1} alt="Lodge living room" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 06. Testimonials ───────────────────────────────────────────── */}
      {testimonials && testimonials.length > 0 && (
        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="text-center mb-14">
              <div className="gold-rule mx-auto" />
              <p className="eyebrow text-[oklch(0.55_0.012_70)]">From Our Guests</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.slice(0, 3).map((t: any) => (
                <div key={t.id} className="bg-[oklch(0.115_0.007_64)] p-8 flex flex-col">
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="oklch(0.72 0.095 78)" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                  </div>
                  <blockquote className="font-serif italic text-[oklch(0.94_0.008_78)] text-lg leading-relaxed flex-1 mb-6">
                    "{t.quote}"
                  </blockquote>
                  <div>
                    <p className="text-[oklch(0.94_0.008_78)] font-sans text-sm font-medium">{t.author}</p>
                    {t.eventType && (
                      <p className="eyebrow text-[oklch(0.55_0.012_70)] mt-1" style={{ fontSize: "10px" }}>{t.eventType}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 07. Gallery Strip ──────────────────────────────────────────── */}
      <section ref={galleryRef} className="fade-up overflow-hidden bg-[oklch(0.115_0.007_64)] py-0">
        <div className="scroll-strip px-5 lg:px-10 py-8">
          {galleryImages.map((img, i) => (
            <div
              key={i}
              className="w-[280px] md:w-[340px] lg:w-[400px] aspect-[4/3] overflow-hidden shrink-0"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        <div className="text-center pb-10">
          <Link href="/gallery" className="link-arrow inline-flex">
            View Full Gallery
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>

      {/* ── 08. Dual CTA ───────────────────────────────────────────────── */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[oklch(0.22_0.008_64)]">
            {/* Weddings CTA */}
            <div className="bg-background p-10 lg:p-14 flex flex-col">
              <div className="h-px w-8 bg-[oklch(0.70_0.060_50)] mb-6" />
              <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-3">Weddings &amp; Events</p>
              <h3 className="font-serif text-[oklch(0.94_0.008_78)] text-3xl md:text-4xl leading-tight mb-5">
                Start planning your<br />wedding weekend.
              </h3>
              <p className="text-[oklch(0.60_0.015_72)] font-sans text-sm leading-relaxed mb-8 flex-1">
                Our team works with a limited number of couples each year to ensure every wedding receives the full attention it deserves.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/weddings" className="btn-outline" style={{ borderColor: "oklch(0.70 0.060 50)", color: "oklch(0.70 0.060 50)" }}>
                  Explore Weddings
                </Link>
                <Link href="/contact?type=wedding" className="btn-ghost">
                  Request a Tour
                </Link>
              </div>
            </div>

            {/* Membership CTA */}
            <div className="bg-[oklch(0.115_0.007_64)] p-10 lg:p-14 flex flex-col">
              <div className="h-px w-8 bg-[oklch(0.58_0.065_145)] mb-6" />
              <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-3">Membership &amp; Outdoors</p>
              <h3 className="font-serif text-[oklch(0.94_0.008_78)] text-3xl md:text-4xl leading-tight mb-5">
                Membership is<br />by invitation.
              </h3>
              <p className="text-[oklch(0.60_0.015_72)] font-sans text-sm leading-relaxed mb-8 flex-1">
                A limited number of memberships are available each season. If you're interested in joining, we'd like to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/membership" className="btn-outline" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
                  Learn About Membership
                </Link>
                <Link href="/membership#apply" className="btn-ghost">
                  Apply Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
