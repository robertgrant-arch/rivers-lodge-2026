import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";
import SEOHead, { structuredData } from "@/components/SEOHead";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import FAQAccordion from "@/components/FAQAccordion";


/* ── Images ──────────────────────────────────────────────────────────────── */
const HERO       = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/jPtEuiXynfNedkpV.jpg";
const RIVER      = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/aLRhjpmRWbewKvgx.jpg";
const FIRE_PIT   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/ueUiZmGhmnLKziOQ.jpg";
const LODGE_EXT  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/TdlSWCLWjUxbkCAY.jpg";
const INTERIOR   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/JcuUUmANmAAHItUn.jpg";
const GROUNDS    = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/RNvGygATwGRMluZa.jpg";
const LODGE_INT  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/ydbhfuDouoqRGsqW.jpg";

const SAGE = "oklch(0.58 0.065 145)";

const experiences = [
  {
    label: "Hunt",
    href: "/hunt",
    desc: "Managed whitetail, waterfowl, turkey, and sporting clays on 300 private acres.",
    image: GROUNDS,
  },
  {
    label: "Fish",
    href: "/fish",
    desc: "Five private fisheries — bass, crappie, catfish, and more along the Marais des Cygnes.",
    image: RIVER,
  },
  {
    label: "The Estate",
    href: "/estate",
    desc: "The Lodge, Clubhouse, and river access — your private retreat between seasons.",
    image: INTERIOR,
  },
];

const tiers = [
  {
    name: "Founding Member",
    desc: "Full access to all hunting, fishing, and estate amenities. Priority booking and guest privileges.",
    highlight: true,
  },
  {
    name: "Sporting Member",
    desc: "Hunting and fishing access with seasonal scheduling. Ideal for those who want the experience without full estate access.",
    highlight: false,
  },
  {
    name: "Social Member",
    desc: "Estate and Clubhouse access for dining, events, and recreation. No hunting or fishing included.",
    highlight: false,
  },
];

