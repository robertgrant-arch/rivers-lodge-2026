import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";

// Real estate photography — correctly matched to spaces
const HERO = "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg";   // Aerial of full estate grounds
const AERIAL_RIVER = "/manus-storage/DJI_0017_538feef1.jpg";       // Drone aerial of river and property
const LODGE_AERIAL = "/manus-storage/974A9398edit_294e71ff.jpg";   // Exterior of The Lodge building
const FIRE_PIT = "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg"; // Estate grounds wide shot
const CLUBHOUSE_BAR = "/manus-storage/3C0A0304_cb66bc23.jpg";      // Clubhouse interior
const WEDDING_1 = "/manus-storage/UebeleinWed335_e6a9084a.jpg";    // Outdoor ceremony on deck
const WEDDING_2 = "/manus-storage/UebeleinWed629_ebea0f99.jpg";    // Reception tables in barn
const WEDDING_3 = "/manus-storage/UebeleinWed557_b0b3b0ff.jpg";    // Couple by lake with string lights
const GROUNDS_1 = "/manus-storage/6M9A3253_319f3a3b.jpg";          // Estate grounds aerial
const GROUNDS_2 = "/manus-storage/6M9A3239_d4c999f4.jpg";          // Rivers Barn interior
const GROUNDS_3 = "/manus-storage/Rivers_May2023-8_d07307f4.jpg";  // Lodge interior
const INTERIOR_1 = "/manus-storage/974A8419edit_f37de96e.jpg";     // Lodge living room antler chandelier
const INTERIOR_2 = "/manus-storage/Rivers_May2023-28_f44fb1bd.jpg"; // Riverhouse Suites interior

