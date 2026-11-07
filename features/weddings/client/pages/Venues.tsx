import { Link } from "wouter";
import PublicLayout from "@shared/components/PublicLayout";
import { trpc } from '@shared/lib/trpc';
import SEOHead from "@shared/components/SEOHead";
import { useHashScroll } from "@shared/hooks/useHashScroll";

type SpaceUse = "ceremony" | "reception";

// `uses` drives the Ceremony Spaces / Reception Spaces sections (linked from the
// /weddings cards as /venues#ceremony and /venues#reception). A space can be in both.
const FALLBACK_VENUES: VenueProp[] = [
  {
    slug: "rivers-barn",
    name: "Rivers Barn",
    type: "Indoor / Outdoor",
    uses: ["ceremony", "reception"],
    capacity: { ceremony: null, reception: 256 },
    desc: "Designed by a prominent Kansas City architect, Rivers Barn is modern farmhouse — a blank slate that lets a bride and groom or corporate group give it whatever feel they desire. The barn features two large patios, two fireplaces, air-conditioning, an indoor/outdoor bar, and separate luxury bathrooms. The space accommodates up to 256 guests.",
    details: ["Up to 256 guests", "Two large patios", "Two fireplaces", "Air-conditioning", "Indoor/outdoor bar", "Separate luxury bathrooms"],
  },
  {
    slug: "clubhouse",
    name: "Clubhouse",
    type: "Indoor / Outdoor",
    uses: ["ceremony", "reception"],
    capacity: { ceremony: null, reception: null },
    desc: "The Clubhouse is an additional space on the Lodge often used as a rehearsal dinner space, cocktail hour space, or intimate wedding ceremony location. Its warm, character-filled interior makes it the natural gathering point before and after the main event.",
    details: ["Rehearsal dinner space", "Cocktail hour space", "Intimate ceremony option", "Warm interior character", "Adjacent to Rivers Barn", "Full bar"],
  },
  {
    slug: "the-green-drake",
    name: "The Green Drake",
    type: "Indoor / Outdoor",
    uses: [],
    capacity: { ceremony: null, reception: null },
    desc: "Description coming soon.",
    details: [],
  },
];

type VenueProp = {
  slug: string;
  name: string;
  type: string;
  capacity: { ceremony: number | null; reception: number | null };
  desc: string;
  details: string[];
  uses: SpaceUse[];
};

const SPACE_GROUPS: { id: SpaceUse; label: string }[] = [
  { id: "ceremony", label: "Ceremony Spaces" },
  { id: "reception", label: "Reception Spaces" },
];

export default function Venues() {
  useHashScroll();
  const { data: cmsSpaces } = trpc.cms.getEventSpaces.useQuery();

  // CMS text content is merged when slugs match. Images are placeholder-only until
  // verified assets are uploaded.
  const venues: VenueProp[] = FALLBACK_VENUES.map((fb) => {
    const cms = cmsSpaces?.find((s) => s.slug === fb.slug);
    if (!cms) return fb;
    return {
      ...fb,
      type: cms.indoorOutdoor === "indoor" ? "Indoor" : cms.indoorOutdoor === "outdoor" ? "Outdoor" : "Indoor / Outdoor",
      capacity: { ceremony: cms.capacitySeated, reception: cms.capacityReception },
      desc: cms.longDescription ?? cms.shortDescription ?? fb.desc,
      details: Array.isArray(cms.features) ? (cms.features as string[]) : fb.details,
    };
  });

  return (
    <PublicLayout>
      <SEOHead
        title="Venue Spaces"
        description="Rivers Barn, the Clubhouse, and The Green Drake — three distinct event spaces on the Rivers Lodge in La Cygne, Kansas."
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
            Three distinct spaces across the Lodge — each with its own character, each suited to a different moment in your weekend.
          </p>
        </div>
      </section>

      {/* Ceremony Spaces / Reception Spaces (anchors for the /weddings cards) */}
      {SPACE_GROUPS.map((group, gi) => {
        const spaces = venues.filter((v) => v.uses.includes(group.id));
        if (spaces.length === 0) return null;
        return (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-heading`}
            className={`py-14 md:py-16 scroll-mt-24 border-t border-white/10 ${gi % 2 === 0 ? "bg-[#363330]" : "bg-background"}`}
          >
            <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
              <div className="gold-rule" />
              <h2 id={`${group.id}-heading`} className="font-serif text-3xl md:text-4xl text-foreground leading-tight mb-8">
                {group.label}
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                {spaces.map((v) => {
                  const cap = group.id === "ceremony" ? v.capacity.ceremony : v.capacity.reception;
                  return (
                    <li key={v.slug}>
                      <a
                        href={`#${v.slug}`}
                        className="group flex items-center justify-between gap-4 border border-white/15 hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E0D3BD] px-6 py-5 transition-colors"
                      >
                        <span>
                          <span className="block font-serif text-2xl text-foreground">{v.name}</span>
                          <span className="block mt-1 text-[10px] tracking-[0.20em] uppercase font-sans text-white/60">
                            {v.type}{cap ? ` · Up to ${cap} guests` : ""}
                          </span>
                        </span>
                        <span aria-hidden="true" className="text-white/50 group-hover:text-white transition-colors">→</span>
                        <span className="sr-only">View {v.name} details</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      })}

      {/* Venue List */}
      {venues.map((venue, i) => (
        <section
          key={venue.slug}
          id={venue.slug}
          className={`section scroll-mt-24 ${i % 2 === 0 ? "bg-background" : "bg-[#363330]"}`}
        >
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">

            {/* Hero placeholder with overlaid content */}
            <div className="relative w-full aspect-[16/9] overflow-hidden mb-10">
              <div className="absolute inset-0 bg-[#2B2823]" aria-hidden="true" />
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
