import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";

/* ── Images ──────────────────────────────────────────────────────────────── */
const HERO       = "/manus-storage/UebeleinWed557_b0b3b0ff.jpg";
const BARN_INT   = "/manus-storage/6M9A3239_d4c999f4.jpg";
const CEREMONY   = "/manus-storage/UebeleinWed335_e6a9084a.jpg";
const RECEPTION  = "/manus-storage/UebeleinWed629_ebea0f99.jpg";
const LODGE_EXT  = "/manus-storage/974A9398edit_294e71ff.jpg";
const INTERIOR   = "/manus-storage/974A8419edit_f37de96e.jpg";
const GROUNDS    = "/manus-storage/20200515-3M4A7947_af6607de.jpg";

const BLUSH = "oklch(0.70 0.060 50)";

const eventTypes = [
  {
    label: "Weddings",
    href: "/weddings",
    desc: "Destination wedding weekends — from intimate ceremonies to grand receptions for 300.",
    image: CEREMONY,
  },
  {
    label: "Corporate Outings",
    href: "/corporate",
    desc: "Retreats, team building, and client entertainment on a private estate.",
    image: GROUNDS,
  },
  {
    label: "Private Events",
    href: "/contact?type=event",
    desc: "Milestone celebrations, family reunions, and exclusive private gatherings.",
    image: RECEPTION,
  },
];

const venues = [
  { name: "Rivers Barn", capacity: "Up to 300", type: "Dinner & Reception", image: BARN_INT },
  { name: "River Lawn", capacity: "Up to 200", type: "Ceremony & Outdoor", image: GROUNDS },
  { name: "The Clubhouse", capacity: "Up to 60", type: "Dining & Meeting", image: INTERIOR },
  { name: "The Lodge", capacity: "Up to 20", type: "Private Dining & Lodging", image: LODGE_EXT },
];

