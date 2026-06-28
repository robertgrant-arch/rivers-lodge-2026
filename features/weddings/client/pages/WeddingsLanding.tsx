import { Link } from "wouter";
import PublicLayout from "@features/public-pages/components/PublicLayout";
import { trpc } from '@shared/lib/trpc';
import SEOHead, { structuredData } from '@shared/components/SEOHead';
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import FAQAccordion from "@/components/FAQAccordion";
import Picture from "@shared/components/Picture";


/* ── Images ──────────────────────────────────────────────────────────────── */
const HERO       = "/img/Ohana%20Dock.jpg";
const BARN_INT   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/ooPGTJSHasHosVDF.jpg";
const CEREMONY   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/NuVfykZEURKLacpv.jpg";
const RECEPTION  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/SSdcPuhkHXDvzhtk.jpg";
const LODGE_EXT  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/TdlSWCLWjUxbkCAY.jpg";
const INTERIOR   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/JcuUUmANmAAHItUn.jpg";
const GROUNDS    = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/JbMIltWvczRWbDaw.jpg";

const BLUSH = "#9B4D19";

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
      <SEOHead
  title="Weddings & Events"
  description="Plan your wedding or private event at The Rivers Lodge — a stunning private estate in Kansas with ceremony lawns, barn, and clubhouse for up to 250 guests."
  url="/events"
  structuredData={structuredData.weddingVenue()}
