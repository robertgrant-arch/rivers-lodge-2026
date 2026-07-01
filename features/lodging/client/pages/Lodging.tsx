import { Link } from "wouter";
import PublicLayout from "../../../_shared/components/PublicLayout";
import { trpc } from '@shared/lib/trpc';
import SEOHead from '@shared/components/SEOHead';
import { STAY_VENUES, GATHER_VENUES, type LodgingVenue } from './lodgingData';

export default function Lodging() {
  const { data: cmsUnits } = trpc.cms.getLodgingUnits.useQuery();

  // CMS text merges by slug; images and gallery always from static lodgingData.
  const stayProperties: LodgingVenue[] = STAY_VENUES.map((fb) => {
    const cms = cmsUnits?.find((u) => u.slug === fb.slug);
    if (!cms) return fb;
    return {
      ...fb,
      title: cms.name ?? fb.title,
      teaser: cms.shortDescription ?? fb.teaser,
      sqft: cms.squareFootage ? `${cms.squareFootage.toLocaleString()} sq ft` : fb.sqft,
      bedrooms: cms.bedrooms ?? fb.bedrooms,
      capacity: cms.maxGuests ? `${cms.maxGuests} guests` : fb.capacity,
      description: cms.longDescription ? [cms.longDescription] : fb.description,
      features: Array.isArray(cms.features) ? (cms.features as string[]) : fb.features,
    };
  });

  return (
    <PublicLayout>
      <SEOHead
        title="Lodging & Venues"
        description="Stay and gather at The Rivers Lodge — lodging buildings and event spaces on a private Kansas estate. One hour from Kansas City."
        url="/lodging"
      />

      {/* Header */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20 bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="gold-rule" />
          <p className="eyebrow text-[#908B82] mb-4">The Estate</p>
          <h1
            className="font-serif font-light italic text-[#E0D3BD] leading-tight mb-6"
            style={{ fontSize: "clamp(2.5rem,5vw,4.5rem)" }}
          >
            Lodging &amp; Venues.
          </h1>
          <p className="text-[#BABAAE] font-sans text-base max-w-xl leading-relaxed">
            Lodging buildings and event spaces — all on a private Kansas estate one hour from Kansas City.
          </p>
        </div>
      </section>

      {/* ── Browse Paths ─────────────────────────────────────────────── */}
      <section className="bg-[#363330]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#57544E]">
            <a
              href="#lodging"
              className="group bg-[#363330] p-10 lg:p-14 hover:bg-[#2B2823] transition-colors block"
            >
              <div className="gold-rule mb-6" />
              <p className="eyebrow text-[#908B82] mb-3">Accommodation</p>
              <h2 className="font-serif font-light text-[#E0D3BD] text-3xl mb-4">Stay</h2>
              <p className="font-sans text-[#BABAAE] text-sm leading-relaxed mb-6">
                Multiple buildings sleep your entire party on-site — from the 6,000 sq ft Lodge to the secluded Ohana on its own private lake.
              </p>
              <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#9B4D19] group-hover:opacity-80 transition-opacity">
                Browse Lodging →
              </span>
            </a>
            <a
              href="#venues"
              className="group bg-[#363330] p-10 lg:p-14 hover:bg-[#2B2823] transition-colors block"
            >
              <div className="gold-rule mb-6" />
              <p className="eyebrow text-[#908B82] mb-3">Event Spaces</p>
              <h2 className="font-serif font-light text-[#E0D3BD] text-3xl mb-4">Gather</h2>
              <p className="font-sans text-[#BABAAE] text-sm leading-relaxed mb-6">
                The Barn, The Green Drake, and The Clubhouse — distinct spaces for ceremonies, receptions, and private gatherings.
              </p>
              <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#9B4D19] group-hover:opacity-80 transition-opacity">
                Browse Venues →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Lodging Properties ───────────────────────────────────────── */}
      <div id="lodging">
        {stayProperties.map((prop, i) => (
          <section
            key={prop.slug}
            id={prop.slug}
            className={i % 2 === 0 ? "bg-background" : "bg-[#363330]"}
          >
            {/* Full-bleed full-height hero */}
            <div className="relative min-h-screen flex items-end overflow-hidden">
              <div className="absolute inset-0 bg-[#2B2823]" aria-hidden="true" />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.25) 50%, transparent 100%)" }}
              />
              <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-10 w-full pb-16 md:pb-24">
                <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-white/50 mb-3">{prop.teaser}</p>
                <h2
                  className="font-serif font-light text-white leading-tight mb-4"
                  style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}
                >
                  {prop.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-8">
                  {prop.bedrooms && (
                    <span className="text-xs font-sans text-white/60">{prop.bedrooms} Bedrooms</span>
                  )}
                  {prop.sqft && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="text-xs font-sans text-white/60">{prop.sqft}</span>
                    </>
                  )}
                  {prop.capacity && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="text-xs font-sans text-white/60">{prop.capacity}</span>
                    </>
                  )}
                </div>
                <Link
                  href="/contact?type=lodging"
                  className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-white border-b border-white/30 pb-0.5 hover:border-white transition-colors"
                >
                  Inquire About Lodging
                </Link>
              </div>
            </div>

            {/* Description + Features + Gallery */}
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-16">

              {/* Description */}
              <div className="max-w-2xl mb-10">
                {prop.description.map((para, j) => (
                  <p key={j} className="text-base font-sans text-muted-foreground leading-relaxed mb-4">{para}</p>
                ))}
              </div>

              {/* Features */}
              {prop.features.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-12">
                  {prop.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {/* Gallery — 6 cards, placeholder for missing images */}
              {prop.galleryImgs.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {prop.galleryImgs.map((img, j) => (
                    <div key={j} className="relative aspect-[4/3] overflow-hidden bg-[#2B2823]">
                      {img.src ? (
                        <img
                          src={img.src}
                          alt={img.alt}
                          className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center px-4">
                          <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/25 select-none text-center">
                            {img.alt}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </section>
        ))}
      </div>

      {/* ── Event Spaces (Gather) ────────────────────────────────────── */}
      <div id="venues">
        <section className="pt-16 pb-8 bg-[#2B2823]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="gold-rule" />
            <p className="eyebrow text-[#908B82] mb-4">Event Spaces</p>
            <h2
              className="font-serif font-light italic text-[#E0D3BD] leading-tight mb-4"
              style={{ fontSize: "clamp(2rem,4vw,3.5rem)" }}
            >
              Gather.
            </h2>
            <p className="text-[#BABAAE] font-sans text-base max-w-xl leading-relaxed">
              Three distinct spaces for ceremonies, receptions, and private gatherings — all on the estate grounds.
            </p>
          </div>
        </section>

        {GATHER_VENUES.map((venue, i) => (
          <section
            key={venue.slug}
            id={venue.slug}
            className={i % 2 === 0 ? "bg-[#2B2823]" : "bg-[#363330]"}
          >
            {/* Full-bleed full-height hero */}
            <div className="relative min-h-screen flex items-end overflow-hidden">
              <div className="absolute inset-0 bg-[#1E1C19]" aria-hidden="true" />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.25) 50%, transparent 100%)" }}
              />
              <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-10 w-full pb-16 md:pb-24">
                <p className="text-[9px] tracking-[0.20em] uppercase font-sans text-white/50 mb-3">{venue.teaser}</p>
                <h2
                  className="font-serif font-light text-white leading-tight mb-4"
                  style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}
                >
                  {venue.title}
                </h2>
                {venue.capacity && (
                  <p className="text-xs font-sans text-white/60 mb-8">{venue.capacity}</p>
                )}
                <Link
                  href="/contact?type=wedding"
                  className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-white border-b border-white/30 pb-0.5 hover:border-white transition-colors"
                >
                  Inquire About This Space
                </Link>
              </div>
            </div>

            {/* Description + Features + Gallery */}
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-16">

              {/* Description */}
              <div className="max-w-2xl mb-10">
                {venue.description.map((para, j) => (
                  <p key={j} className="text-base font-sans text-muted-foreground leading-relaxed mb-4">{para}</p>
                ))}
              </div>

              {/* Features */}
              {venue.features.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-12">
                  {venue.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {/* Gallery — 6 cards, placeholder for missing images */}
              {venue.galleryImgs.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {venue.galleryImgs.map((img, j) => (
                    <div key={j} className="relative aspect-[4/3] overflow-hidden bg-[#2B2823]">
                      {img.src ? (
                        <img
                          src={img.src}
                          alt={img.alt}
                          className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center px-4">
                          <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/25 select-none text-center">
                            {img.alt}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section className="py-20 bg-[#2B2823] text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-5 italic font-light">
            Come and stay awhile.
          </h2>
          <p className="text-sm font-sans text-white/60 mb-8 leading-relaxed">
            Like the whole weekend.
          </p>
          <Link href="/contact" className="inline-flex items-center justify-center px-10 py-4 bg-white text-[#2B2823] text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/90 transition-colors">
            Book a Tour
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
