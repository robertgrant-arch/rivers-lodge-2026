import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";

const HERO = "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg";
const AERIAL = "/manus-storage/DJI_0017_538feef1.jpg";
const RIVER = "/manus-storage/Rivers_SEPT2022_-238-1_2bb5d5aa.jpg";
const FIELD = "/manus-storage/Rivers_May2023-8_d07307f4.jpg";
const TIMBER = "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg";

const stats = [
  { value: "300+", label: "Acres", sub: "of managed Kansas landscape" },
  { value: "1", label: "River", sub: "The Marais des Cygnes" },
  { value: "5", label: "Buildings", sub: "event and lodging structures" },
  { value: "16+", label: "Bedrooms", sub: "across all lodging properties" },
  { value: "256", label: "Capacity", sub: "Rivers Barn maximum" },
  { value: "~60", label: "Minutes", sub: "from Kansas City" },
];

const grounds = [
  {
    name: "The Marais des Cygnes",
    desc: "The river that gives the property its name and its character. It moves slowly through the estate — wide, clear, and full of bass and catfish. The River Lawn runs along its bank. The Timber Trail follows it through old-growth trees.",
    img: RIVER,
  },
  {
    name: "Open Fields & Food Plots",
    desc: "Managed food plots and open fields draw whitetail deer throughout the season. The property is tended with purpose — not just for aesthetics, but for the kind of wildlife habitat that produces consistent, ethical hunting.",
    img: FIELD,
  },
  {
    name: "Timber & Trail",
    desc: "Old-growth timber lines the river corridor and frames the Timber Edge ceremony space. The Timber Trail connects the main lodge to the river and provides a quiet morning walk that guests consistently describe as the highlight of their stay.",
    img: TIMBER,
  },
];