/>
      <div data-track="weddings">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative h-[90vh] min-h-[560px] flex items-end pb-20 overflow-hidden">
          <div className="absolute inset-0">
            <Picture
              src={HERO}
              alt="The Ohana dock at Rivers Lodge"
              className="absolute inset-0 w-full h-full"
              imgClassName="absolute inset-0 w-full h-full object-cover"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              width={1920}
              height={1080}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/80" />
          </div>
          <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
            <div className="h-px w-10 mb-6" style={{ backgroundColor: BLUSH }} />
            <p className="eyebrow text-[#E0D3BD/55] mb-4">Weddings &amp; Events</p>
            <h1
              className="font-serif font-light italic text-white leading-tight mb-6"
              style={{ fontSize: "clamp(2.5rem,6vw,5.5rem)" }}
            >
              Where every celebration<br />is exclusively yours.
            </h1>
            <p className="text-[#E0D3BD/75] font-sans text-base max-w-lg mb-10 leading-relaxed">
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
                <p className="eyebrow text-[#908B82] mb-4">The Experience</p>
                <h2
                  className="font-serif text-[#E0D3BD] leading-tight mb-6"
                  style={{ fontSize: "clamp(1.75rem,3.5vw,2.75rem)" }}
                >
                  An estate devoted to one couple at a time.
                </h2>
                <p className="text-[#BABAAE] font-sans text-base leading-relaxed mb-6">
                  The Rivers Lodge offers a complete destination wedding experience across 300 acres of Kansas landscape — river, woodland, and open sky. Your guests arrive to a private estate prepared entirely for them, with no one else in sight.
                </p>
                <p className="text-[#BABAAE] font-sans text-base leading-relaxed mb-8">
                  The estate accommodates your entire wedding party on-site. Ceremony on the River Lawn. Reception in the Rivers Barn. After-party at the Clubhouse. Breakfast the next morning at The Lodge.
                </p>
                <Link href="/weddings" className="link-arrow">
                  See Wedding Packages
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={CEREMONY} alt="Outdoor ceremony" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex flex-col gap-3 pt-8">
                  <div className="aspect-square overflow-hidden">
                    <img src={RECEPTION} alt="Reception tables" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="aspect-square overflow-hidden">
                    <img src={BARN_INT} alt="Rivers Barn interior" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Event Types ───────────────────────────────────────────────── */}
        <section className="section bg-[#363330]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="text-center mb-14">
              <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: BLUSH }} />
              <p className="eyebrow text-[#908B82] mb-3">Event Types</p>
              <h2
                className="font-serif text-[#E0D3BD] leading-tight"
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
                  <p className="text-[#BABAAE] font-sans text-sm leading-relaxed">{et.desc}</p>
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
              <p className="eyebrow text-[#908B82] mb-3">Venue Spaces</p>
              <h2
                className="font-serif text-[#E0D3BD] leading-tight max-w-lg"
                style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
              >
                Four distinct spaces. One private estate.
              </h2>
            </div>
            <div className="scroll-strip pb-4">
              {venues.map((v) => (
                <div key={v.name} className="w-[300px] md:w-[360px] shrink-0">
                  <div className="aspect-[4/3] overflow-hidden mb-4">
                    <img src={v.image} alt={v.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                  <p className="text-[#E0D3BD] font-sans text-sm font-medium mb-1">{v.name}</p>
                  <p className="eyebrow text-[#908B82] mb-1" style={{ fontSize: "10px" }}>{v.type}</p>
                  <p className="text-[#908B82] font-sans text-xs">{v.capacity}</p>
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
        <div className="bg-[#363330] border-y border-[#57544E]">
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
                  <p className="eyebrow text-[#908B82]" style={{ fontSize: "10px" }}>{s.label}</p>
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
                <blockquote className="font-serif italic text-[#E0D3BD] leading-relaxed mb-6" style={{ fontSize: "clamp(1.25rem,2.5vw,1.75rem)" }}>
                  "{testimonials[0].quote}"
                </blockquote>
                <p className="eyebrow text-[#908B82]" style={{ fontSize: "10px" }}>
                  {testimonials[0].authorName}
                  {testimonials[0].authorTitle ? ` — ${testimonials[0].authorTitle}` : ""}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Availability Calendar ──────────────────────────────────────── */}
        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="text-center mb-10">
              <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: BLUSH }} />
              <p className="eyebrow text-[#908B82] mb-3">Check Availability</p>
              <h2 className="font-serif text-[#E0D3BD] text-3xl md:text-4xl leading-tight">
                Reserve your date.
              </h2>
            </div>
            <div className="max-w-2xl mx-auto">
              <AvailabilityCalendar showLegend={true} />
              <p className="text-center mt-6 font-sans text-[#908B82] text-sm">
                Dates shown as unavailable are already reserved. Contact us to confirm your date.
              </p>
              <div className="flex justify-center mt-8">
                <Link href="/contact?type=wedding" className="btn-primary">Inquire About Your Date</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="text-center mb-14">
              <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: BLUSH }} />
              <p className="eyebrow text-[#908B82] mb-3">How It Works</p>
              <h2 className="font-serif text-[#E0D3BD] text-3xl md:text-4xl leading-tight">
                From first inquiry to your perfect day.
              </h2>
            </div>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/8 hidden lg:block" />
              <div className="flex flex-col gap-0">
                {[
                  { step: "01", title: "Reach Out", desc: "Submit an inquiry or call us directly. We'll confirm availability for your preferred dates and schedule a private estate tour.", side: "left" },
                  { step: "02", title: "Estate Tour", desc: "Walk the grounds, see the spaces, and meet our team. Most couples book within days of their first visit.", side: "right" },
                  { step: "03", title: "Design Your Weekend", desc: "We work with you to design every detail — venue layout, lodging assignments, vendor coordination, and the weekend-long flow.", side: "left" },
                  { step: "04", title: "Confirm & Secure", desc: "A signed agreement and deposit secures your date. We limit the number of weddings per year to ensure every event receives our full focus.", side: "right" },
                  { step: "05", title: "Your Perfect Day", desc: "Arrive to a fully prepared estate. Our on-site team handles setup, coordination, and every detail so you can be fully present.", side: "left" },
                ].map((item, i) => (
                  <div key={item.step} className={`relative grid grid-cols-1 lg:grid-cols-2 gap-0 ${
                    i % 2 === 0 ? "" : "lg:direction-rtl"
                  }`}>
                    <div className={`py-10 px-8 lg:px-16 ${
                      item.side === "left" ? "lg:text-right" : "lg:col-start-2"
                    }`}>
                      <div className="inline-flex items-center gap-3 mb-4">
                        <span className="font-serif text-5xl leading-none" style={{ color: BLUSH }}>{item.step}</span>
                      </div>
                      <h3 className="font-serif text-2xl text-[#E0D3BD] mb-3">{item.title}</h3>
                      <p className={`font-sans text-sm text-[#BABAAE] leading-relaxed max-w-sm ${
                        item.side === "left" ? "ml-auto" : ""
                      }`}>{item.desc}</p>
                    </div>
                    {/* Center dot */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-background hidden lg:block" style={{ borderColor: BLUSH }} />
                    {item.side === "right" && <div className="hidden lg:block" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────────────────── */}
        <section className="section bg-[#363330]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: BLUSH }} />
                <p className="eyebrow text-[#908B82] mb-3">Common Questions</p>
                <h2 className="font-serif text-[#E0D3BD] text-3xl md:text-4xl leading-tight">
                  Everything you need to know.
                </h2>
              </div>
              <FAQAccordion
                accentColor={BLUSH}
                items={[
                  {
                    question: "How many weddings do you host per year?",
                    answer: "We host a very limited number of weddings each year to ensure every couple receives our full attention and the estate is presented at its finest. This exclusivity is central to the Rivers Lodge experience."
                  },
                  {
                    question: "What is the guest capacity?",
                    answer: "The Rivers Barn accommodates up to 256 guests for seated receptions, with two patios, an indoor/outdoor bar, and luxury bathrooms. Ceremony spaces on the River Lawn and Timber Edge can accommodate similar numbers. We work with you to design the perfect layout."
                  },
                  {
                    question: "Do you offer exclusive-use buyouts?",
                    answer: "Yes. Many of our wedding clients choose to reserve the entire estate — including The Lodge, Riverhouse Suites, Ohana House, and the Annex & Bridal Suite — for complete privacy and an immersive experience for you and your guests."
                  },
                  {
                    question: "Are outside vendors allowed?",
                    answer: "We maintain a curated list of preferred vendors who know the estate well. We are happy to work with your chosen vendors too — we simply ask that all vendors be approved in advance to ensure a seamless experience."
                  },
                  {
                    question: "What is included in the venue fee?",
                    answer: "The venue fee includes exclusive use of your selected spaces, on-site coordination, setup and breakdown, tables and chairs, and access to estate grounds for photography. Catering, floral, and additional services are arranged separately through our preferred vendor network."
                  },
                  {
                    question: "How far in advance should we book?",
                    answer: "Peak dates — particularly spring and fall weekends — are typically reserved 12 to 18 months in advance. We recommend reaching out as early as possible to check availability for your preferred date."
                  },
                  {
                    question: "Do you offer site tours?",
                    answer: "Absolutely. We invite all prospective couples to schedule a private tour of the estate. Seeing the property in person is the best way to understand the scale, beauty, and possibilities of Rivers Lodge. Contact us to arrange a visit."
                  },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── Inquiry CTA ───────────────────────────────────────────────── */}
        <section className="section bg-[#363330]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="max-w-xl mx-auto text-center">
              <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: BLUSH }} />
              <h2 className="font-serif text-[#E0D3BD] text-3xl md:text-4xl leading-tight mb-5">
                Ready to start planning?
              </h2>
              <p className="text-[#BABAAE] font-sans text-sm leading-relaxed mb-8">
                We host a limited number of events each year to ensure every celebration receives the full attention of the estate. Contact us to check availability for your date and arrange a private tour.
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
