import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";

const HERO = "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg";
const MEETING = "/manus-storage/3C0A0304_cb66bc23.jpg";
const OUTDOOR = "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg";

const packages = [
  {
    name: "Executive Retreat",
    desc: "Full estate buyout for leadership teams. Exclusive access to all lodging, event spaces, and grounds. Curated dining, guided outdoor experiences, and full-service staff.",
    includes: ["Full estate exclusive access", "All lodging buildings", "Curated dining & bar", "Guided hunt or fish option", "Meeting room setup", "AV equipment"],
  },
  {
    name: "Corporate Outing",
    desc: "A day or weekend event for teams of any size. Sporting clays, guided fishing, or a full barn dinner — Rivers Lodge provides the setting and the experience.",
    includes: ["Rivers Barn or Clubhouse", "Outdoor activity options", "Catering packages", "Bar service", "Flexible scheduling", "Up to 256 guests"],
  },
  {
    name: "Team Offsite",
    desc: "A focused working retreat with breakout sessions, meals, and evening recreation. The perfect balance of productivity and genuine departure from the office.",
    includes: ["Meeting space", "Breakout areas", "Overnight lodging", "Meals & coffee service", "Evening recreation", "Private grounds"],
  },
];

export default function Corporate() {
  const { data: cmsPackages } = trpc.cms.getPackages.useQuery({ division: "corporate" });

  const corporatePackages = (cmsPackages && cmsPackages.length > 0)
    ? cmsPackages.map((pkg) => ({
        name: pkg.name,
        desc: pkg.description ?? pkg.tagline ?? "",
        includes: Array.isArray(pkg.includes) ? (pkg.includes as string[]) : [],
      }))
    : packages;

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative h-[75vh] min-h-[480px] flex items-end pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Corporate events at Rivers Lodge" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/72" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
          <p className="text-[10px] tracking-[0.28em] uppercase font-sans text-white/60 mb-4">Corporate Outings & Events</p>
          <h1 className="font-serif text-5xl md:text-7xl text-white leading-[0.95] mb-5" style={{ textShadow: "0 2px 30px rgba(0,0,0,0.35)" }}>
            Elevate your<br /><span className="italic font-light">next event.</span>
          </h1>
          <p className="text-base font-sans text-white/80 max-w-lg mb-8 leading-relaxed">
            From executive retreats to company outings, Rivers Lodge provides a setting that no hotel ballroom can replicate.
          </p>
          <Link href="/contact?type=corporate" className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[oklch(0.15_0.008_66)] text-xs tracking-[0.16em] uppercase font-sans font-medium hover:bg-white/90 transition-colors">
            Request a Proposal
          </Link>
        </div>
      </section>

      {/* Intro */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">Why Rivers Lodge</p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-6 leading-tight">
                Not a hotel.<br /><span className="italic">A private estate.</span>
              </h2>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-4">
                Rivers Lodge offers something corporate venues cannot: genuine departure. Your team arrives at a working private estate — 300 acres, a river, five buildings, and a staff that makes the experience seamless.
              </p>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-8">
                Meeting spaces, overnight lodging, curated dining experiences, and a full bar. Guided sporting clays, fishing, or hunting for the evening recreation. Everything you need for a successful event — and an experience people will talk about.
              </p>
              <Link href="/contact?type=corporate" className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-foreground border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors">
                Request a Proposal
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="overflow-hidden aspect-[3/4]">
                <img src={MEETING} alt="Meeting at Rivers Lodge" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="overflow-hidden aspect-[3/4] mt-8">
                <img src={OUTDOOR} alt="Outdoor experience" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 md:py-28 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-3">Event Packages</p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">Built around your group</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {corporatePackages.map((pkg) => (
              <div key={pkg.name} className="bg-card border border-border p-8">
                <h3 className="font-serif text-2xl text-foreground mb-3">{pkg.name}</h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed mb-6">{pkg.desc}</p>
                <div className="flex flex-col gap-2 mb-6">
                  {pkg.includes.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
                <Link href="/contact?type=corporate" className="text-xs tracking-[0.14em] uppercase font-sans font-medium text-foreground border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors">
                  Inquire
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[oklch(0.13_0.008_66)] text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-5 italic font-light">
            Let's plan your event.
          </h2>
          <p className="text-sm font-sans text-white/60 mb-8 leading-relaxed">
            Tell us about your group, your dates, and what you're imagining. We'll respond within 24 hours with a custom proposal.
          </p>
          <Link href="/contact?type=corporate" className="inline-flex items-center justify-center px-10 py-4 bg-white text-[oklch(0.15_0.008_66)] text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/90 transition-colors">
            Request a Proposal
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
