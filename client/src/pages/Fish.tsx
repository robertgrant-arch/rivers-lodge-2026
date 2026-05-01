import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";

const HERO = "/manus-storage/DJI_0017_538feef1.jpg";
const BASS = "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg";
const RIVER = "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg";
const POND = "/manus-storage/Rivers_May2023-8_d07307f4.jpg";

const fisheries = [
  {
    name: "The Marais des Cygnes",
    type: "River",
    season: "Year-Round",
    desc: "The river that gives the property its name and its character. The Marais des Cygnes moves slowly through the estate — wide, clear, and full of largemouth bass, smallmouth bass, catfish, and crappie. Members have exclusive access to private stretches of the river that see no public pressure.",
    features: [
      "Largemouth & smallmouth bass",
      "Channel catfish",
      "Crappie & bluegill",
      "Private river access",
      "No public pressure",
      "Guided trips available",
    ],
    img: RIVER,
  },
  {
    name: "Estate Ponds",
    type: "Private Ponds",
    season: "Year-Round",
    desc: "Multiple managed ponds on the property hold bass and panfish in a quiet, private setting. These are ideal for early morning sessions, introducing younger anglers to the sport, or simply spending an afternoon on the water away from the main river.",
    features: [
      "Managed bass populations",
      "Panfish & bluegill",
      "Walk-in access",
      "Ideal for all skill levels",
      "Morning & evening sessions",
      "Exclusive member access",
    ],
    img: POND,
  },
  {
    name: "Guided Trophy Bass",
    type: "Guided Experience",
    season: "Spring & Fall Peak",
    desc: "For members seeking a more structured experience, guided trophy bass trips are available on the river and estate ponds. Our guides know the water intimately — the bends, the structure, the seasonal patterns. Spring and fall produce the best trophy-class fish.",
    features: [
      "Expert local guides",
      "Trophy largemouth bass",
      "Seasonal pattern knowledge",
      "Catch-and-release or harvest",
      "Equipment provided",
      "Private scheduling",
    ],
    img: BASS,
  },
];

