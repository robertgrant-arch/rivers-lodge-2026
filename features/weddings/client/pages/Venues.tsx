import { Link } from "wouter";
import { CoverVideo, type CoverVideoSource } from "../components/CoverVideo";
import PublicLayout from "@shared/components/PublicLayout";
import Picture from "@shared/components/Picture";
import { trpc } from '@shared/lib/trpc';
import SEOHead from "@shared/components/SEOHead";
import { useHashScroll } from "@shared/hooks/useHashScroll";

type SpaceUse = "ceremony" | "reception";

/**
 * Cover videos on/off switch. Set to false to go straight back to the cover
 * photos (img below) for every venue — nothing else needs to change. Each
 * venue's `video` entry can also be deleted individually.
 * Files: client/public/img/venues/{event-barn,clubhouse}.mp4
 */
const SHOW_COVER_VIDEOS = true;

// `uses` records whether a space hosts ceremonies and/or receptions. The page shows
// one combined "Ceremony and Reception Spaces" list (SPACE_LIST below), which keeps
// the /venues#ceremony and /venues#reception anchors the /weddings cards link to.
// Venues with `copyLocked` always show the copy, capacity and features below; published
// CMS event-space records are not merged over them (so /ops edits don't change them here).
const FALLBACK_VENUES: VenueProp[] = [
  {
    slug: "event-barn",
    legacyAnchors: ["rivers-barn"], // old links (/venues#rivers-barn) still land here
    name: "The Event Barn",
    shortName: "Event Barn",
    type: "Indoor / Outdoor",
    uses: ["ceremony", "reception"],
    capacity: { ceremony: 250, reception: 250 },
    intro: "This 6,000 sq ft open-concept space is perfect for ceremonies, receptions, and large gatherings. Accommodates up to 250 guests.",
    desc: "Designed by a prominent Kansas City architect, The Event Barn is modern farmhouse — a blank slate that lets a bride and groom or corporate group give it whatever feel they desire. The barn features two large patios, two fireplaces, air-conditioning, an indoor/outdoor bar, and separate luxury bathrooms. The space accommodates up to 250 guests.",
    details: ["Up to 250 guests", "Two large patios", "Two fireplaces", "Air-conditioning", "Indoor/outdoor bar", "Separate luxury bathrooms"],
    img: {
      src: "/img/venues/event-barn-cover.jpg", width: 1350, height: 2400, position: "center 62%",
      alt: "Aerial view of The Event Barn during an outdoor wedding ceremony, guests seated on the stone-walled terrace in front of the barn, with lawn, walking paths and dense timber around it",
    },
    // Cover video (replaces the photo above); the existing cover photo is the poster/fallback
    // (video is pre-cropped to a landscape band at the photo's framing, so it's centred)
    video: { mp4: "/img/venues/event-barn.mp4", poster: "/img/venues/event-barn-cover.jpg", position: "center" },
    copyLocked: true,
  },
  {
    slug: "clubhouse",
    name: "Clubhouse",
    shortName: "Clubhouse",
    type: "Indoor / Outdoor",
    uses: ["ceremony", "reception"],
    capacity: { ceremony: 75, reception: 75 },
    intro: "A refined indoor gathering space for rehearsal dinners, welcome parties, private dinners, and smaller celebrations. Accommodates up to 75 guests.",
    desc: "The Clubhouse is an additional space on the Lodge often used as a rehearsal dinner space, cocktail hour space, or intimate wedding ceremony location. Its warm, character-filled interior makes it the natural gathering point before and after the main event.",
    details: ["Up to 75 guests", "Rehearsal dinner space", "Cocktail hour space", "Intimate ceremony option", "Warm interior character", "Adjacent to The Event Barn", "Full bar"],
    img: {
      src: "/img/venues/clubhouse-cover.jpg", width: 2400, height: 1601, position: "center 55%",
      alt: "The Clubhouse at Rivers Lodge — a dark timber building with an antler mount and glass doors, framed by golden ornamental grasses and a weeping willow on a sunny day",
    },
    // Cover video (replaces the photo above); the existing cover photo is the poster/fallback
    video: { mp4: "/img/venues/clubhouse.mp4", poster: "/img/venues/clubhouse-cover-1920w.webp", position: "center" },
    copyLocked: true,
  },
  {
    slug: "the-green-drake",
    name: "The Green Drake",
    shortName: "The Green Drake",
    type: "Indoor / Outdoor",
    uses: [],
    capacity: { ceremony: null, reception: null },
    desc: "Description coming soon.",
    details: [],
  },
];

type VenueProp = {
  slug: string;
  legacyAnchors?: string[];
  name: string;
  shortName: string;
  type: string;
  capacity: { ceremony: number | null; reception: number | null };
  intro?: string;
  desc: string;
  details: string[];
  uses: SpaceUse[];
  img?: { src: string; alt: string; width: number; height: number; position: string };
  /** Optional cover video shown instead of img (img's alt and position are reused). */
  video?: CoverVideoSource;
  copyLocked?: boolean;
};

// One combined "Ceremony and Reception Spaces" list (each card links to the
// venue's section below). Order and labels as the owner asked.
const SPACE_LIST: { slug: string; label: string }[] = [
  { slug: "clubhouse", label: "The Clubhouse" },
  { slug: "event-barn", label: "The Event Barn" },
  { slug: "the-green-drake", label: "The Green Drake" },
];

