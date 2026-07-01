import { Link } from "wouter";
import PublicLayout from "../../../_shared/components/PublicLayout";
import { trpc } from '@shared/lib/trpc';
import SEOHead from '@shared/components/SEOHead';

const FALLBACK_LODGING = [
  {
    slug: "the-lodge",
    name: "The Lodge",
    tagline: "The social center of the property.",
    sqft: "6,000 sq ft",
    bedrooms: 4,
    desc: "Our 6,000 square foot lodge has 4 bedrooms decorated by a prominent Kansas City designer and incorporates many aspects of history and outdoor pursuits from the area. The lodge has a full kitchen, large balcony, heated floors, heating/AC, and a large recreation room.",
    features: ["4 bedrooms", "6,000 sq ft", "Full kitchen", "Large balcony", "Heated floors", "Recreation room", "Kansas City designer interiors"],
  },
  {
    slug: "riverhouse-suites",
    name: "Riverhouse Suites",
    tagline: "Four private suites with luxury finishes.",
    sqft: null,
    bedrooms: 4,
    desc: "The Riverhouse Suites were completed in 2022 and designed with luxury in mind. Each room is uniquely decorated and all rooms have their own bathrooms and individual heating/AC units.",
    features: ["4 private suites", "Private bath per suite", "Individual heating/AC", "Uniquely decorated rooms", "Luxury finishes", "Completed 2022"],
  },
  {
    slug: "annex-bridal-suite",
    name: "The Annex & Bridal Suite",
    tagline: "Steps from the barn. Built for the bridal party.",
    sqft: null,
    bedrooms: 4,
    desc: "The Annex & Bridal Suite was completely remodeled in 2021. It has a modern farmhouse feel with a light and airy design. Just steps away from Rivers Barn, it is the perfect spot to spend the day getting ready for your big day. The Annex & Bridal Suite has 4 bedrooms and 3 bathrooms.",
    features: ["4 bedrooms", "3 bathrooms", "Steps from Rivers Barn", "Remodeled 2021", "Modern farmhouse feel", "Light and airy design"],
  },
  {
    slug: "ohana-house",
    name: "Ohana House",
    tagline: "On its own lake. A world apart.",
    sqft: null,
    bedrooms: 4,
    desc: "The Ohana House is located approximately 15 minutes from the main lodge. It has 4 bedrooms and bathrooms, a 20-acre lake, a gorgeous fire pit, and miles of nature trails. Enjoy fishing, canoeing, paddle boarding, hiking, or just laying on a hammock. The Ohana House can be rented as part of a corporate or wedding package, or is a perfect place for just a family getaway.",
    features: ["4 bedrooms & bathrooms", "20-acre private lake", "Gorgeous fire pit", "Miles of nature trails", "Fishing, canoeing, paddleboarding", "15 min from main lodge"],
  },
  {
    slug: "the-farmhouse",
    name: "The Farmhouse",
    tagline: "Classic Kansas character.",
    sqft: null,
    bedrooms: null,
    desc: "A classic Kansas farmhouse on the estate grounds. Comfortable, private, and full of character — ideal for overflow lodging, family groups, or guests who prefer a quieter corner of the property.",
    features: ["Private setting", "Classic farmhouse character", "Estate grounds", "Ideal for overflow", "Quiet and secluded", "Full amenities"],
  },
];

const FALLBACK_VENUES = [
  {
    slug: "rivers-barn",
    name: "Rivers Barn",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: 256 },
    desc: "Designed by a prominent Kansas City architect, Rivers Barn is modern farmhouse — a blank slate that lets a bride and groom or corporate group give it whatever feel they desire. The barn features two large patios, two fireplaces, air-conditioning, an indoor/outdoor bar, and separate luxury bathrooms. The space accommodates up to 256 guests.",
    details: ["Up to 256 guests", "Two large patios", "Two fireplaces", "Air-conditioning", "Indoor/outdoor bar", "Separate luxury bathrooms"],
  },
  {
    slug: "clubhouse",
    name: "Clubhouse",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: null },
    desc: "The Clubhouse is an additional space on the estate often used as a rehearsal dinner space, cocktail hour space, or intimate wedding ceremony location. Its warm, character-filled interior makes it the natural gathering point before and after the main event.",
    details: ["Rehearsal dinner space", "Cocktail hour space", "Intimate ceremony option", "Warm interior character", "Adjacent to Rivers Barn", "Full bar"],
  },
  {
    slug: "the-green-drake",
    name: "The Green Drake",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: null },
    desc: "Description coming soon.",
    details: [],
  },
];

type LodgingProp = {
  slug: string;
  name: string;
  tagline: string;
  sqft: string | null;
  bedrooms: number | null;
  maxGuests?: number | null;
  desc: string;
  features: string[];
};