export default function Fish() {
  const fishReports = trpc.cms.getMemberContent.useQuery({ contentType: "fish_report" });
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative h-[80vh] min-h-[520px] flex items-end pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Fishing on the Marais des Cygnes" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/80" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
          <p className="text-[10px] tracking-[0.28em] uppercase font-sans text-white/60 mb-4">Fish · Rivers Lodge</p>
          <h1 className="font-serif text-5xl md:text-7xl text-white leading-[0.95] mb-5" style={{ textShadow: "0 2px 30px rgba(0,0,0,0.35)" }}>
            Private water.<br /><span className="italic font-light">No crowds. Ever.</span>
          </h1>
          <p className="text-base font-sans text-white/80 max-w-lg mb-8 leading-relaxed">
            Exclusive access to the Marais des Cygnes and private estate ponds. Bass, catfish, and crappie year-round — on water that sees no public pressure.
          </p>
          <Link
            href="/membership#apply"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[oklch(0.15_0.008_66)] text-xs tracking-[0.16em] uppercase font-sans font-medium hover:bg-white/90 transition-colors"
          >
            Apply for Membership
          </Link>
        </div>
      </section>

      {/* Intro */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-[10px] tracking-[0.26em] uppercase font-sans text-muted-foreground mb-4">The Water</p>
              <h2 className="font-serif text-4xl md:text-5xl text-foreground leading-tight mb-6">
                The Marais des Cygnes.<br />
                <span className="italic font-light">A river worth protecting.</span>
              </h2>
            </div>
            <div className="space-y-4">
              <p className="text-base font-sans text-muted-foreground leading-relaxed">
                The name means "marsh of the swans" in French — named by early explorers who found the river teeming with wildlife. That wildlife is still here. The Marais des Cygnes is a slow-moving, clear-water river that winds through the estate's old-growth timber corridor, holding fish year-round in structure that most anglers never access.
              </p>
              <p className="text-base font-sans text-muted-foreground leading-relaxed">
                Membership at Rivers Lodge includes exclusive access to private stretches of the river and multiple managed estate ponds. No public access. No crowds. Just the water, the land, and the season.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fisheries */}
      {fisheries.map((f, i) => (
        <section key={f.name} className={`py-20 md:py-28 ${i % 2 === 0 ? "bg-secondary/40" : "bg-background"}`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${i % 2 !== 0 ? "lg:grid-flow-dense" : ""}`}>
              <div className={`overflow-hidden aspect-[4/3] ${i % 2 !== 0 ? "lg:col-start-2" : ""}`}>
                <img
                  src={f.img}
                  alt={f.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className={i % 2 !== 0 ? "lg:col-start-1 lg:row-start-1" : ""}>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-muted-foreground">{f.type}</p>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                  <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-muted-foreground">{f.season}</p>
                </div>
                <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-5">{f.name}</h2>
                <p className="text-base font-sans text-muted-foreground leading-relaxed mb-6">{f.desc}</p>
                <div className="grid grid-cols-2 gap-2">
                  {f.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                      {feat}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Conservation note */}
      <section className="py-20 md:py-28 bg-[oklch(0.13_0.008_66)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-white/40 mb-4">Conservation</p>
            <h2 className="font-serif text-3xl md:text-4xl text-white mb-6">
              Managed for the long term.
            </h2>
            <p className="text-base font-sans text-white/65 leading-relaxed mb-4">
              The fisheries at Rivers Lodge are managed with the same philosophy as the hunting ground — for quality over quantity, and for the next generation of members as much as the current one. Catch-and-release practices are encouraged on trophy bass, and harvest is managed to maintain healthy populations.
            </p>
            <p className="text-base font-sans text-white/65 leading-relaxed mb-8">
              This is private water managed by people who fish it. That distinction matters.
            </p>
            <Link
              href="/membership#apply"
              className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans text-white border-b border-white/40 pb-0.5 hover:border-white transition-colors"
            >
              Apply for Membership
            </Link>
          </div>
        </div>
      </section>

      {/* Fish Reports from CMS */}
      {fishReports.data && fishReports.data.length > 0 && (
        <section className="py-20 md:py-28 bg-secondary/40">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="mb-10">
              <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-3">From the Water</p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground">Recent Fishing Reports</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fishReports.data.slice(0, 3).map((r) => (
                <div key={r.id} className="bg-card border border-border p-6">
                  <p className="text-[9px] tracking-[0.16em] uppercase font-sans text-muted-foreground mb-2">{r.contentType.replace(/_/g, " ")}{r.season ? ` · ${r.season}` : ""}</p>
                  <h3 className="font-serif text-xl text-foreground mb-3">{r.title}</h3>
                  <p className="text-sm font-sans text-muted-foreground leading-relaxed line-clamp-4">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] tracking-[0.26em] uppercase font-sans text-muted-foreground mb-4">Membership</p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-5 italic font-light">
                Access starts with membership.
              </h2>
              <p className="text-sm font-sans text-muted-foreground mb-8 leading-relaxed">
                Fishing access is included with all membership tiers. Apply for membership and gain exclusive access to the Marais des Cygnes and estate ponds — year-round, with no public pressure.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/membership#apply"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-foreground text-background text-xs tracking-[0.18em] uppercase font-sans font-medium hover:opacity-90 transition-opacity"
                >
                  Apply for Membership
                </Link>
                <Link
                  href="/membership"
                  className="inline-flex items-center justify-center px-8 py-3.5 border border-foreground text-foreground text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-foreground hover:text-background transition-colors"
                >
                  View Membership
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { stat: "Year-Round", label: "Fishing Season" },
                { stat: "Private", label: "River Access" },
                { stat: "Managed", label: "Trophy Bass" },
                { stat: "No Public", label: "Pressure" },
              ].map((item) => (
                <div key={item.label} className="border border-border p-6">
                  <p className="font-serif text-2xl text-foreground mb-1">{item.stat}</p>
                  <p className="text-[10px] tracking-[0.2em] uppercase font-sans text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
