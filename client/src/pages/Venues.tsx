import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const venues = [
  {
    slug: "rivers-barn",
    name: "Rivers Barn",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: 256 },
    desc: "Designed by a prominent Kansas City architect, the barn blends raw materials with modern infrastructure — floor-to-ceiling windows, 22-foot facade doors, a lookout balcony, two fireplaces, and an indoor/outdoor bar. It seats up to 256 guests and opens fully to the surrounding landscape.",
    details: ["22-foot facade doors", "Floor-to-ceiling windows", "Lookout balcony", "Two fireplaces", "Indoor/outdoor bar", "Two patios with string lights"],
    img: "/manus-storage/Rivers_SEPT2022_-109_c2b5fea5.jpg",
  },
  {
    slug: "clubhouse",
    name: "Clubhouse",
    type: "Indoor / Outdoor",
    capacity: { ceremony: 80, reception: 80 },
    desc: "Rehearsal dinners, cocktail hours, and intimate ceremonies. The Clubhouse sits by a pond with its own gazebo, outdoor entertaining area, and bar. With its flexible layout, it is as suited to a corporate breakout session as it is to a casual evening under the stars.",
    details: ["Pond-side setting", "Private gazebo", "Full bar", "Flexible layout", "Outdoor entertaining deck", "Ideal for rehearsal dinners"],
    img: "/manus-storage/3C0A0304_cb66bc23.jpg",
  },
  {
    slug: "river-lawn",
    name: "River Lawn",
    type: "Outdoor",
    capacity: { ceremony: 200, reception: 180 },
    desc: "A level grass expanse with direct sightlines to the Marais des Cygnes. Ceremonies here feel like they belong to the land itself. The natural backdrop for an outdoor ceremony — open sky, the river, and nothing competing with the moment.",
    details: ["Direct river sightlines", "Level grass expanse", "Up to 200 ceremony guests", "Golden-hour photography", "Adjacent to the Timber Trail", "Open-air setting"],
    img: "/manus-storage/DJI_0017_538feef1.jpg",
  },
  {
    slug: "timber-edge",
    name: "Timber Edge",
    type: "Outdoor",
    capacity: { ceremony: 120, reception: null },
    desc: "Where the open field meets the tree line. A naturally framed space with dappled light and a sense of enclosure that larger venues cannot manufacture. Walk-in access through mature timber along the river.",
    details: ["Natural tree canopy", "Dappled light", "Intimate atmosphere", "Old-growth timber backdrop", "Adjacent to Timber Trail", "Up to 120 ceremony guests"],
    img: "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg",
  },
  {
    slug: "pavilion",
    name: "Pavilion",
    type: "Indoor / Outdoor",
    capacity: { ceremony: null, reception: 200 },
    desc: "A covered structure designed to bridge indoors and out. Configured for seated dining, dancing, or standing receptions. The pavilion opens fully to the surrounding landscape and connects seamlessly with Rivers Barn for large-scale events.",
    details: ["Covered structure", "Opens to landscape", "Up to 200 reception guests", "Flexible configuration", "Adjacent to Rivers Barn", "String-lit canopy"],
    img: "/manus-storage/2020JennyShipleySSTheRiverFilm-1_60fc729b.jpg",
  },
];

export default function Venues() {
  return (
    <PublicLayout>
      {/* Header */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">Venue Spaces</p>
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
          className={`py-20 md:py-28 ${i % 2 === 0 ? "bg-background" : "bg-secondary/40"}`}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${i % 2 !== 0 ? "lg:grid-flow-dense" : ""}`}>
              <div className={`overflow-hidden aspect-[4/3] ${i % 2 !== 0 ? "lg:col-start-2" : ""}`}>
                <img
                  src={venue.img}
                  alt={venue.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className={i % 2 !== 0 ? "lg:col-start-1 lg:row-start-1" : ""}>
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
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-20 bg-[oklch(0.13_0.008_66)] text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-5 italic font-light">Ready to see the spaces?</h2>
          <p className="text-sm font-sans text-white/60 mb-8 leading-relaxed">
            The best way to understand Rivers Lodge is to walk it. Book a private tour — no pressure, no presentation.
          </p>
          <Link href="/contact" className="inline-flex items-center justify-center px-10 py-4 bg-white text-[oklch(0.15_0.008_66)] text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/90 transition-colors">
            Book a Private Tour
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
