import { Link } from "wouter";
import PublicLayout from "@features/public-pages/components/PublicLayout";
import { trpc } from '@shared/lib/trpc';
import Picture from "@shared/components/Picture";
import SEOHead from "@shared/components/SEOHead";

const FALLBACK_VENUES = [
  {
    slug: "rivers-barn",
    name: "Rivers Barn",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: 256 },
    desc: "Designed by a prominent Kansas City architect, Rivers Barn is modern farmhouse — a blank slate that lets a bride and groom or corporate group give it whatever feel they desire. The barn features two large patios, two fireplaces, air-conditioning, an indoor/outdoor bar, and separate luxury bathrooms. The space accommodates up to 256 guests.",
    details: ["Up to 256 guests", "Two large patios", "Two fireplaces", "Air-conditioning", "Indoor/outdoor bar", "Separate luxury bathrooms"],
    hero: "/img/barn%20shot.jpg",
    supporting: ["/img/wedding%20hero.JPG", "/img/wedding%204.jpg", "/img/wedding%20photo%201.jpg"],
  },
  {
    slug: "clubhouse",
    name: "Clubhouse",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: null },
    desc: "The Clubhouse is an additional space on the estate often used as a rehearsal dinner space, cocktail hour space, or intimate wedding ceremony location. Its warm, character-filled interior makes it the natural gathering point before and after the main event.",
    details: ["Rehearsal dinner space", "Cocktail hour space", "Intimate ceremony option", "Warm interior character", "Adjacent to Rivers Barn", "Full bar"],
    hero: "/img/Clubhouse%20Hero.jpg",
    supporting: ["/img/Clubhouse%20Home.jpg"],
  },
  {
    slug: "river-lawn",
    name: "River Lawn",
    type: "Outdoor Ceremony",
    capacity: { ceremony: 200, reception: null },
    desc: "A level grass expanse overlooking the Marais des Cygnes. Ceremonies on River Lawn feel like they belong to the land itself — open sky, the river, and nothing competing with the moment. The native landscaping throughout the property footprint provides ample space for wedding party and guest photography.",
    details: ["Overlooks Marais des Cygnes", "Level grass expanse", "Native landscaping", "Outdoor ceremony setting", "Golden-hour photography", "Open-air and unobstructed"],
    hero: "/img/wedding%20photo%201.jpg",
    supporting: ["/img/wedding%204.jpg", "/img/Wedding%205.jpg"],
  },
  {
    slug: "timber-edge",
    name: "Timber Edge",
    type: "Outdoor Ceremony",
    capacity: { ceremony: 120, reception: null },
    desc: "Where the open field meets the old-growth timber line along the river. Timber Edge offers a naturally framed ceremony space with dappled light and a sense of enclosure that no constructed venue can replicate. The raw materials of the land — mature trees, native grasses, and the river — do all the work.",
    details: ["Old-growth timber backdrop", "Natural framing", "Dappled light", "Intimate atmosphere", "Along the river", "Up to 120 ceremony guests"],
    hero: "/img/wedding%20hero.JPG",
    supporting: ["/img/wedding%204.jpg"],
  },
  {
    slug: "pavilion",
    name: "Pavilion",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: 200 },
    desc: "A covered outdoor structure on the north side of Rivers Barn, featuring a ceiling of string lighting perfect for an ancillary bar cart and dance floor under the stars. The Pavilion extends the event footprint of Rivers Barn and is ideal for cocktail receptions, outdoor dancing, and overflow entertaining.",
    details: ["String-light ceiling", "North side of Rivers Barn", "Dance floor under the stars", "Bar cart setup", "Cocktail reception space", "Up to 200 guests"],
    hero: "/img/Wedding%205.jpg",
    supporting: ["/img/wedding%20photo%201.jpg"],
  },
];

type VenueProp = {
  slug: string;
  name: string;
  type: string;
  capacity: { ceremony: number | null; reception: number | null };
  desc: string;
  details: string[];
  hero: string;
  supporting: string[];
};

const fallbackBySlug = Object.fromEntries(FALLBACK_VENUES.map(v => [v.slug, v]));