export default function MembershipLanding() {
  const { data: testimonials } = trpc.cms.getTestimonials.useQuery({ division: "membership", featuredOnly: true } as any);

  return (
    <PublicLayout>
      <SEOHead
  title="Membership & Outdoors"
  description="Exclusive sporting membership at The Rivers Lodge — whitetail deer hunting, waterfowl, bass fishing, and luxury lodge accommodations in Kansas."
  url="/outdoors"
  structuredData={structuredData.membershipClub()}
/>
      <div data-track="membership">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative h-[90vh] min-h-[560px] flex items-end pb-20 overflow-hidden">
          <div className="absolute inset-0">
            <img src={HERO} alt="Rivers Lodge aerial — 300 acres" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/80" />
          </div>
          <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
            <div className="h-px w-10 mb-6" style={{ backgroundColor: SAGE }} />
            <p className="eyebrow text-[oklch(0.94_0.008_78)/55] mb-4">Membership &amp; Outdoors</p>
            <h1
              className="font-serif font-light italic text-white leading-tight mb-6"
              style={{ fontSize: "clamp(2.5rem,6vw,5.5rem)" }}
            >
              Three hundred acres.<br />Entirely private.
            </h1>
            <p className="text-[oklch(0.94_0.008_78)/75] font-sans text-base max-w-lg mb-10 leading-relaxed">
              The Rivers Lodge &amp; Hunt Club offers a limited number of memberships each season. Hunt, fish, and belong to something rare.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/membership" className="btn-primary">
                Explore Membership
              </Link>
              <Link href="/membership#apply" className="btn-ghost">
                Apply Now
              </Link>
            </div>
          </div>
        </section>

        {/* ── Estate Scale Statement ────────────────────────────────────── */}
        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="h-px w-10 mb-6" style={{ backgroundColor: SAGE }} />
                <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-4">The Land</p>
                <h2
                  className="font-serif text-[oklch(0.94_0.008_78)] leading-tight mb-6"
                  style={{ fontSize: "clamp(1.75rem,3.5vw,2.75rem)" }}
                >
                  This is what private land feels like.
                </h2>
                <p className="text-[oklch(0.60_0.015_72)] font-sans text-base leading-relaxed mb-6">
                  The Marais des Cygnes River runs through the heart of the property. Timber, open fields, and managed habitat create some of the finest hunting and fishing in eastern Kansas — all within an hour of Kansas City.
                </p>
                <p className="text-[oklch(0.60_0.015_72)] font-sans text-base leading-relaxed mb-8">
                  Membership at the Rivers Lodge is not a timeshare or a hunting lease. It is a community of like-minded people who share a deep respect for the land and a commitment to conservation.
                </p>
                <Link href="/estate" className="link-arrow">
                  About the Estate
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={RIVER} alt="Marais des Cygnes River" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex flex-col gap-3 pt-8">
                  <div className="aspect-square overflow-hidden">
                    <img src={FIRE_PIT} alt="Estate grounds" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="aspect-square overflow-hidden">
                    <img src={LODGE_INT} alt="Lodge interior" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Experience Types ──────────────────────────────────────────── */}
        <section className="section bg-[oklch(0.115_0.007_64)]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="text-center mb-14">
              <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: SAGE }} />
              <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-3">Member Experiences</p>
              <h2
                className="font-serif text-[oklch(0.94_0.008_78)] leading-tight"
                style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
              >
                Every season, something to look forward to.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {experiences.map((exp) => (
                <Link key={exp.href} href={exp.href} className="group block">
                  <div className="aspect-[4/3] overflow-hidden mb-5">
                    <img
                      src={exp.image}
                      alt={exp.label}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="eyebrow mb-2" style={{ color: SAGE, fontSize: "10px" }}>{exp.label}</p>
                  <p className="text-[oklch(0.60_0.015_72)] font-sans text-sm leading-relaxed">{exp.desc}</p>
                  <p className="link-arrow mt-3 text-[10px]" style={{ color: SAGE }}>
                    Learn More
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Membership Tiers ──────────────────────────────────────────── */}
        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="mb-14">
              <div className="h-px w-10 mb-6" style={{ backgroundColor: SAGE }} />
              <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-3">Membership Tiers</p>
              <h2
                className="font-serif text-[oklch(0.94_0.008_78)] leading-tight max-w-lg"
                style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
              >
                Three levels of access. One community.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`p-8 border flex flex-col ${
                    tier.highlight
                      ? "border-[oklch(0.58_0.065_145)] bg-[oklch(0.115_0.007_64)]"
                      : "border-[oklch(0.22_0.008_64)] bg-[oklch(0.115_0.007_64)]"
                  }`}
                >
                  {tier.highlight && (
                    <p className="eyebrow mb-3" style={{ color: SAGE, fontSize: "10px" }}>Most Popular</p>
                  )}
                  <h3 className="font-serif text-[oklch(0.94_0.008_78)] text-xl mb-4">{tier.name}</h3>
                  <p className="text-[oklch(0.60_0.015_72)] font-sans text-sm leading-relaxed flex-1 mb-6">{tier.desc}</p>
                  <Link href="/membership" className="link-arrow text-[10px]" style={{ color: SAGE }}>
                    Learn More
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats Strip ───────────────────────────────────────────────── */}
        <div className="bg-[oklch(0.115_0.007_64)] border-y border-[oklch(0.22_0.008_64)]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "300+", label: "Private Acres" },
                { value: "5", label: "Private Fisheries" },
                { value: "3", label: "Hunting Pursuits" },
                { value: "60 min", label: "From Kansas City" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-serif text-3xl md:text-4xl leading-none mb-1" style={{ color: SAGE }}>{s.value}</p>
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
                <div className="h-px w-10 mx-auto mb-8" style={{ backgroundColor: SAGE }} />
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

        {/* ── Availability Calendar ─────────────────────────────────────────────── */}
        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="text-center mb-10">
              <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: SAGE }} />
              <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-3">Estate Availability</p>
              <h2 className="font-serif text-[oklch(0.94_0.008_78)] text-3xl md:text-4xl leading-tight">
                Plan your season.
              </h2>
            </div>
            <div className="max-w-2xl mx-auto">
              <AvailabilityCalendar showLegend={true} />
              <p className="text-center mt-6 font-sans text-[oklch(0.55_0.012_70)] text-sm">
                Members book stays through the member portal. Contact us to discuss availability for your preferred dates.
              </p>
              <div className="flex justify-center mt-8">
                <Link href="/contact?type=membership" className="btn-primary">Discuss Availability</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
        <section className="section bg-[oklch(0.115_0.007_64)]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: SAGE }} />
                <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-3">Common Questions</p>
                <h2 className="font-serif text-[oklch(0.94_0.008_78)] text-3xl md:text-4xl leading-tight">
                  Membership, answered.
                </h2>
              </div>
              <FAQAccordion
                accentColor={SAGE}
                items={[
                  {
                    question: "How does membership work?",
                    answer: "Rivers Lodge membership provides exclusive access to the estate for hunting, fishing, and recreational stays throughout the year. Members enjoy priority booking, curated seasonal experiences, and access to all estate amenities including The Lodge, Riverhouse Suites, and Ohana House."
                  },
                  {
                    question: "Is membership by invitation only?",
                    answer: "Yes. Membership is by invitation or referral to maintain the intimate character of the club. We accept a limited number of new members each year. If you are interested, we encourage you to reach out — we will be in touch when a suitable opening arises."
                  },
                  {
                    question: "What hunting opportunities are available?",
                    answer: "The estate offers world-class upland bird hunting (pheasant, quail, and chukar), whitetail deer hunting across 300 acres of managed habitat, and turkey hunting in season. All hunts are guided by our experienced staff."
                  },
                  {
                    question: "What fishing is available on the property?",
                    answer: "The estate features a 20-acre private lake stocked with bass, crappie, and catfish, as well as river access for fly fishing. Members may fish from the dock, kayak, or paddleboard at their leisure."
                  },
                  {
                    question: "Can members bring guests?",
                    answer: "Yes. Members may bring guests for hunts, fishing, and stays, subject to availability and advance notice. Guest fees may apply for certain activities. Please contact us to arrange guest visits."
                  },
                  {
                    question: "How do I book a stay or hunt?",
                    answer: "Members book all stays and activities through the member portal. The portal shows real-time availability, allows you to submit requests, and connects you directly with our concierge team for custom arrangements."
                  },
                  {
                    question: "What is included in the membership fee?",
                    answer: "Membership fees cover access to all estate grounds, guided hunts (within your membership tier), fishing access, and use of all recreational amenities. Lodging, meals, and additional guided experiences are available at member rates."
                  },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── Membership Inquiry CTA ─────────────────────────────────────────────── */}
        <section className="section bg-[oklch(0.115_0.007_64)]">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className="max-w-xl mx-auto text-center">
              <div className="h-px w-10 mx-auto mb-6" style={{ backgroundColor: SAGE }} />
              <h2 className="font-serif text-[oklch(0.94_0.008_78)] text-3xl md:text-4xl leading-tight mb-5">
                Membership is by invitation.
              </h2>
              <p className="text-[oklch(0.60_0.015_72)] font-sans text-sm leading-relaxed mb-8">
                A limited number of memberships are available each season. If you're interested in joining the Rivers Lodge community, we'd like to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/membership#apply" className="btn-primary">
                  Apply for Membership
                </Link>
                <Link href="/membership" className="btn-ghost">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  );
}
