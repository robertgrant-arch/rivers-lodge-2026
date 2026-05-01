import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";

const HERO = "/manus-storage/UebeleinWed453_7f9cd26b.jpg";        // couple kissing on ceremony deck
const BARN = "/manus-storage/IMG_0646_6bb80f84.jpg";              // Rivers Barn exterior at dusk — the actual barn building
const CEREMONY = "/manus-storage/UebeleinWed335_e6a9084a.jpg";    // outdoor ceremony on deck with water
const RECEPTION = "/manus-storage/UebeleinWed629_ebea0f99.jpg";   // reception tables inside barn
const RIVER_LAWN = "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg"; // aerial sunset showing barn, ceremony area, grounds, pond — perfect for River Lawn card
const LODGE_ROOM = "/manus-storage/974A8419edit_f37de96e.jpg";    // Lodge living room antler chandelier

const timeline = [
  { day: "Friday Evening", title: "Welcome & Rehearsal", desc: "Guests arrive and settle into The Lodge, Riverhouse Suites, or The Annex & Bridal Suite. Rehearsal dinner at The Clubhouse — the estate's intimate gathering space for cocktail hours and pre-wedding celebrations." },
  { day: "Saturday Morning", title: "Getting Ready", desc: "The bridal party takes over The Annex & Bridal Suite — four bedrooms, three bathrooms, light-filled and steps from the barn." },
  { day: "Saturday Afternoon", title: "Ceremony", desc: "Exchange vows on the River Lawn with the Marais des Cygnes as your backdrop, or choose the Timber Edge for a ceremony framed by old-growth trees." },
  { day: "Saturday Evening", title: "Reception", desc: "Dinner in Rivers Barn or under the Pavilion. Two fireplaces, an indoor/outdoor bar, and patios with string lights that carry the celebration into the night." },
  { day: "Sunday Morning", title: "Farewell Brunch", desc: "Coffee on the lodge balcony, a walk along the Timber Trail, and a slow goodbye. The estate is yours through checkout." },
];

const venues = [
  { name: "Rivers Barn", capacity: "Up to 256 guests", type: "Indoor / Outdoor", desc: "Designed by a prominent Kansas City architect. Modern farmhouse with two large patios, two fireplaces, air-conditioning, an indoor/outdoor bar, and separate luxury bathrooms.", href: "/venues#rivers-barn", img: BARN },
  { name: "Clubhouse", capacity: "Intimate events", type: "Indoor / Outdoor", desc: "Often used as a rehearsal dinner space, cocktail hour space, or intimate wedding ceremony location. A warm, character-filled gathering point.", href: "/venues#clubhouse", img: CEREMONY },
  { name: "River Lawn", capacity: "Up to 200 guests", type: "Outdoor Ceremony", desc: "A level grass expanse overlooking the Marais des Cygnes. Open sky, the river, and nothing competing with the moment.", href: "/venues#river-lawn", img: RIVER_LAWN },
];

const lodging = [
  { name: "The Lodge", detail: "4 Bedrooms · 6,000 sq ft", href: "/lodging#the-lodge" },
  { name: "Riverhouse Suites", detail: "4 Private Suites · Completed 2022", href: "/lodging#riverhouse-suites" },
  { name: "The Annex & Bridal Suite", detail: "4 Bedrooms · 3 Baths · Remodeled 2021", href: "/lodging#annex-bridal-suite" },
  { name: "Ohana House", detail: "4 Bedrooms · 20-Acre Lake", href: "/lodging#ohana-house" },
  { name: "The Farmhouse", detail: "Classic Kansas Character", href: "/lodging#the-farmhouse" },
];