export default function Home() {
  return (
    <PublicLayout>
      {/* ── Cinematic Hero ─────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[600px] flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO}
            alt="Rivers Lodge & Hunt Club — aerial view at golden hour"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/80" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
          <p className="text-[10px] tracking-[0.32em] uppercase font-sans text-white/60 mb-5">
            La Cygne, Kansas
          </p>
          <h1
            className="font-serif text-6xl md:text-8xl lg:text-9xl text-white leading-[0.9] mb-6"
            style={{ textShadow: "0 2px 40px rgba(0,0,0,0.4)" }}
          >
            Rivers Lodge
            <br />
            <span className="italic font-light">& Hunt Club</span>
          </h1>
          <p className="text-base md:text-lg font-sans text-white/80 max-w-xl mb-10 leading-relaxed">
            A private estate on the Marais des Cygnes. A destination wedding venue one hour from Kansas City — and a private membership club for those who hunt, fish, and live on the land.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/weddings"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[oklch(0.15_0.008_66)] text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/90 transition-colors"
            >
              Weddings &amp; Events
            </Link>
            <Link
              href="/membership"
              className="inline-flex items-center justify-center px-8 py-4 border border-white text-white text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/10 transition-colors"
            >
              Membership &amp; Outdoors
            </Link>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <p className="text-[9px] tracking-[0.28em] uppercase font-sans text-white/40">Scroll</p>
          <div className="w-px h-10 bg-white/30" />
        </div>
      </section>

      {/* ── Estate Stats Bar ───────────────────────────────────────────── */}
      <section className="bg-[oklch(0.13_0.008_66)] py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { stat: "300+", label: "Acres" },
              { stat: "1", label: "River" },
              { stat: "5", label: "Buildings" },
              { stat: "16+", label: "Bedrooms" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-serif text-4xl text-white mb-1">{item.stat}</p>
                <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-white/40">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dual Track Entry ───────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[70vh]">
        {/* Weddings & Events */}
        <div className="relative overflow-hidden group">
          <img
            src={WEDDING_1}
            alt="Weddings & Events at Rivers Lodge"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
          <div className="relative z-10 h-full min-h-[400px] flex flex-col justify-end p-10 lg:p-14">
            <p className="text-[9px] tracking-[0.26em] uppercase font-sans text-white/50 mb-3">Track One</p>
            <h2 className="font-serif text-4xl md:text-5xl text-white mb-4 leading-tight">
              Weddings<br /><span className="italic font-light">&amp; Events</span>
            </h2>
            <p className="text-sm font-sans text-white/75 mb-7 max-w-sm leading-relaxed">
              A destination wedding venue unlike anything else in Kansas. Five distinct spaces, on-site lodging for your entire party, and a weekend experience that begins the moment guests arrive.
            </p>
            <Link
              href="/weddings"
              className="inline-flex items-center gap-3 text-xs tracking-[0.18em] uppercase font-sans text-white border-b border-white/40 pb-0.5 hover:border-white transition-colors w-fit"
            >
              Explore Weddings &amp; Events
            </Link>
          </div>
        </div>
        {/* Membership & Outdoors */}
        <div className="relative overflow-hidden group">
          <img
            src={FIRE_PIT}
            alt="Membership & Outdoors at Rivers Lodge Hunt Club"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
          <div className="relative z-10 h-full min-h-[400px] flex flex-col justify-end p-10 lg:p-14">
            <p className="text-[9px] tracking-[0.26em] uppercase font-sans text-white/50 mb-3">Track Two</p>
            <h2 className="font-serif text-4xl md:text-5xl text-white mb-4 leading-tight">
              Membership<br /><span className="italic font-light">&amp; Outdoors</span>
            </h2>
            <p className="text-sm font-sans text-white/75 mb-7 max-w-sm leading-relaxed">
              A private hunt club on the Marais des Cygnes. 10,000+ acres of managed Kansas hunting ground, private fisheries, and a membership built for those who take the land seriously.
            </p>
            <Link
              href="/membership"
              className="inline-flex items-center gap-3 text-xs tracking-[0.18em] uppercase font-sans text-white border-b border-white/40 pb-0.5 hover:border-white transition-colors w-fit"
            >
              Explore Membership &amp; Outdoors
            </Link>
          </div>
        </div>
      </section>

      {/* ── The Estate ─────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div>
              <p className="text-[9px] tracking-[0.26em] uppercase font-sans text-muted-foreground mb-4">The Estate</p>
              <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-6 leading-tight">
                300 acres on the<br /><span className="italic font-light">Marais des Cygnes</span>
              </h2>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-6">
                Rivers Lodge & Hunt Club sits on 300 acres of Kansas landscape along the Marais des Cygnes River in La Cygne, Kansas — one hour south of Kansas City. The estate comprises five distinct buildings, 16+ bedrooms, and grounds that move between open meadow, old-growth timber, and river bottom.
              </p>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-8">
                It is a place built for two distinct purposes: hosting the most important days of people's lives, and providing a private outdoor retreat for those who hunt, fish, and want to be on the land.
              </p>
              <Link
                href="/estate"
                className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans text-foreground border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors"
              >
                Explore the Estate
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="overflow-hidden aspect-[3/4]">
                <img src={AERIAL_RIVER} alt="Aerial view of the Marais des Cygnes river" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="overflow-hidden aspect-[3/4] mt-8">
                <img src={GROUNDS_1} alt="Estate grounds" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Venues & Spaces ────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-14">
            <p className="text-[9px] tracking-[0.26em] uppercase font-sans text-muted-foreground mb-3">Venues &amp; Spaces</p>
            <h2 className="font-serif text-4xl md:text-5xl text-foreground">Five distinct spaces</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Rivers Barn", desc: "Designed by a prominent Kansas City architect. Modern farmhouse with two patios, two fireplaces, an indoor/outdoor bar, and capacity for up to 256 guests.", img: GROUNDS_2, href: "/venues" },
              { name: "Clubhouse", desc: "The estate's intimate gathering space — rehearsal dinners, cocktail hours, and intimate ceremony location.", img: CLUBHOUSE_BAR, href: "/venues" },
              { name: "River Lawn", desc: "Open-air ceremony and reception space on the banks of the Marais des Cygnes.", img: AERIAL_RIVER, href: "/venues" },
            ].map((v) => (
              <Link key={v.name} href={v.href} className="group block">
                <div className="overflow-hidden aspect-[4/3] mb-4">
                  <img src={v.img} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <h3 className="font-serif text-xl text-foreground mb-2">{v.name}</h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">{v.desc}</p>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/venues" className="inline-flex items-center justify-center px-8 py-3.5 border border-foreground/20 text-foreground text-xs tracking-[0.16em] uppercase font-sans hover:bg-foreground hover:text-background transition-colors">
              View All Spaces
            </Link>
          </div>
        </div>
      </section>

      {/* ── Lodging ────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="grid grid-cols-2 gap-3">
              <div className="overflow-hidden aspect-[3/4]">
                <img src={INTERIOR_1} alt="Lodge interior" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="overflow-hidden aspect-[3/4] mt-8">
                <img src={INTERIOR_2} alt="Riverhouse Suites" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            </div>
            <div>
              <p className="text-[9px] tracking-[0.26em] uppercase font-sans text-muted-foreground mb-4">On-Site Lodging</p>
              <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-6 leading-tight">
                Stay the<br /><span className="italic font-light">whole weekend</span>
              </h2>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-6">
                With 16+ bedrooms across five distinct properties — The Lodge, Riverhouse Suites, The Annex & Bridal Suite, Ohana House, and The Farmhouse — your entire wedding party or hunting group can stay on the estate.
              </p>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-8">
                No hotels. No logistics. Just your people, on the land, for the whole weekend.
              </p>
              <Link
                href="/lodging"
                className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans text-foreground border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors"
              >
                View All Lodging
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Wedding Gallery Strip ───────────────────────────────────────── */}
      <section className="py-20 bg-[oklch(0.13_0.008_66)] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mb-10">
          <p className="text-[9px] tracking-[0.26em] uppercase font-sans text-white/40 mb-3">Weddings at Rivers</p>
          <h2 className="font-serif text-3xl md:text-4xl text-white italic font-light">
            Every detail, considered.
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto px-6 lg:px-10 pb-2 scrollbar-hide">
          {[WEDDING_1, WEDDING_2, WEDDING_3, GROUNDS_3, GROUNDS_1].map((img, i) => (
            <div key={i} className="flex-none w-64 md:w-80 overflow-hidden aspect-[3/4]">
              <img src={img} alt={`Rivers Lodge wedding ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-10">
          <Link href="/weddings" className="inline-flex items-center justify-center px-8 py-3.5 border border-white/30 text-white text-xs tracking-[0.16em] uppercase font-sans hover:bg-white/10 transition-colors">
            Explore Weddings
          </Link>
        </div>
      </section>

      {/* ── Membership CTA ─────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0">
          <img src={FIRE_PIT} alt="Rivers Lodge Hunt Club fire pit" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="text-[9px] tracking-[0.28em] uppercase font-sans text-white/50 mb-5">Membership &amp; Outdoors</p>
          <h2 className="font-serif text-4xl md:text-6xl text-white mb-6 leading-tight">
            Private ground.<br /><span className="italic font-light">Private water.</span>
          </h2>
          <p className="text-base font-sans text-white/70 mb-10 leading-relaxed max-w-xl mx-auto">
            Membership at Rivers Lodge Hunt Club provides access to 10,000+ acres of managed Kansas hunting ground, private fisheries on the Marais des Cygnes, and a community of people who take the land seriously.
          </p>
          <Link
            href="/membership"
            className="inline-flex items-center justify-center px-10 py-4 bg-white text-[oklch(0.15_0.008_66)] text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/90 transition-colors"
          >
            Learn About Membership
          </Link>
        </div>
      </section>

      {/* ── Book a Tour ────────────────────────────────────────────────── */}
      <section className="py-20 bg-background text-center">
        <div className="max-w-lg mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-5 italic font-light">
            Come see it for yourself.
          </h2>
          <p className="text-sm font-sans text-muted-foreground mb-8 leading-relaxed">
            Schedule a private tour of the estate. We'll walk the grounds, show you the spaces, and answer every question.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-10 py-4 bg-foreground text-background text-xs tracking-[0.18em] uppercase font-sans font-medium hover:opacity-90 transition-opacity"
          >
            Book a Tour
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
