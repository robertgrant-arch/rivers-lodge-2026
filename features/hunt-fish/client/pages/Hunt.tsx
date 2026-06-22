import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "../../../_shared/components/PublicLayout";
import SEOHead from '@shared/components/SEOHead';
import { HuntFishAvailabilityCalendar } from "../../../trips/client/public";


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

const seasons = [
  { species: "Whitetail Deer", open: "Sept 15",  close: "Jan 15",  notes: "Archery, muzzleloader, rifle" },
  { species: "Waterfowl",      open: "Oct 1",    close: "Jan 31",  notes: "Duck & goose, split seasons" },
  { species: "Turkey (Spring)",open: "Apr 1",    close: "May 31",  notes: "Shotgun & archery" },
  { species: "Turkey (Fall)",  open: "Oct 1",    close: "Nov 30",  notes: "Shotgun & archery" },
  { species: "Sporting Clays", open: "Year-round", close: "—",     notes: "Members & guests" },
];

export default function Hunt() {
  const pursuitsRef = useFadeUp();
  const seasonRef   = useFadeUp();
  const ctaRef      = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
  title="Hunt"
  description="World-class whitetail deer hunting, waterfowl, and upland bird hunting on 1,800 private acres in La Cygne, Kansas. Exclusive member access."
  url="/hunt"
/>
      <div style={{ "--track-accent": "oklch(0.58 0.065 145)" } as React.CSSProperties}>

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Hunting at Rivers Lodge" className="w-full h-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.82) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Hunt</p>
          <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
            Private hunting on
            <br /><em className="italic font-light">managed Kansas land.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            Thousands of acres of whitetail timber, managed food plots, waterfowl wetlands, and upland fields. Available exclusively to members.
          </p>
          <Link href="/membership" className="btn-outline" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
            Explore Membership
          </Link>
        </div>
      </section>

      {/* Intro */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">
            <div>
              <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
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
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
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
                  <div style={{ height: "1px", width: "1.5rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1rem" }} />
                  <h3 className="font-serif text-warm text-xl mb-3">{p.title}</h3>
                  <p className="font-sans text-muted-brand text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Season Calendar */}
      <section ref={seasonRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-12">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Season Calendar</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Kansas hunting seasons.
            </h2>
          </div>
          {/* Month header */}
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="flex mb-2 pl-[180px]">
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m) => (
                  <div key={m} className="flex-1 text-center eyebrow text-muted-brand" style={{ fontSize: "9px" }}>{m}</div>
                ))}
              </div>
              {/* Season bars */}
              {[
                { species: "Whitetail Deer",   startMonth: 8.5,  endMonth: 12.5, notes: "Archery, rifle, muzzleloader" },
                { species: "Waterfowl",         startMonth: 9,    endMonth: 12.9, notes: "Duck & goose, split seasons" },
                { species: "Turkey (Spring)",   startMonth: 3,    endMonth: 4.9,  notes: "Shotgun & archery" },
                { species: "Turkey (Fall)",     startMonth: 9,    endMonth: 10.9, notes: "Shotgun & archery" },
                { species: "Sporting Clays",    startMonth: 0,    endMonth: 11.9, notes: "Members & guests year-round" },
              ].map((s) => {
                const left = (s.startMonth / 12) * 100;
                const width = ((s.endMonth - s.startMonth) / 12) * 100;
                return (
                  <div key={s.species} className="flex items-center gap-4 mb-3">
                    <div className="w-[180px] shrink-0">
                      <p className="font-sans text-warm text-sm font-medium leading-tight">{s.species}</p>
                      <p className="font-sans text-muted-brand" style={{ fontSize: "10px" }}>{s.notes}</p>
                    </div>
                    <div className="flex-1 relative h-7 bg-white/4 rounded-none">
                      <div
                        className="absolute top-0 bottom-0 rounded-none"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          background: "oklch(0.58 0.065 145 / 0.75)",
                          borderLeft: "2px solid oklch(0.58 0.065 145)",
                        }}
                      />
                      {/* Month grid lines */}
                      {[1,2,3,4,5,6,7,8,9,10,11].map((m) => (
                        <div
                          key={m}
                          className="absolute top-0 bottom-0 w-px"
                          style={{ left: `${(m/12)*100}%`, background: "oklch(0.22 0.008 64)" }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="font-sans text-muted-brand text-xs mt-6">* Seasons subject to Kansas Wildlife &amp; Parks regulations. Verify current seasons before hunting.</p>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-2xl">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Membership Required</p>
            <h2 className="font-serif font-light text-warm leading-tight mb-6" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
              Hunting access is exclusive to members.
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
              A limited number of memberships are available each season. If you're interested in joining, we'd like to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/membership" className="btn-outline" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
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