export default function Venues() {
  const { data: cmsSpaces } = trpc.cms.getEventSpaces.useQuery();

  const venues: VenueProp[] = (cmsSpaces && cmsSpaces.length > 0)
    ? cmsSpaces.map((space) => {
        const fb = fallbackBySlug[space.slug];
        const cmsHero = space.heroImage ?? (Array.isArray(space.galleryImages) ? (space.galleryImages as string[])[0] : "") ?? "";
        const cmsGallery: string[] = Array.isArray(space.galleryImages) ? (space.galleryImages as string[]) : [];
        const hero = cmsHero || fb?.hero || "";
        const supporting = cmsGallery.length > 1 ? cmsGallery.slice(1) : fb?.supporting ?? [];
        return {
          slug: space.slug,
          name: space.name,
          type: space.indoorOutdoor === "indoor" ? "Indoor" : space.indoorOutdoor === "outdoor" ? "Outdoor" : "Indoor / Outdoor",
          capacity: { ceremony: space.capacitySeated, reception: space.capacityReception },
          desc: space.longDescription ?? space.shortDescription ?? "",
          details: Array.isArray(space.features) ? (space.features as string[]) : [],
          hero,
          supporting,
        };
      })
    : FALLBACK_VENUES;

  return (
    <PublicLayout>
      <SEOHead
        title="Venue Spaces"
        description="Rivers Barn, River Lawn, Timber Edge, the Clubhouse, and the Pavilion — five distinct event spaces on the Rivers Lodge estate in La Cygne, Kansas."
        url="/venues"
      />

      {/* Header */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20 bg-background">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="gold-rule" />
          <p className="eyebrow text-[#908B82] mb-4">Event Spaces</p>
          <h1 className="font-serif text-5xl md:text-6xl text-foreground leading-tight mb-6">
            Spaces that shape<br /><span className="italic font-light">the day.</span>
          </h1>
          <p className="text-base font-sans text-muted-foreground max-w-xl leading-relaxed">
            Five distinct spaces across the estate — each with its own character, each suited to a different moment in your weekend.
          </p>
        </div>
      </section>

      {/* Venue List */}
      {venues.map((venue, i) => (
        <section
          key={venue.slug}
          id={venue.slug}
          className={`section ${i % 2 === 0 ? "bg-background" : "bg-[#363330]"}`}
        >
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">

            {/* Hero image */}
            <Picture
              src={venue.hero}
              alt={venue.name}
              label={venue.name}
              className="w-full overflow-hidden aspect-[16/9] mb-3"
              imgClassName="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              sizes="(max-width: 1440px) 100vw, 1440px"
              width={1440}
              height={810}
            />

            {/* Supporting images row */}
            {venue.supporting.length > 0 && (
              <div className={`grid gap-3 mb-10 ${
                venue.supporting.length === 1 ? "grid-cols-2" :
                venue.supporting.length === 2 ? "grid-cols-2" :
                "grid-cols-3"
              }`}>
                {venue.supporting.map((src, j) => (
                  <Picture
                    key={j}
                    src={src}
                    alt={`${venue.name} detail`}
                    label={`${venue.name} detail`}
                    className="overflow-hidden aspect-[4/3]"
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
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[9px] tracking-[0.20em] uppercase font-sans text-muted-foreground">{venue.type}</span>
                {venue.capacity.ceremony && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-[9px] tracking-[0.20em] uppercase font-sans text-muted-foreground">Ceremony: {venue.capacity.ceremony}</span>
                  </>
                )}
                {venue.capacity.reception && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-[9px] tracking-[0.20em] uppercase font-sans text-muted-foreground">Reception: {venue.capacity.reception}</span>
                  </>
                )}
              </div>
              <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-5">{venue.name}</h2>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-6">{venue.desc}</p>
              <div className="grid grid-cols-2 gap-2 mb-8">
                {venue.details.map((d) => (
                  <div key={d} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                    {d}
                  </div>
                ))}
              </div>
              <Link
                href="/contact?type=wedding"
                className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-foreground border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors"
              >
                Inquire About This Space
              </Link>
            </div>

          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-20 bg-[#2B2823] text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-5 italic font-light">Ready to see the spaces?</h2>
          <p className="text-sm font-sans text-white/60 mb-8 leading-relaxed">
            The best way to understand Rivers Lodge is to walk it. Book a private tour — no pressure, no presentation.
          </p>
          <Link href="/contact" className="inline-flex items-center justify-center px-10 py-4 bg-white text-[#2B2823] text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/90 transition-colors">
            Book a Private Tour
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
