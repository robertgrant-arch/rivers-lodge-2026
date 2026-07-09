import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "../components/PublicLayout";
import SEOHead from '@shared/components/SEOHead';
import { HuntFishAvailabilityCalendar } from "../../trips/client/public";


const HERO    = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/ueUiZmGhmnLKziOQ.jpg";
const FIELD   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/aLRhjpmRWbewKvgx.jpg";
const TIMBER  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/ydbhfuDouoqRGsqW.jpg";
const AERIAL  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/jPtEuiXynfNedkpV.jpg";
const GROUNDS = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/RNvGygATwGRMluZa.jpg";
const LODGE   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/TdlSWCLWjUxbkCAY.jpg";

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

const pursuits = [
  { title: "Whitetail Deer",   desc: "Managed trophy whitetail hunting across 300 acres of timber, food plots, and river bottom. Elevated stands and ground blinds positioned throughout the property.", img: FIELD },
  { title: "Waterfowl",        desc: "Duck and goose hunting on the Marais des Cygnes and managed wetlands. Early season teal through late-season mallards.", img: TIMBER },
  { title: "Turkey",           desc: "Spring and fall turkey hunting in the timber corridor and open fields. The river bottom holds birds year-round.", img: AERIAL },
  { title: "Sporting Clays",   desc: "A private sporting clays course on the property. Available to members and event guests for guided instruction or casual rounds.", img: GROUNDS },
  { title: "Small Game",       desc: "Quail, pheasant, and rabbit hunting in the upland fields and native grass areas. Guided hunts available with trained dogs.", img: LODGE },
];


export default function Hunt() {
  const pursuitsRef = useFadeUp();
  const ctaRef      = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
  title="Hunt"
  description="World-class whitetail deer hunting, waterfowl, and upland bird hunting on 1,800 private acres in La Cygne, Kansas. Exclusive member access."
  url="/hunt"
/>
      <div style={{ "--track-accent": "#6B7250" } as React.CSSProperties}>

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Hunting at Rivers Lodge" className="w-full h-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.82) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: "#6B7250", marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Hunt</p>
          <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
            Private hunting on
            <br /><em className="italic font-light">managed Kansas land.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            Thousands of acres of whitetail timber, managed food plots, waterfowl wetlands, and upland fields. Available exclusively to members.
          </p>
          <Link href="/membership" className="btn-outline" style={{ borderColor: "#6B7250", color: "#6B7250" }}>
            Explore Membership
          </Link>
        </div>
      </section>

      {/* Intro */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">
            <div>
              <div style={{ height: "1px", width: "2rem", backgroundColor: "#6B7250", marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">The Land</p>
              <h2 className="font-serif font-light text-warm leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
                Managed with purpose.
                <br /><em className="italic">Hunted with respect.</em>
              </h2>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                <p>The Rivers Lodge hunting program is built on land management first. Food plots, timber management, and water management are maintained year-round to produce consistent, ethical hunting — not just for one season, but for decades.</p>
                <p>Members have access to the full 300 acres. Stands and blinds are positioned throughout the property and assigned by the hunt manager. Guided hunts are available for members who want local expertise.</p>
              </div>
            </div>
            <div className="aspect-[4/3] overflow-hidden">
              <img src={FIELD} alt="Managed food plots" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* Pursuits */}
      <section ref={pursuitsRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "#6B7250", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Pursuits</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              What the land holds.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {pursuits.map((p) => (
              <div key={p.title} className="bg-surface overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={p.img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-7">
                  <div style={{ height: "1px", width: "1.5rem", backgroundColor: "#6B7250", marginBottom: "1rem" }} />
                  <h3 className="font-serif text-warm text-xl mb-3">{p.title}</h3>
                  <p className="font-sans text-muted-brand text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-2xl">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "#6B7250", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Membership Required</p>
            <h2 className="font-serif font-light text-warm leading-tight mb-6" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
              Hunting access is exclusive to members.
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
              A limited number of memberships are available each season. If you're interested in joining, we'd like to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/membership" className="btn-outline" style={{ borderColor: "#6B7250", color: "#6B7250" }}>
                Explore Membership
              </Link>
              <Link href="/fish" className="btn-ghost">View Fishing</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Availability Calendar */}
      <HuntFishAvailabilityCalendar
        sectionTitle="Hunt Trip Availability"
        accentColor="text-amber-700"
      />

      </div>
    </PublicLayout>
  );
}
