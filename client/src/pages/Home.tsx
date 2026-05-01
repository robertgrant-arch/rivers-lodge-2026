import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const HERO_IMG = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&auto=format&fit=crop";
const WEDDINGS_IMG = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=80&auto=format&fit=crop";
const MEMBERSHIP_IMG = "https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80&auto=format&fit=crop";
const BARN_IMG = "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80&auto=format&fit=crop";
const RIVER_IMG = "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80&auto=format&fit=crop";
const LODGE_IMG = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80&auto=format&fit=crop";

const stats = [
  { value: "300+", label: "Acres" },
  { value: "1", label: "River" },
  { value: "5", label: "Buildings" },
  { value: "16+", label: "Bedrooms" },
  { value: "256", label: "Barn Capacity" },
  { value: "60", label: "Min from KC" },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[600px] flex items-end pb-20 md:pb-28 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="The Rivers Lodge estate at dawn"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/75" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
          <p className="text-[10px] tracking-[0.28em] uppercase font-sans text-white/60 mb-4">
            La Cygne, Kansas
          </p>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white leading-[0.95] mb-6" style={{ textShadow: "0 2px 40px rgba(0,0,0,0.4)" }}>
            Rivers Lodge<br />
            <span className="italic font-light">& Hunt Club</span>
          </h1>
          <p className="text-base md:text-lg font-sans font-light text-white/80 max-w-md mb-10 leading-relaxed">
            A private estate on the Marais des Cygnes. A destination wedding venue one hour from Kansas City — and a private membership club for those who hunt, fish, and live on the land.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/weddings"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[oklch(0.15_0.008_66)] text-xs tracking-[0.16em] uppercase font-sans font-medium hover:bg-white/90 transition-colors"
            >
              Weddings & Events
            </Link>
            <Link
              href="/membership"
              className="inline-flex items-center justify-center px-8 py-3.5 border border-white text-white text-xs tracking-[0.16em] uppercase font-sans font-medium hover:bg-white/10 transition-colors"
            >
              Membership & Outdoors
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40">
          <span className="text-[9px] tracking-[0.22em] uppercase font-sans">Scroll</span>
          <div className="w-px h-8 bg-white/30 animate-pulse" />
        </div>
      </section>

      {/* ── Stats Strip ──────────────────────────────────────────────────── */}
      <section className="bg-[oklch(0.13_0.008_66)] py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 md:gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-serif text-2xl md:text-3xl text-[oklch(0.90_0.008_80)] leading-none mb-1">{s.value}</div>
                <div className="text-[9px] tracking-[0.20em] uppercase font-sans text-[oklch(0.55_0.015_74)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dual Track Fork ──────────────────────────────────────────────── */}
      <section className="py-0">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[70vh]">
          {/* Weddings Track */}
          <Link href="/weddings" className="group relative overflow-hidden flex items-end cursor-pointer">
            <div className="absolute inset-0">
              <img
                src={WEDDINGS_IMG}
                alt="Weddings at Rivers Lodge"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 group-hover:from-black/70 transition-all duration-500" />
            </div>
            <div className="relative z-10 p-10 md:p-14 w-full">
              <p className="text-[9px] tracking-[0.26em] uppercase font-sans text-white/50 mb-3">Track One</p>
              <h2 className="font-serif text-4xl md:text-5xl text-white leading-tight mb-3">
                Weddings<br /><span className="italic font-light">& Events</span>
              </h2>
              <p className="text-sm font-sans text-white/70 max-w-xs leading-relaxed mb-6">
                A distinctive Kansas venue one hour from Kansas City. The barn, the river, the land — entirely yours for the weekend. Limited dates. Unlimited attention.
              </p>
              <span className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans text-white border-b border-white/40 pb-0.5 group-hover:border-white transition-colors">
                Explore Weddings & Events
              </span>
            </div>
          </Link>

          {/* Membership Track */}
          <Link href="/membership" className="group relative overflow-hidden flex items-end cursor-pointer">
            <div className="absolute inset-0">
              <img
                src={MEMBERSHIP_IMG}
                alt="Membership & Outdoors at Rivers Lodge"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15 group-hover:from-black/75 transition-all duration-500" />
            </div>
            <div className="relative z-10 p-10 md:p-14 w-full">
              <p className="text-[9px] tracking-[0.26em] uppercase font-sans text-white/50 mb-3">Track Two</p>
              <h2 className="font-serif text-4xl md:text-5xl text-white leading-tight mb-3">
                Membership<br /><span className="italic font-light">& Outdoors</span>
              </h2>
              <p className="text-sm font-sans text-white/70 max-w-xs leading-relaxed mb-6">
                10,000+ acres of managed Kansas hunting ground. Guided hunts. Private fisheries. A multi-generational membership built on conservation and tradition.
              </p>
              <span className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans text-white border-b border-white/40 pb-0.5 group-hover:border-white transition-colors">
                Explore Membership
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Estate Intro ─────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">The Marais des Cygnes</p>
              <h2 className="font-serif text-4xl md:text-5xl text-foreground leading-tight mb-6">
                Three hundred acres.<br />
                <span className="italic">One river. Singular moments.</span>
              </h2>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-5">
                Rivers Lodge is a working private estate — not a resort, not a venue catalog. The land has been tended with purpose: the water holds fish, the fields hold game, and the spaces hold the kind of gatherings that people talk about for the rest of their lives.
              </p>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-8">
                The estate sits roughly an hour south of Kansas City, close enough to reach on a Friday evening and far enough that it feels like a genuine departure.
              </p>
              <Link
                href="/estate"
                className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-foreground border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors"
              >
                Explore the Estate
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="overflow-hidden aspect-[3/4]">
                <img src={BARN_IMG} alt="Rivers Barn" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="overflow-hidden aspect-[3/4] mt-8">
                <img src={RIVER_IMG} alt="The Marais des Cygnes" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Spaces Preview ───────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-3">The Property</p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground">Spaces that shape the experience</h2>
            </div>
            <Link href="/lodging" className="hidden md:inline-flex text-xs tracking-[0.14em] uppercase font-sans text-muted-foreground hover:text-foreground transition-colors border-b border-current pb-0.5">
              All Spaces
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Rivers Barn", desc: "Designed by a KC architect. 256 guests. Floor-to-ceiling windows, two fireplaces, indoor/outdoor bar.", img: BARN_IMG, href: "/venues/rivers-barn" },
              { name: "The Lodge", desc: "5,200 sq ft. 4 bedrooms. Full kitchen, heated floors, the bar with a canoe on the ceiling.", img: LODGE_IMG, href: "/lodging/the-lodge" },
              { name: "The River", desc: "The Marais des Cygnes moves slowly through 300 acres of timber, fields, and private land.", img: RIVER_IMG, href: "/estate" },
            ].map((space) => (
              <Link key={space.name} href={space.href} className="group block">
                <div className="overflow-hidden aspect-[4/3] mb-4">
                  <img
                    src={space.img}
                    alt={space.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <h3 className="font-serif text-xl text-foreground mb-2">{space.name}</h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">{space.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Strip ────────────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img src={LODGE_IMG} alt="Rivers Lodge" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <p className="text-[10px] tracking-[0.28em] uppercase font-sans text-white/50 mb-4">The best way to understand Rivers Lodge</p>
          <h2 className="font-serif text-4xl md:text-5xl text-white mb-6 italic font-light">
            Come walk the land.
          </h2>
          <p className="text-base font-sans text-white/70 max-w-lg mx-auto mb-10 leading-relaxed">
            We offer private tours of the estate, the venues, and the grounds — no pressure, no presentation. Just the land.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-10 py-4 bg-white text-[oklch(0.15_0.008_66)] text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/90 transition-colors"
          >
            Book a Private Tour
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