export default function WeddingsLanding() {
  const { data: testimonials } = trpc.cms.getTestimonials.useQuery({ division: "weddings", featuredOnly: true } as any);

  return (
    <PublicLayout>
      <div data-track="weddings">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative h-[90vh] min-h-[560px] flex items-end pb-20 overflow-hidden">
          <div className="absolute inset-0">
            <img src={HERO} alt="Wedding at Rivers Lodge" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/80" />
          </div>
          <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
            <div className="h-px w-10 mb-6" style={{ backgroundColor: BLUSH }} />
            <p className="eyebrow text-[oklch(0.94_0.008_78)/55] mb-4">Weddings &amp; Events</p>
            <h1
              className="font-serif font-light italic text-white leading-tight mb-6"
              style={{ fontSize: "clamp(2.5rem,6vw,5.5rem)" }}
            >
              Where every celebration<br />is exclusively yours.
            </h1>
            <p className="text-[oklch(0.94_0.008_78)/75] font-sans text-base max-w-lg mb-10 leading-relaxed">
              The Rivers Lodge &amp; Hunt Club is a private estate — when you book, the entire property is yours. No other groups, no shared spaces, no distractions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/weddings" className="btn-primary">
                Explore Weddings
              </Link>
              <Link href="/contact?type=wedding" className="btn-ghost">
                Request a Tour
              </Link>
            </div>
          </div>
        </section>

        {/* ── Intro ─────────────────────────────────────────────────────── */}
        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="h-px w-10 mb-6" style={{ backgroundColor: BLUSH }} />
                <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-4">The Experience</p>
                <h2
                  className="font-serif text-[oklch(0.94_0.008_78)] leading-tight mb-6"
                  style={{ fontSize: "clamp(1.75rem,3.5vw,2.75rem)" }}
                >
                  An estate wedding unlike any other in the Midwest.
                </h2>
                <p className="text-[oklch(0.60_0.015_72)] font-sans text-base leading-relaxed mb-6">
                  Sixty minutes from Kansas City, the Rivers Lodge offers a complete destination wedding experience. Your guests arrive to 300 acres of Kansas landscape — river, woodland, and open sky — with no one else in sight.
                </p>
                <p className="text-[oklch(0.60_0.015_72)] font-sans text-base leading-relaxed mb-8">
                  The estate accommodates your entire wedding party on-site. Ceremony on the River Lawn. Reception in the Rivers Barn. After-party at the Clubhouse. Breakfast the next morning at The Lodge.
                </p>
                <Link href="/weddings" className="link-arrow">
                  See Wedding Packages
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={CEREMONY} alt="Outdoor ceremony" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-3 pt-8">
                  <div className="aspect-square overflow-hidden">
                    <img src={RECEPTION} alt="Reception tables" className="w-full h-full object-cover" />
                  </div>
                  <div className="aspect-square overflow-hidden">
                    <img src={BARN_INT} alt="Rivers Barn interior" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Event Types ───────────────────────────────────────────────── */}
        <section className="section bg-[oklch(0.115_0.007_64)]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="text-center mb-14">
              <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: BLUSH }} />
              <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-3">Event Types</p>
              <h2
                className="font-serif text-[oklch(0.94_0.008_78)] leading-tight"
                style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
              >
                Every occasion, entirely private.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {eventTypes.map((et) => (
                <Link key={et.href} href={et.href} className="group block">
                  <div className="aspect-[4/3] overflow-hidden mb-5">
                    <img
                      src={et.image}
                      alt={et.label}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="eyebrow mb-2" style={{ color: BLUSH, fontSize: "10px" }}>{et.label}</p>
                  <p className="text-[oklch(0.60_0.015_72)] font-sans text-sm leading-relaxed">{et.desc}</p>
                  <p className="link-arrow mt-3 text-[10px]">
                    Learn More
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Venue Highlights ──────────────────────────────────────────── */}
        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="mb-14">
              <div className="h-px w-10 mb-6" style={{ backgroundColor: BLUSH }} />
              <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-3">Venue Spaces</p>
              <h2
                className="font-serif text-[oklch(0.94_0.008_78)] leading-tight max-w-lg"
                style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
              >
                Four distinct spaces. One private estate.
              </h2>
            </div>
            <div className="scroll-strip pb-4">
              {venues.map((v) => (
                <div key={v.name} className="w-[300px] md:w-[360px] shrink-0">
                  <div className="aspect-[4/3] overflow-hidden mb-4">
                    <img src={v.image} alt={v.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                  <p className="text-[oklch(0.94_0.008_78)] font-sans text-sm font-medium mb-1">{v.name}</p>
                  <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-1" style={{ fontSize: "10px" }}>{v.type}</p>
                  <p className="text-[oklch(0.55_0.012_70)] font-sans text-xs">{v.capacity}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/lodging" className="link-arrow">
                View All Spaces &amp; Lodging
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Capacity Data Strip ───────────────────────────────────────── */}
        <div className="bg-[oklch(0.115_0.007_64)] border-y border-[oklch(0.22_0.008_64)]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "300", label: "Max Reception Guests" },
                { value: "16+", label: "On-Site Bedrooms" },
                { value: "5", label: "Distinct Venue Spaces" },
                { value: "1hr", label: "From Kansas City" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-serif text-3xl md:text-4xl leading-none mb-1" style={{ color: BLUSH }}>{s.value}</p>
                  <p className="eyebrow text-[oklch(0.55_0.012_70)]" style={{ fontSize: "10px" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Testimonial ───────────────────────────────────────────────── */}
        {testimonials && testimonials.length > 0 && (
          <section className="section bg-background">
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
              <div className="max-w-2xl mx-auto text-center">
                <div className="h-px w-10 mx-auto mb-8" style={{ backgroundColor: BLUSH }} />
                <blockquote className="font-serif italic text-[oklch(0.94_0.008_78)] leading-relaxed mb-6" style={{ fontSize: "clamp(1.25rem,2.5vw,1.75rem)" }}>
                  "{testimonials[0].quote}"
                </blockquote>
                <p className="eyebrow text-[oklch(0.55_0.012_70)]" style={{ fontSize: "10px" }}>
                  {testimonials[0].authorName}
                  {testimonials[0].authorTitle ? ` — ${testimonials[0].authorTitle}` : ""}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Inquiry CTA ───────────────────────────────────────────────── */}
        <section className="section bg-[oklch(0.115_0.007_64)]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="max-w-xl mx-auto text-center">
              <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: BLUSH }} />
              <h2 className="font-serif text-[oklch(0.94_0.008_78)] text-3xl md:text-4xl leading-tight mb-5">
                Ready to start planning?
              </h2>
              <p className="text-[oklch(0.60_0.015_72)] font-sans text-sm leading-relaxed mb-8">
                We work with a limited number of events each year. Contact us to check availability and schedule a private tour of the estate.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact?type=wedding" className="btn-primary">
                  Request a Tour
                </Link>
                <Link href="/weddings" className="btn-ghost">
                  View Wedding Details
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  );
}
