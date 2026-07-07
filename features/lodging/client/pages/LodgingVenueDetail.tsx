import { Link } from "wouter";
import { useRef, useEffect } from "react";
import PublicLayout from "@shared/components/PublicLayout";
import SEOHead from "@shared/components/SEOHead";
import Picture from "@shared/components/Picture";
import { getVenue } from "./lodgingData";
import NotFound from "@shared/pages/NotFound";

const ACCENT = "#9B4D19";

function useFadeUp(t = 0.12) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { el.classList.add("visible"); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: t }
    );
    obs.observe(el); return () => obs.disconnect();
  }, [t]);
  return ref;
}

export default function LodgingVenueDetail({ slug }: { slug: string }) {
  const venue = getVenue(slug);
  const contentRef = useFadeUp();

  if (!venue) return <NotFound />;

  const groupLabel = venue.group === "stay" ? "Lodging" : "Venues";

  return (
    <PublicLayout>
      <SEOHead
        title={`${venue.title} — Lodging & Venues`}
        description={venue.teaser}
        url={`/lodging/${venue.slug}`}
      />

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <Picture
            src={venue.heroImg}
            alt={venue.heroAlt}
            label={venue.title}
            className="absolute inset-0 w-full h-full"
            imgClassName="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            width={1920}
            height={1080}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.82) 100%)" }}
          />
        </div>
{!venue.heroImg && (
<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
<span className="text-white/80 text-[15px] tracking-[0.18em] uppercase font-sans">{venue.heroAlt}</span>
</div>
)}
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">{groupLabel}</p>
          <h1
            className="font-serif font-light text-white leading-[0.92] mb-6"
            style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}
          >
            {venue.title}
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            {venue.teaser}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/contact?type=lodging" className="btn-outline" style={{ borderColor: ACCENT, color: ACCENT }}>
              Inquire About {venue.group === "stay" ? "Lodging" : "This Venue"}
            </Link>
            <Link href="/lodging" className="btn-ghost">Back to All Lodging</Link>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-10">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand">Gallery</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {venue.galleryImgs.map((img, i) => (
              <div key={i} className="aspect-[4/3] overflow-hidden bg-[#2B2823] relative flex items-center justify-center">
                {img.src ? (
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                    <span className="text-[13px] tracking-[0.18em] uppercase font-sans text-white/70 select-none pointer-events-none">
                                          {img.alt}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Details */}
      <section
        ref={contentRef as React.RefObject<HTMLDivElement>}
        className="fade-up section bg-background"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-20">

            {/* Description */}
            <div className="lg:col-span-2">
              <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">{venue.title}</p>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                {venue.description.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <div className="mt-10">
                <Link
                  href="/contact?type=lodging"
                  className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium border-b pb-0.5 transition-colors"
                  style={{ color: ACCENT, borderColor: ACCENT + "60" }}
                >
                  Inquire About Availability →
                </Link>
              </div>
            </div>

            {/* Sidebar */}
            <aside>
              {/* Stats */}
              {(venue.bedrooms || venue.sqft || venue.capacity) && (
                <div className="mb-8">
                  <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
                  <p className="eyebrow text-muted-brand mb-4">Details</p>
                  <dl className="space-y-3">
                    {venue.bedrooms && (
                      <div>
                        <dt className="text-[10px] tracking-[0.14em] uppercase font-sans text-muted-brand/60">Bedrooms</dt>
                        <dd className="font-serif text-warm text-lg">{venue.bedrooms}</dd>
                      </div>
                    )}
                    {venue.sqft && (
                      <div>
                        <dt className="text-[10px] tracking-[0.14em] uppercase font-sans text-muted-brand/60">Square Footage</dt>
                        <dd className="font-serif text-warm text-lg">{venue.sqft}</dd>
                      </div>
                    )}
                    {venue.capacity && (
                      <div>
                        <dt className="text-[10px] tracking-[0.14em] uppercase font-sans text-muted-brand/60">Capacity</dt>
                        <dd className="font-serif text-warm text-lg">{venue.capacity}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Features */}
              {venue.features.length > 0 && (
                <div>
                  <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
                  <p className="eyebrow text-muted-brand mb-4">Amenities</p>
                  <ul className="space-y-2">
                    {venue.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 font-sans text-muted-brand text-sm">
                        <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ACCENT }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* Back nav */}
      <section className="section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
          <p className="eyebrow text-muted-brand mb-4">Lodging & Venues</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/lodging" className="btn-outline" style={{ borderColor: ACCENT, color: ACCENT }}>
              View All Lodging
            </Link>
            <Link href="/contact?type=lodging" className="btn-ghost">
              Inquire About a Stay
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
