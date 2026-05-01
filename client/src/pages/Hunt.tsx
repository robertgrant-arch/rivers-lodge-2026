import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const HERO = "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1920&q=80&auto=format&fit=crop";
const DEER = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80&auto=format&fit=crop";
const WATERFOWL = "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&q=80&auto=format&fit=crop";
const TURKEY = "https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80&auto=format&fit=crop";

const species = [
  {
    name: "Whitetail Deer",
    season: "October – December",
    desc: "Managed food plots, timber stands, and river-bottom habitat produce quality whitetail deer season after season. The property is managed for mature bucks — not just harvest numbers.",
    features: ["Managed food plots", "River-bottom timber", "Ladder and box stands", "Archery and rifle seasons", "Harvest data shared with members"],
    img: DEER,
  },
  {
    name: "Waterfowl",
    season: "November – January",
    desc: "The Marais des Cygnes is a natural flyway for ducks and geese. Flooded timber, open water, and managed wetland areas create consistent waterfowl hunting throughout the season.",
    features: ["Natural flyway location", "Flooded timber", "Managed wetlands", "Duck and goose", "Guided options available"],
    img: WATERFOWL,
  },
  {
    name: "Turkey",
    season: "April – May",
    desc: "Spring turkey hunting in the timber and field edges of the estate. The property holds a healthy turkey population with consistent gobbling activity through the Kansas spring season.",
    features: ["Spring season", "Timber and field edges", "Consistent gobbler activity", "Archery and shotgun", "Scouting access pre-season"],
    img: TURKEY,
  },
];

export default function Hunt() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative h-[75vh] min-h-[480px] flex items-end pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Hunting at Rivers Lodge" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/75" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
          <p className="text-[10px] tracking-[0.28em] uppercase font-sans text-white/60 mb-4">Hunt</p>
          <h1 className="font-serif text-5xl md:text-7xl text-white leading-[0.95] mb-5" style={{ textShadow: "0 2px 30px rgba(0,0,0,0.35)" }}>
            300 acres.<br /><span className="italic font-light">Private ground.</span>
          </h1>
          <p className="text-base font-sans text-white/80 max-w-lg mb-8 leading-relaxed">
            Managed whitetail, waterfowl, and turkey hunting on exclusive private ground. No public access. No crowds. Just the land and the season.
          </p>
          <Link href="/membership#apply" className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[oklch(0.15_0.008_66)] text-xs tracking-[0.16em] uppercase font-sans font-medium hover:bg-white/90 transition-colors">
            Apply for Membership
          </Link>
        </div>
      </section>

      {/* Species */}
      {species.map((s, i) => (
        <section key={s.name} className={`py-20 md:py-28 ${i % 2 === 0 ? "bg-background" : "bg-secondary/40"}`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${i % 2 !== 0 ? "lg:grid-flow-dense" : ""}`}>
              <div className={`overflow-hidden aspect-[4/3] ${i % 2 !== 0 ? "lg:col-start-2" : ""}`}>
                <img src={s.img} alt={s.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
              <div className={i % 2 !== 0 ? "lg:col-start-1 lg:row-start-1" : ""}>
                <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-muted-foreground mb-2">{s.season}</p>
                <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-5">{s.name}</h2>
                <p className="text-base font-sans text-muted-foreground leading-relaxed mb-6">{s.desc}</p>
                <div className="grid grid-cols-2 gap-2 mb-8">
                  {s.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Fishing */}
      <section id="fishing" className="py-20 md:py-28 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center lg:grid-flow-dense">
            <div className="overflow-hidden aspect-[4/3] lg:col-start-2">
              <img src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80&auto=format&fit=crop" alt="Fishing on the Marais des Cygnes" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="lg:col-start-1 lg:row-start-1">
              <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-muted-foreground mb-2">Year-Round</p>
              <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-5">Fishing</h2>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-6">
                The Marais des Cygnes holds bass, catfish, and crappie year-round. Members have exclusive access to private stretches of the river and estate ponds — no public access, no crowds. The river moves slowly through old-growth timber, and a morning on the water is as much a part of the Rivers Lodge experience as any hunt.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-8">
                {["Largemouth & smallmouth bass", "Catfish & crappie", "Private river access", "Estate ponds", "Year-round season", "Guided options available"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sporting Clays */}
      <section id="clays" className="py-20 md:py-28 bg-[oklch(0.13_0.008_66)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-white/40 mb-4">Year-Round</p>
            <h2 className="font-serif text-3xl md:text-4xl text-white mb-6">Sporting Clays</h2>
            <p className="text-base font-sans text-white/65 leading-relaxed mb-8">
              The Rivers Lodge sporting clays course is available to members year-round. Whether you're keeping your eye sharp for the season or simply enjoying a morning on the course, it's a natural extension of the estate experience.
            </p>
            <Link href="/membership#apply" className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans text-white border-b border-white/40 pb-0.5 hover:border-white transition-colors">
              Become a Member
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-5 italic font-light">Access starts with membership.</h2>
          <p className="text-sm font-sans text-muted-foreground mb-8 leading-relaxed">Apply for membership and gain exclusive access to 300 acres of private Kansas hunting ground.</p>
          <Link href="/membership#apply" className="inline-flex items-center justify-center px-10 py-4 bg-foreground text-background text-xs tracking-[0.18em] uppercase font-sans font-medium hover:opacity-90 transition-opacity">
            Apply for Membership
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