type VenueProp = {
  slug: string;
  name: string;
  type: string;
  capacity: { ceremony: number | null; reception: number | null };
  desc: string;
  details: string[];
};

export default function Lodging() {
  const { data: cmsUnits } = trpc.cms.getLodgingUnits.useQuery();

  // Images always come from FALLBACK_LODGING so verified local paths are never
  // overridden by empty CMS fields. CMS text content is merged when slugs match.
  const lodgingProperties: LodgingProp[] = FALLBACK_LODGING.map((fb) => {
    const cms = cmsUnits?.find((u) => u.slug === fb.slug);
    if (!cms) return fb;
    return {
      ...fb,
      name: cms.name ?? fb.name,
      tagline: cms.shortDescription ?? fb.tagline,
      sqft: cms.squareFootage ? `${cms.squareFootage.toLocaleString()} sq ft` : fb.sqft,
      bedrooms: cms.bedrooms ?? fb.bedrooms,
      maxGuests: cms.maxGuests ?? undefined,
      desc: cms.longDescription ?? fb.desc,
      features: Array.isArray(cms.features) ? (cms.features as string[]) : fb.features,
    };
  });

  return (
    <PublicLayout>
      <SEOHead
        title="Lodging & Venues"
        description="Stay and gather at The Rivers Lodge — five lodging buildings and event spaces on a private Kansas estate. One hour from Kansas City."
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
            Five lodging buildings and three event spaces — all on a private Kansas estate one hour from Kansas City.
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
                Five buildings sleep your entire party on-site — from the 6,000 sq ft Lodge to the secluded Ohana House on its own private lake.
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
                Rivers Barn, the Clubhouse, and The Green Drake — distinct spaces for ceremonies, receptions, and private gatherings.
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
        {lodgingProperties.map((prop, i) => (
          <section
            key={prop.slug}
            id={prop.slug}
            className={`section ${i % 2 === 0 ? "bg-background" : "bg-[#363330]"}`}
          >
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10">

              {/* Hero placeholder with overlaid content */}
              <div className="relative w-full aspect-[16/9] overflow-hidden mb-10">
                <div className="absolute inset-0 bg-[#2B2823]" aria-hidden="true" />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)" }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                  <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-white/50 mb-3">{prop.tagline}</p>
                  <h2 className="font-serif text-4xl md:text-5xl text-white mb-3">{prop.name}</h2>
                  <div className="flex items-center gap-3 mb-5">
                    {prop.bedrooms && (
                      <span className="text-xs font-sans text-white/60">{prop.bedrooms} Bedrooms</span>
                    )}
                    {prop.sqft && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span className="text-xs font-sans text-white/60">{prop.sqft}</span>
                      </>
                    )}
                    {prop.maxGuests && !prop.sqft && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span className="text-xs font-sans text-white/60">Sleeps {prop.maxGuests}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm font-sans text-white/70 max-w-xl leading-relaxed mb-6">{prop.desc}</p>
                  <Link
                    href="/contact?type=lodging"
                    className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-white border-b border-white/30 pb-0.5 hover:border-white transition-colors"
                  >
                    Inquire About Lodging
                  </Link>
                </div>
              </div>

              {/* Features grid */}
              {prop.features.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-3xl">
                  {prop.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                      {f}
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

        {FALLBACK_VENUES.map((venue, i) => (
          <section
            key={venue.slug}
            id={venue.slug}
            className={`section ${i % 2 === 0 ? "bg-[#2B2823]" : "bg-[#363330]"}`}
          >
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10">

              {/* Hero placeholder with overlaid content */}
              <div className="relative w-full aspect-[16/9] overflow-hidden mb-10">
                <div className="absolute inset-0 bg-[#1E1C19]" aria-hidden="true" />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)" }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[9px] tracking-[0.20em] uppercase font-sans text-white/50">{venue.type}</span>
                    {venue.capacity.ceremony && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span className="text-[9px] tracking-[0.20em] uppercase font-sans text-white/50">Ceremony: {venue.capacity.ceremony}</span>
                      </>
                    )}
                    {venue.capacity.reception && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span className="text-[9px] tracking-[0.20em] uppercase font-sans text-white/50">Reception: {venue.capacity.reception}</span>
                      </>
                    )}
                  </div>
                  <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">{venue.name}</h2>
                  <p className="text-sm font-sans text-white/70 max-w-xl leading-relaxed mb-6">{venue.desc}</p>
                  <Link
                    href="/contact?type=wedding"
                    className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-white border-b border-white/30 pb-0.5 hover:border-white transition-colors"
                  >
                    Inquire About This Space
                  </Link>
                </div>
              </div>

              {/* Details grid */}
              {venue.details.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-3xl">
                  {venue.details.map((d) => (
                    <div key={d} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                      {d}
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