export default function Venues() {
  useHashScroll();
  const { data: cmsSpaces } = trpc.cms.getEventSpaces.useQuery();

  // CMS text content is merged when slugs match, except for copy-locked venues.
  const venues: VenueProp[] = FALLBACK_VENUES.map((fb) => {
    if (fb.copyLocked) return fb;
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
        description="The Event Barn, the Clubhouse, and The Green Drake — three distinct event spaces on the Rivers Lodge in La Cygne, Kansas."
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

      {/* Ceremony and Reception Spaces — one list. Keeps both anchors the /weddings
          cards link to (/venues#ceremony and /venues#reception). */}
      <section
        id="ceremony"
        aria-labelledby="spaces-heading"
        className="py-14 md:py-16 scroll-mt-24 border-t border-white/10 bg-[#363330]"
      >
        <span id="reception" aria-hidden="true" className="block h-0 scroll-mt-24" />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="gold-rule" />
          <h2 id="spaces-heading" className="font-serif text-3xl md:text-4xl text-foreground leading-tight mb-8">
            Ceremony and Reception Spaces
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl">
            {SPACE_LIST.map(({ slug, label }) => {
              const v = venues.find((x) => x.slug === slug);
              if (!v) return null;
              const cap = Math.max(v.capacity.ceremony ?? 0, v.capacity.reception ?? 0);
              return (
                <li key={slug} className="flex flex-col items-start justify-between gap-4 border border-white/15 px-6 py-5">
                  <span>
                    <span className="block font-serif text-2xl text-foreground">{label}</span>
                    <span className="block mt-1 text-[10px] tracking-[0.20em] uppercase font-sans text-white/70">
                      {v.type}{cap ? ` · Up to ${cap} guests` : ""}
                    </span>
                  </span>
                  <a href={`#${v.slug}`} className="btn-primary whitespace-nowrap" style={{ color: "#F4EEE4" }}>
                    View Details →
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Venue List */}
      {venues.map((venue, i) => (
        <section
          key={venue.slug}
          id={venue.slug}
          className={`section scroll-mt-24 ${i % 2 === 0 ? "bg-background" : "bg-[#363330]"}`}
        >
          {venue.legacyAnchors?.map((a) => (
            <span key={a} id={a} aria-hidden="true" className="block h-0 scroll-mt-24" />
          ))}
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">

            {venue.img ? (
              /* Cover photo: text over the photo on md+; photo above the text on mobile so nothing is clipped */
              <div className="relative w-full md:aspect-[16/9] overflow-hidden mb-10">
                <div className="relative aspect-[4/3] md:absolute md:inset-0 md:aspect-auto overflow-hidden">
                  {SHOW_COVER_VIDEOS && venue.video ? (
                    <CoverVideo
                      video={venue.video}
                      alt={venue.img.alt}
                      className="absolute inset-0 w-full h-full object-cover"
                      objectPosition={venue.video.position ?? venue.img.position}
                      posterPosition={venue.img.position}
                    />
                  ) : (
                    <Picture
                      src={venue.img.src}
                      alt={venue.img.alt}
                      label={venue.name}
                      width={venue.img.width}
                      height={venue.img.height}
                      className="absolute inset-0 w-full h-full"
                      imgClassName="absolute inset-0 w-full h-full object-cover"
                      imgStyle={{ objectPosition: venue.img.position }}
                      sizes="(max-width: 1440px) 100vw, 1360px"
                    />
                  )}
                  {/* Shade only behind the text block (lower left), desktop only */}
                  <div
                    aria-hidden="true"
                    className="hidden md:block absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(to top, rgba(43,40,35,0.82) 0%, rgba(43,40,35,0.55) 38%, rgba(43,40,35,0) 68%), linear-gradient(to right, rgba(43,40,35,0.55) 0%, rgba(43,40,35,0.2) 45%, rgba(43,40,35,0) 65%)" }}
                  />
                </div>
                <div className="relative md:absolute md:bottom-0 md:left-0 md:right-0 pt-6 md:p-12" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.45)" }}>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="text-[10px] tracking-[0.20em] uppercase font-sans text-white/80">{venue.type}</span>
                    {venue.capacity.ceremony && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/50" />
                        <span className="text-[10px] tracking-[0.20em] uppercase font-sans text-white/80">Ceremony: {venue.capacity.ceremony}</span>
                      </>
                    )}
                    {venue.capacity.reception && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/50" />
                        <span className="text-[10px] tracking-[0.20em] uppercase font-sans text-white/80">Reception: {venue.capacity.reception}</span>
                      </>
                    )}
                  </div>
                  <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">{venue.name}</h2>
                  {venue.intro && <p className="font-serif text-lg md:text-xl text-white max-w-2xl leading-snug mb-4">{venue.intro}</p>}
                  <p className="text-sm font-sans text-white/85 max-w-xl leading-relaxed mb-6">{venue.desc}</p>
                  <Link
                    href="/contact?type=wedding"
                    className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-white border-b border-white/30 pb-0.5 hover:border-white transition-colors"
                  >
                    Inquire About This Space
                  </Link>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}

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