export default function Weddings() {
  const { data: cmsSpaces } = trpc.cms.getEventSpaces.useQuery({ division: "weddings" });
  const { data: cmsLodging } = trpc.cms.getLodgingUnits.useQuery({ forWeddings: true });

  const weddingVenues = (cmsSpaces && cmsSpaces.length > 0)
    ? cmsSpaces.slice(0, 3).map((space) => ({
        name: space.name,
        capacity: space.capacitySeated ? `Up to ${space.capacitySeated} guests` : space.capacityReception ? `Up to ${space.capacityReception} guests` : "Flexible capacity",
        type: space.indoorOutdoor === "indoor" ? "Indoor" : space.indoorOutdoor === "outdoor" ? "Outdoor" : "Indoor / Outdoor",
        desc: space.shortDescription ?? "",
        href: `/venues#${space.slug}`,
        img: space.heroImage ?? BARN,
      }))
    : venues;

  const weddingLodging = (cmsLodging && cmsLodging.length > 0)
    ? cmsLodging.map((unit) => ({
        name: unit.name,
        detail: [unit.bedrooms ? `${unit.bedrooms} Bedrooms` : null, unit.squareFootage ? `${unit.squareFootage.toLocaleString()} sq ft` : null].filter(Boolean).join(" · ") || unit.shortDescription || "",
        href: `/lodging#${unit.slug}`,
      }))
    : lodging;

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative h-[90vh] min-h-[520px] flex items-end pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Weddings at Rivers Lodge" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/80" />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
          <div className="h-px w-10 mb-6" style={{ backgroundColor: "oklch(0.70 0.060 50)" }} />
          <p className="eyebrow text-[oklch(0.94_0.008_78)/55] mb-4">Weddings at Rivers Lodge</p>
          <h1
            className="font-serif font-light italic text-white leading-tight mb-6"
            style={{ fontSize: "clamp(2.5rem,6vw,5.5rem)" }}
          >
            Your wedding,<br />without compromise.
          </h1>
          <p className="text-[oklch(0.94_0.008_78)/75] font-sans text-base max-w-lg mb-10 leading-relaxed">
            An estate that holds the day as beautifully as you imagined it. A private weekend, not just a wedding day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/contact?type=wedding" className="btn-primary">
              Begin Your Inquiry
            </Link>
            <Link href="/gallery" className="btn-ghost">
              View Gallery
            </Link>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="section bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">The Experience</p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-6 leading-tight">
              A destination wedding weekend,<br /><span className="italic">one hour from Kansas City.</span>
            </h2>
            <p className="text-base font-sans text-muted-foreground leading-relaxed mb-4">
              A wedding at Rivers Lodge is not a venue rental. It is a private estate experience — one where the property, the grounds, the lodging, and the staff are entirely yours for the weekend. One hour south of Kansas City, and a world apart from everything else.
            </p>
            <p className="text-base font-sans text-muted-foreground leading-relaxed mb-4">
              Rivers Lodge is a distinctive Kansas venue unlike anything in the region. The barn was designed by a prominent Kansas City architect. The grounds hold five separate event spaces. The lodging sleeps 16+ guests on-site. We host a limited number of weddings each year — every couple receives our full attention, from the first inquiry to the farewell brunch.
            </p>
            <p className="text-base font-sans text-muted-foreground leading-relaxed">
              This is warm hospitality at scale. An elevated but natural setting. A weekend your guests will talk about for years.
            </p>
          </div>
        </div>
      </section>

      {/* Weekend Timeline */}
      <section className="section bg-[oklch(0.115_0.007_64)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-3">Your Weekend</p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">A weekend on the estate</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
            {timeline.map((step, i) => (
              <div key={step.day} className="relative flex flex-col md:block">
                {/* Connector line */}
                {i < timeline.length - 1 && (
                  <div className="hidden md:block absolute top-3 left-1/2 right-0 h-px bg-border" />
                )}
                <div className="flex md:flex-col items-start md:items-start gap-4 md:gap-0 pb-8 md:pb-0 md:pr-6">
                  <div className="relative z-10 w-6 h-6 rounded-full bg-foreground flex-shrink-0 mt-0.5 md:mb-5" />
                  <div>
                    <p className="text-[9px] tracking-[0.20em] uppercase font-sans text-muted-foreground mb-1">{step.day}</p>
                    <h3 className="font-serif text-lg text-foreground mb-2">{step.title}</h3>
                    <p className="text-xs font-sans text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Venue Spaces */}
      <section className="section bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-3">Venue Spaces</p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground">Spaces that shape the day</h2>
            </div>
            <Link href="/venues" className="hidden md:inline-flex text-xs tracking-[0.14em] uppercase font-sans text-muted-foreground hover:text-foreground transition-colors border-b border-current pb-0.5">
              All Venues
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {weddingVenues.map((v) => (
              <Link key={v.name} href={v.href} className="group block">
                <div className="overflow-hidden aspect-[4/3] mb-5">
                  <img src={v.img} alt={v.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[9px] tracking-[0.18em] uppercase font-sans text-muted-foreground">{v.type}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-[9px] tracking-[0.18em] uppercase font-sans text-muted-foreground">{v.capacity}</span>
                </div>
                <h3 className="font-serif text-xl text-foreground mb-2">{v.name}</h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">{v.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* On-site Lodging */}
      <section className="section bg-[oklch(0.115_0.007_64)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-white/40 mb-4">On-Site Lodging</p>
              <h2 className="font-serif text-3xl md:text-4xl text-white mb-6 leading-tight">
                Your guests stay<br /><span className="italic font-light">on the estate.</span>
              </h2>
              <p className="text-base font-sans text-white/65 leading-relaxed mb-8">
                Five lodging buildings sleep your wedding party on-site. From the 6,000 sq ft Lodge decorated by a prominent Kansas City designer, to the light-filled Annex & Bridal Suite just steps from the barn — everyone stays together.
              </p>
              <div className="flex flex-col gap-3 mb-8">
                {weddingLodging.map((l) => (
                  <Link key={l.name} href={l.href} className="flex items-center justify-between py-3 border-b border-white/10 group">
                    <span className="font-serif text-lg text-white group-hover:opacity-70 transition-opacity">{l.name}</span>
                    <span className="text-xs font-sans text-white/40">{l.detail}</span>
                  </Link>
                ))}
              </div>
              <Link href="/lodging" className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans text-white border-b border-white/40 pb-0.5 hover:border-white transition-colors">
                Explore All Lodging
              </Link>
            </div>
            <div className="overflow-hidden aspect-[3/4]">
              <img src={LODGE_ROOM} alt="The Lodge" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry CTA */}
      <section className="section bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">Ready to Begin?</p>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-6 italic font-light">
            Tell us about your day.
          </h2>
          <p className="text-base font-sans text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
            Tell us your preferred dates and a little about what you are imagining. We will respond within 24 hours.
          </p>
          <Link href="/contact?type=wedding" className="inline-flex items-center justify-center px-10 py-4 bg-foreground text-background text-xs tracking-[0.18em] uppercase font-sans font-medium hover:opacity-90 transition-opacity">
            Begin Your Inquiry
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
