import { Link } from "wouter";
import PublicLayout from "../../../_shared/components/PublicLayout";
import { trpc } from '@shared/lib/trpc';
import SEOHead from '@shared/components/SEOHead';
import Picture from "@shared/components/Picture";

const FALLBACK_LODGING = [
  {
    slug: "the-lodge",
    name: "The Lodge",
    tagline: "The social center of the property.",
    sqft: "6,000 sq ft",
    bedrooms: 4,
    desc: "Our 6,000 square foot lodge has 4 bedrooms decorated by a prominent Kansas City designer and incorporates many aspects of history and outdoor pursuits from the area. The lodge has a full kitchen, large balcony, heated floors, heating/AC, and a large recreation room.",
    features: ["4 bedrooms", "6,000 sq ft", "Full kitchen", "Large balcony", "Heated floors", "Recreation room", "Kansas City designer interiors"],
    hero: "/img/Main%20Lodge.jpg",
    supporting: ["/img/main%20lodge%20inside.jpg", "/img/lodge-1-gallery.jpg", "/img/lodge-2-gallery.jpg"],
  },
  {
    slug: "riverhouse-suites",
    name: "Riverhouse Suites",
    tagline: "Four private suites with luxury finishes.",
    sqft: null,
    bedrooms: 4,
    desc: "The Riverhouse Suites were completed in 2022 and designed with luxury in mind. Each room is uniquely decorated and all rooms have their own bathrooms and individual heating/AC units.",
    features: ["4 private suites", "Private bath per suite", "Individual heating/AC", "Uniquely decorated rooms", "Luxury finishes", "Completed 2022"],
    hero: "/img/Riverhouse%20Suite.jpg",
    supporting: ["/img/Riverhouse%20Suite%201.jpg"],
  },
  {
    slug: "annex-bridal-suite",
    name: "The Annex & Bridal Suite",
    tagline: "Steps from the barn. Built for the bridal party.",
    sqft: null,
    bedrooms: 4,
    desc: "The Annex & Bridal Suite was completely remodeled in 2021. It has a modern farmhouse feel with a light and airy design. Just steps away from Rivers Barn, it is the perfect spot to spend the day getting ready for your big day. The Annex & Bridal Suite has 4 bedrooms and 3 bathrooms.",
    features: ["4 bedrooms", "3 bathrooms", "Steps from Rivers Barn", "Remodeled 2021", "Modern farmhouse feel", "Light and airy design"],
    // Stand-in: lodge-1-hero.jpg (exterior/building shot, closest available match)
    // TODO: replace with annex-hero.jpg once uploaded to client/public/img/
    hero: "/img/lodge-1-hero.jpg",
    supporting: [],
  },
  {
    slug: "ohana-house",
    name: "Ohana House",
    tagline: "On its own lake. A world apart.",
    sqft: null,
    bedrooms: 4,
    desc: "The Ohana House is located approximately 15 minutes from the main lodge. It has 4 bedrooms and bathrooms, a 20-acre lake, a gorgeous fire pit, and miles of nature trails. Enjoy fishing, canoeing, paddle boarding, hiking, or just laying on a hammock. The Ohana House can be rented as part of a corporate or wedding package, or is a perfect place for just a family getaway.",
    features: ["4 bedrooms & bathrooms", "20-acre private lake", "Gorgeous fire pit", "Miles of nature trails", "Fishing, canoeing, paddleboarding", "15 min from main lodge"],
    hero: "/img/Ohana%20Aerial.jpg",
    supporting: ["/img/Ohana%20Firepit.jpg", "/img/Ohana%20House%20Dining.jpg", "/img/Ohana%20Kitchen.jpg"],
  },
  {
    slug: "the-farmhouse",
    name: "The Farmhouse",
    tagline: "Classic Kansas character.",
    sqft: null,
    bedrooms: null,
    desc: "A classic Kansas farmhouse on the estate grounds. Comfortable, private, and full of character — ideal for overflow lodging, family groups, or guests who prefer a quieter corner of the property.",
    features: ["Private setting", "Classic farmhouse character", "Estate grounds", "Ideal for overflow", "Quiet and secluded", "Full amenities"],
    // Stand-in: MHR53675.jpg (estate landscape, evokes Kansas countryside character)
    // TODO: replace with farmhouse-hero.jpg once uploaded to client/public/img/
    hero: "/img/MHR53675.jpg",
    supporting: [],
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
  hero: string;
  supporting: string[];
};

const fallbackBySlug = Object.fromEntries(FALLBACK_LODGING.map(u => [u.slug, u]));

export default function Lodging() {
  const { data: cmsUnits } = trpc.cms.getLodgingUnits.useQuery();

  const lodgingProperties: LodgingProp[] = (cmsUnits && cmsUnits.length > 0)
    ? cmsUnits.map((unit) => {
        const fb = fallbackBySlug[unit.slug];
        const cmsHero: string = (unit as { heroImage?: string | null }).heroImage || "";
        const cmsGallery: string[] = Array.isArray((unit as { galleryImages?: unknown }).galleryImages)
          ? ((unit as { galleryImages: string[] }).galleryImages)
          : [];
        const hero = cmsHero || (cmsGallery.length > 0 ? cmsGallery[0] : "") || fb?.hero || "";
        const supporting = cmsGallery.length > 1
          ? cmsGallery.slice(1)
          : fb?.supporting ?? [];
        return {
          slug: unit.slug,
          name: unit.name,
          tagline: unit.shortDescription ?? "",
          sqft: unit.squareFootage ? `${unit.squareFootage.toLocaleString()} sq ft` : null,
          bedrooms: unit.bedrooms,
          maxGuests: unit.maxGuests,
          desc: unit.longDescription ?? "",
          features: Array.isArray(unit.features) ? (unit.features as string[]) : [],
          hero,
          supporting,
        };
      })
    : FALLBACK_LODGING;

  return (
    <PublicLayout>
      <SEOHead
        title="Lodging & Venues"
        description="Stay and gather at The Rivers Lodge — five lodging buildings and four event spaces on a private Kansas estate. One hour from Kansas City."
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
            Five lodging buildings and four event spaces — all on a private Kansas estate one hour from Kansas City.
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
            <Link
              href="/venues"
              className="group bg-[#363330] p-10 lg:p-14 hover:bg-[#2B2823] transition-colors block"
            >
              <div className="gold-rule mb-6" />
              <p className="eyebrow text-[#908B82] mb-3">Event Spaces</p>
              <h2 className="font-serif font-light text-[#E0D3BD] text-3xl mb-4">Gather</h2>
              <p className="font-sans text-[#BABAAE] text-sm leading-relaxed mb-6">
                Rivers Barn, the River Lawn, Timber Edge, and the Clubhouse — ceremony and reception spaces for up to 300 guests.
              </p>
              <span className="text-[11px] tracking-[0.12em] uppercase font-sans font-medium text-[#9B4D19] group-hover:opacity-80 transition-opacity">
                Browse Venues →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Properties */}
      <div id="lodging">
        {lodgingProperties.map((prop, i) => (
          <section
            key={prop.slug}
            id={prop.slug}
            className={`section ${i % 2 === 0 ? "bg-background" : "bg-[#363330]"}`}
          >
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10">

              {/* Hero image */}
              <Picture
                src={prop.hero}
                alt={prop.name}
                label={prop.name}
                className="w-full overflow-hidden aspect-[16/9] mb-3"
                imgClassName="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                sizes="(max-width: 1440px) 100vw, 1440px"
                width={1440}
                height={810}
              />

              {/* Supporting images row */}
              {prop.supporting.length > 0 && (
                <div className={`grid gap-3 mb-10 ${
                  prop.supporting.length === 1 ? "grid-cols-2" :
                  prop.supporting.length === 2 ? "grid-cols-2" :
                  "grid-cols-3"
                }`}>
                  {prop.supporting.map((src, j) => (
                    <Picture
                      key={j}
                      src={src}
                      alt={`${prop.name} detail`}
                      label={`${prop.name} detail`}
                      className={`overflow-hidden aspect-[4/3] ${prop.supporting.length === 1 ? "col-span-1" : ""}`}
                      imgClassName="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 768px) 50vw, 33vw"
                      width={600}
                      height={450}
                    />
                  ))}
                </div>
              )}

              {/* Text content */}
              <div className="max-w-3xl mt-8">
                <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-muted-foreground mb-2">{prop.tagline}</p>
                <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-2">{prop.name}</h2>
                <div className="flex items-center gap-3 mb-5">
                  {prop.bedrooms && (
                    <span className="text-xs font-sans text-muted-foreground">{prop.bedrooms} Bedrooms</span>
                  )}
                  {prop.sqft && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-xs font-sans text-muted-foreground">{prop.sqft}</span>
                    </>
                  )}
                  {prop.maxGuests && !prop.sqft && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-xs font-sans text-muted-foreground">Sleeps {prop.maxGuests}</span>
                    </>
                  )}
                </div>
                <p className="text-base font-sans text-muted-foreground leading-relaxed mb-6">{prop.desc}</p>
                <div className="grid grid-cols-2 gap-2 mb-8">
                  {prop.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/contact?type=lodging"
                  className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-foreground border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors"
                >
                  Inquire About Lodging
                </Link>
              </div>

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