export default function Estate() {
  const testimonials = trpc.cms.getTestimonials.useQuery({ division: "general", featuredOnly: true });
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[520px] flex items-end pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="The Rivers Lodge estate" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/80" />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
          <div className="gold-rule" />
          <p className="eyebrow text-[oklch(0.94_0.008_78)/55] mb-4">The Estate</p>
          <h1
            className="font-serif font-light italic text-white leading-tight mb-6"
            style={{ fontSize: "clamp(2.5rem,6vw,5.5rem)" }}
          >
            Three hundred acres.<br />One river.
          </h1>
          <p className="text-[oklch(0.94_0.008_78)/75] font-sans text-base max-w-lg leading-relaxed">
            A private estate on the Marais des Cygnes — an hour south of Kansas City, a world apart from everything else.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[oklch(0.115_0.007_64)] py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-serif text-3xl md:text-4xl text-[oklch(0.90_0.008_80)] leading-none mb-1">{s.value}</div>
                <div className="text-[9px] tracking-[0.20em] uppercase font-sans text-[oklch(0.55_0.015_74)] mb-1">{s.label}</div>
                <div className="text-[10px] font-sans text-[oklch(0.45_0.012_72)] leading-tight">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">The Property</p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-6 leading-tight">
                Built with intention.<br /><span className="italic">Tended with care.</span>
              </h2>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-4">
                Rivers Lodge is a working private estate — not a resort, not a venue catalog. The land has been managed with a specific vision: the water holds fish, the fields hold game, and the spaces hold the kind of gatherings that people talk about for the rest of their lives.
              </p>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-4">
                The estate sits on the Marais des Cygnes — a river that has shaped this part of Kansas for centuries. The name means "marsh of the swans" in French, named by early explorers who found the river teeming with wildlife. That wildlife is still here.
              </p>
              <p className="text-base font-sans text-muted-foreground leading-relaxed">
                Five buildings, 16-plus bedrooms, and a staff that knows the property intimately. Whether you're here for a wedding weekend, a corporate retreat, or the opening weekend of whitetail season — Rivers Lodge is the kind of place you come back to.
              </p>
            </div>
            <div className="overflow-hidden aspect-[4/5]">
              <img src={AERIAL} alt="Aerial view of Rivers Lodge" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* Grounds */}
      <section className="py-20 md:py-28 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-3">The Grounds</p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">The land itself</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {grounds.map((g) => (
              <div key={g.name} className="group">
                <div className="overflow-hidden aspect-[4/3] mb-5">
                  <img src={g.img} alt={g.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <h3 className="font-serif text-xl text-foreground mb-3">{g.name}</h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map / Location */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">Location & Directions</p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-6 leading-tight">
                Close enough to reach.<br /><span className="italic">Far enough to feel it.</span>
              </h2>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-6">
                Rivers Lodge is located in La Cygne, Kansas — approximately 60 minutes south of Kansas City. The drive takes you through the Osage Cuestas, a landscape of rolling limestone ridges and river valleys that signals you've genuinely left the city behind.
              </p>
              <div className="bg-secondary/60 border border-border p-6 mb-8">
                <p className="text-[10px] tracking-[0.20em] uppercase font-sans text-muted-foreground mb-2">Address</p>
                <p className="font-serif text-lg text-foreground">18103 E 2300 Ln</p>
                <p className="font-serif text-lg text-foreground">La Cygne, KS 66040</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8 text-sm font-sans text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">From Kansas City</p>
                  <p>~60 minutes south via US-69</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">From Wichita</p>
                  <p>~2 hours northeast via US-54</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Nearest Airport</p>
                  <p>Kansas City International (MCI)</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Nearest Town</p>
                  <p>La Cygne, KS (5 minutes)</p>
                </div>
              </div>
              <a
                href="https://maps.google.com/?q=18103+E+2300+Ln,+La+Cygne,+KS+66040"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-foreground border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors"
              >
                Open in Google Maps
              </a>
            </div>
            {/* Map placeholder */}
            <div className="bg-secondary/40 border border-border aspect-[4/3] flex items-center justify-center overflow-hidden">
              <iframe
                title="Rivers Lodge Location"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 320 }}
                loading="lazy"
                src="https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=La+Cygne,+Kansas&zoom=10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials from CMS */}
      {testimonials.data && testimonials.data.length > 0 && (
        <section className="py-20 md:py-28 bg-secondary/40">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="mb-12 text-center">
              <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-3">What Guests Say</p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground">Stories from the estate</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.data.slice(0, 3).map((t) => (
                <div key={t.id} className="bg-card border border-border p-8">
                  <p className="text-muted-foreground font-sans text-sm leading-relaxed italic mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="font-serif text-base text-foreground">{t.authorName}</p>
                    {t.authorTitle && <p className="text-xs font-sans text-muted-foreground mt-1">{t.authorTitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Dual CTA */}
      <section className="py-16 bg-[oklch(0.13_0.008_66)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-white/15 p-10">
              <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-white/40 mb-3">Weddings & Events</p>
              <h3 className="font-serif text-2xl text-white mb-3">Plan your event</h3>
              <p className="text-sm font-sans text-white/60 mb-6 leading-relaxed">Begin your wedding or corporate event inquiry and we'll respond within 24 hours.</p>
              <Link href="/contact?type=wedding" className="inline-flex items-center gap-2 text-xs tracking-[0.14em] uppercase font-sans text-white border-b border-white/30 pb-0.5 hover:border-white transition-colors">
                Begin Inquiry
              </Link>
            </div>
            <div className="border border-white/15 p-10">
              <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-white/40 mb-3">Membership & Outdoors</p>
              <h3 className="font-serif text-2xl text-white mb-3">Join the club</h3>
              <p className="text-sm font-sans text-white/60 mb-6 leading-relaxed">Explore membership privileges and apply for access to 300 acres of private hunting and fishing.</p>
              <Link href="/membership" className="inline-flex items-center gap-2 text-xs tracking-[0.14em] uppercase font-sans text-white border-b border-white/30 pb-0.5 hover:border-white transition-colors">
                Explore Membership
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
