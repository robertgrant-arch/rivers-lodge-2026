import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import SEOHead, { structuredData } from "@/components/SEOHead";


const HERO    = "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg";
const AERIAL  = "/manus-storage/DJI_0017_538feef1.jpg";
const RIVER   = "/manus-storage/6M9A3255_b8f0386f.jpg";
const GROUNDS = "/manus-storage/6M9A3253_319f3a3b.jpg";
const LODGE   = "/manus-storage/974A9398edit_294e71ff.jpg";

function useFadeUp(t = 0.12) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { el.classList.add("visible"); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } }, { threshold: t });
    obs.observe(el); return () => obs.disconnect();
  }, [t]);
  return ref;
}

const benefits = [
  { title: "Hunting Access",       desc: "Full access to 300 acres of managed whitetail, waterfowl, turkey, and upland hunting. Guided hunts available." },
  { title: "Fishing Access",       desc: "The Marais des Cygnes, two private lakes, and river sloughs — year-round fishing for bass, catfish, crappie, and bluegill." },
  { title: "Sporting Clays",       desc: "Private sporting clays course on the property. Open to members and their guests." },
  { title: "Clubhouse Access",     desc: "Full bar, dining, and meeting space available to members throughout the season." },
  { title: "Lodging Priority",     desc: "Members receive priority booking on the Lodge, Riverhouse Suites, and Annex." },
  { title: "Guest Privileges",     desc: "Bring guests to the property for hunting, fishing, and sporting days." },
  { title: "Land Management Input","desc": "Members are part of the conversation about how the land is managed from season to season." },
  { title: "Community",            desc: "A small group of members who share a deep respect for the land and the way it's used." },
];

const tiers = [
  {
    name: "Outdoors Member",
    price: "Contact for pricing",
    desc: "Full hunting and fishing access. Sporting clays. Clubhouse access. Guest privileges.",
    features: ["Hunting — all species", "Fishing — all fisheries", "Sporting clays", "Clubhouse access", "2 guest days/month"],
  },
  {
    name: "Lodge Member",
    price: "Contact for pricing",
    desc: "Everything in Outdoors, plus priority lodging access and expanded guest privileges.",
    features: ["All Outdoors benefits", "Priority lodging booking", "4 guest days/month", "Annual member event"],
    featured: true,
  },
  {
    name: "Founding Member",
    price: "By invitation",
    desc: "Reserved for a small number of founding members. Full access, no restrictions.",
    features: ["All Lodge benefits", "Unlimited guest days", "Land management input", "Founding member recognition"],
  },
];

export default function Membership() {
  const benefitsRef = useFadeUp();
  const tiersRef    = useFadeUp();
  const applyRef    = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
  title="Membership"
  description="Apply for an exclusive sporting membership at The Rivers Lodge & Hunt Club — hunting, fishing, lodging, and a private community in Kansas."
  url="/membership"
  structuredData={structuredData.membershipClub()}
/>
      <div style={{ "--track-accent": "oklch(0.58 0.065 145)" } as React.CSSProperties}>

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Membership at Rivers Lodge" className="w-full h-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.82) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Membership</p>
          <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
            Hunt, fish, and
            <br /><em className="italic font-light">belong.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            Private membership on 300 acres of managed Kansas land. A limited number of memberships are available each season.
          </p>
          <a href="#apply" className="btn-outline" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
            Apply for Membership
          </a>
        </div>
      </section>

      {/* Philosophy */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">
            <div>
              <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">The Philosophy</p>
              <h2 className="font-serif font-light text-warm leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
                Membership is
                <br /><em className="italic">by invitation.</em>
              </h2>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                <p>The Rivers Lodge membership is intentionally small. We limit the number of members to ensure the land is never over-pressured, the experience is never crowded, and the community remains one where everyone knows each other.</p>
                <p>Membership is not just access to the land — it's membership in a community of people who take the land seriously. We look for members who share our values around conservation, ethical hunting, and long-term land stewardship.</p>
              </div>
            </div>
            <div className="aspect-[4/3] overflow-hidden">
              <img src={AERIAL} alt="Aerial view of the estate" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* Pull Quote */}
      <section className="section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-3xl">
            <blockquote className="pull-quote" style={{ borderLeftColor: "oklch(0.58 0.065 145)" }}>
              "We limit membership to protect the land and the experience. The people who belong here know why that matters."
            </blockquote>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section ref={benefitsRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Member Benefits</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              What membership includes.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {benefits.map((b) => (
              <div key={b.title} className="bg-background p-7">
                <div style={{ height: "1px", width: "1.5rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1rem" }} />
                <h3 className="font-serif text-warm text-lg mb-3">{b.title}</h3>
                <p className="font-sans text-muted-brand text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section ref={tiersRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Membership Tiers</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Three levels of access.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
            {tiers.map((tier) => (
              <div key={tier.name} className={`p-8 lg:p-10 flex flex-col ${tier.featured ? "bg-surface" : "bg-background"}`}
                style={tier.featured ? { borderTop: "2px solid oklch(0.58 0.065 145)" } : {}}>
                <p className="eyebrow text-muted-brand mb-3" style={{ fontSize: "10px" }}>{tier.name}</p>
                <p className="font-serif text-warm text-2xl mb-4">{tier.price}</p>
                <p className="font-sans text-muted-brand text-sm leading-relaxed mb-6">{tier.desc}</p>
                <ul className="space-y-2 flex-1 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 font-sans text-sm text-muted-brand">
                      <span style={{ color: "oklch(0.58 0.065 145)", marginTop: "2px", flexShrink: 0 }}>—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="#apply" className="btn-outline self-start text-xs" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
                  Apply
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply */}
      <section id="apply" ref={applyRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-2xl">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Apply for Membership</p>
            <h2 className="font-serif font-light text-warm leading-tight mb-6" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
              Tell us about yourself.
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
              Membership is by invitation. Share a bit about yourself and your interest in the property and we'll be in touch.
            </p>
            <Link href="/contact?type=membership" className="btn-outline" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
              Begin Membership Inquiry
            </Link>
          </div>
        </div>
      </section>

      </div>
    </PublicLayout>
  );
}
