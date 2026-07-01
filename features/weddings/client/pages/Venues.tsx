import { Link } from "wouter";
import PublicLayout from "@features/public-pages/components/PublicLayout";
import { trpc } from '@shared/lib/trpc';
import SEOHead from "@shared/components/SEOHead";

function ImgPlaceholder({ label, aspect = "aspect-[16/9]" }: { label: string; aspect?: string }) {
  return (
    <div className={`relative ${aspect} overflow-hidden w-full bg-[#2B2823]`}>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/30 select-none pointer-events-none">
          {label}
        </span>
      </div>
    </div>
  );
}

const FALLBACK_VENUES = [
  {
    slug: "rivers-barn",
    name: "Rivers Barn",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: 256 },
    desc: "Designed by a prominent Kansas City architect, Rivers Barn is modern farmhouse — a blank slate that lets a bride and groom or corporate group give it whatever feel they desire. The barn features two large patios, two fireplaces, air-conditioning, an indoor/outdoor bar, and separate luxury bathrooms. The space accommodates up to 256 guests.",
    details: ["Up to 256 guests", "Two large patios", "Two fireplaces", "Air-conditioning", "Indoor/outdoor bar", "Separate luxury bathrooms"],
    supportingCount: 3,
  },
  {
    slug: "clubhouse",
    name: "Clubhouse",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: null },
    desc: "The Clubhouse is an additional space on the estate often used as a rehearsal dinner space, cocktail hour space, or intimate wedding ceremony location. Its warm, character-filled interior makes it the natural gathering point before and after the main event.",
    details: ["Rehearsal dinner space", "Cocktail hour space", "Intimate ceremony option", "Warm interior character", "Adjacent to Rivers Barn", "Full bar"],
    supportingCount: 1,
  },
  {
    slug: "river-lawn",
    name: "River Lawn",
    type: "Outdoor Ceremony",
    capacity: { ceremony: 200, reception: null },
    desc: "A level grass expanse overlooking the Marais des Cygnes. Ceremonies on River Lawn feel like they belong to the land itself — open sky, the river, and nothing competing with the moment. The native landscaping throughout the property footprint provides ample space for wedding party and guest photography.",
    details: ["Overlooks Marais des Cygnes", "Level grass expanse", "Native landscaping", "Outdoor ceremony setting", "Golden-hour photography", "Open-air and unobstructed"],
    supportingCount: 2,
  },
  {
    slug: "timber-edge",
    name: "Timber Edge",
    type: "Outdoor Ceremony",
    capacity: { ceremony: 120, reception: null },
    desc: "Where the open field meets the old-growth timber line along the river. Timber Edge offers a naturally framed ceremony space with dappled light and a sense of enclosure that no constructed venue can replicate. The raw materials of the land — mature trees, native grasses, and the river — do all the work.",
    details: ["Old-growth timber backdrop", "Natural framing", "Dappled light", "Intimate atmosphere", "Along the river", "Up to 120 ceremony guests"],
    supportingCount: 1,
  },
  {
    slug: "pavilion",
    name: "Pavilion",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: 200 },
    desc: "A covered outdoor structure on the north side of Rivers Barn, featuring a ceiling of string lighting perfect for an ancillary bar cart and dance floor under the stars. The Pavilion extends the event footprint of Rivers Barn and is ideal for cocktail receptions, outdoor dancing, and overflow entertaining.",
    details: ["String-light ceiling", "North side of Rivers Barn", "Dance floor under the stars", "Bar cart setup", "Cocktail reception space", "Up to 200 guests"],
    supportingCount: 1,
  },
];

type VenueProp = {
  slug: string;
  name: string;
  type: string;
  capacity: { ceremony: number | null; reception: number | null };
  desc: string;
  details: string[];
  supportingCount: number;
};

export default function Venues() {
  const { data: cmsSpaces } = trpc.cms.getEventSpaces.useQuery();

  const venues: VenueProp[] = (cmsSpaces && cmsSpaces.length > 0)
    ? cmsSpaces.map((space) => ({
        slug: space.slug,
        name: space.name,
        type: space.indoorOutdoor === "indoor" ? "Indoor" : space.indoorOutdoor === "outdoor" ? "Outdoor" : "Indoor / Outdoor",
        capacity: { ceremony: space.capacitySeated, reception: space.capacityReception },
        desc: space.longDescription ?? space.shortDescription ?? "",
        details: Array.isArray(space.features) ? (space.features as string[]) : [],
        supportingCount: 0,
      }))
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

            {/* Hero placeholder */}
            <div className="mb-3">
              <ImgPlaceholder label={`${venue.name} — Hero`} aspect="aspect-[16/9]" />
            </div>

            {/* Supporting placeholders */}
            {venue.supportingCount > 0 && (
              <div className={`grid gap-3 mb-10 ${
                venue.supportingCount === 1 ? "grid-cols-2" :
                venue.supportingCount === 2 ? "grid-cols-2" :
                "grid-cols-3"
              }`}>
                {Array.from({ length: venue.supportingCount }).map((_, j) => (
                  <ImgPlaceholder
                    key={j}
                    label={`${venue.name} — Detail ${j + 1}`}
                    aspect="aspect-[4/3]"
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
