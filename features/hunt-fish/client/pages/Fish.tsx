import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "../../../_shared/components/PublicLayout";
import SEOHead from '@shared/components/SEOHead';
import { HuntFishAvailabilityCalendar } from "../../../trips/client/public";


const HERO   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/aLRhjpmRWbewKvgx.jpg";
const RIVER  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/xZXSDWkpiCXfqsiU.jpg";
const AERIAL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/jPtEuiXynfNedkpV.jpg";
const FIELD  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/frgfGSQgOuESJGtz.jpg";

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

const fisheries = [
  { name: "Marais des Cygnes River", desc: "The main river channel runs through the heart of the estate. Largemouth bass, channel catfish, and flathead catfish are the primary species. The river is wide, slow, and productive year-round.", img: RIVER },
  { name: "North Lake",              desc: "A 12-acre private lake stocked with largemouth bass and crappie. Bank fishing and kayak access available to members.", img: AERIAL },
  { name: "South Pond",              desc: "A 4-acre pond managed for trophy bass. Catch-and-release encouraged. Fly fishing and light tackle ideal.", img: FIELD },
  { name: "River Sloughs",           desc: "Backwater sloughs off the main river channel. Excellent crappie and bluegill fishing in spring and early summer.", img: HERO },
];

const species = [
  { name: "Largemouth Bass",  season: "Year-round",    method: "Lure, fly, live bait" },
  { name: "Channel Catfish",  season: "Year-round",    method: "Cut bait, live bait" },
  { name: "Flathead Catfish", season: "Apr – Oct",     method: "Live bait" },
  { name: "Crappie",          season: "Mar – Jun",     method: "Jig, minnow" },
  { name: "Bluegill",         season: "May – Sep",     method: "Fly, small jig" },
];

export default function Fish() {
  const fisheriesRef = useFadeUp();
  const speciesRef   = useFadeUp();
  const ctaRef       = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
  title="Fish"
  description="Private bass, crappie, and catfish fishing on four exclusive fisheries at The Rivers Lodge in La Cygne, Kansas. Member and guided access."
  url="/fish"
/>
      <div style={{ "--track-accent": "oklch(0.58 0.065 145)" } as React.CSSProperties}>

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Fishing at Rivers Lodge" className="w-full h-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.82) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Fish</p>
          <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
            Five private fisheries.
            <br /><em className="italic font-light">One river.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            The Marais des Cygnes, two private lakes, and a network of river sloughs — all within the estate boundary, available exclusively to members.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/membership" className="btn-outline" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
              Explore Membership
            </Link>
            <Link href="/contact" className="btn-ghost">
              Book a Trip
            </Link>
          </div>
          <p className="font-sans text-white/50 mt-5 max-w-md leading-relaxed" style={{ fontSize: "0.8125rem" }}>
            Open to the public — members receive priority booking and preferred rates.
          </p>
        </div>
      </section>

      {/* Fisheries */}
      <section ref={fisheriesRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">The Fisheries</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Private water. Year-round access.
            </h2>
          </div>
          <div className="space-y-px bg-border">
            {fisheries.map((f, i) => (
              <div key={f.name} className={`grid grid-cols-1 md:grid-cols-2 bg-background ${i % 2 === 1 ? "md:[direction:rtl]" : ""}`}>
                <div className={`aspect-[4/3] overflow-hidden ${i % 2 === 1 ? "md:[direction:ltr]" : ""}`}>
                  <img src={f.img} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className={`p-10 lg:p-14 flex flex-col justify-center ${i % 2 === 1 ? "md:[direction:ltr]" : ""}`}>
                  <div style={{ height: "1px", width: "1.5rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1rem" }} />
                  <h3 className="font-serif text-warm text-2xl mb-4">{f.name}</h3>
                  <p className="font-sans text-muted-brand text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Species / Season Calendar */}
      <section ref={speciesRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-12">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Species & Season Guide</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              When to fish, and how.
            </h2>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Month header */}
              <div className="flex mb-2 pl-[200px]">
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m) => (
                  <div key={m} className="flex-1 text-center eyebrow text-muted-brand" style={{ fontSize: "9px" }}>{m}</div>
                ))}
              </div>
              {/* Season bars */}
              {[
                { name: "Largemouth Bass",  startMonth: 0,   endMonth: 11.9, method: "Lure, fly, live bait" },
                { name: "Channel Catfish",  startMonth: 0,   endMonth: 11.9, method: "Cut bait, live bait" },
                { name: "Flathead Catfish", startMonth: 3,   endMonth: 9.9,  method: "Live bait" },
                { name: "Crappie",          startMonth: 2,   endMonth: 5.9,  method: "Jig, minnow" },
                { name: "Bluegill",         startMonth: 4,   endMonth: 8.9,  method: "Fly, small jig" },
              ].map((s) => {
                const left = (s.startMonth / 12) * 100;
                const width = ((s.endMonth - s.startMonth) / 12) * 100;
                return (
                  <div key={s.name} className="flex items-center gap-4 mb-3">
                    <div className="w-[200px] shrink-0">
                      <p className="font-sans text-warm text-sm font-medium leading-tight">{s.name}</p>
                      <p className="font-sans text-muted-brand" style={{ fontSize: "10px" }}>{s.method}</p>
                    </div>
                    <div className="flex-1 relative h-7 bg-white/4">
                      <div
                        className="absolute top-0 bottom-0"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          background: "oklch(0.58 0.065 145 / 0.75)",
                          borderLeft: "2px solid oklch(0.58 0.065 145)",
                        }}
                      />
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
          <p className="font-sans text-muted-brand text-xs mt-6">Peak seasons shown. All species available year-round on private water.</p>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-2xl">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Membership Required</p>
            <h2 className="font-serif font-light text-warm leading-tight mb-6" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
              Fishing access is exclusive to members.
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
              A limited number of memberships are available each season. If you're interested in joining, we'd like to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/membership" className="btn-outline" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
                Explore Membership
              </Link>
              <Link href="/hunt" className="btn-ghost">View Hunting</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Availability Calendar */}
      <HuntFishAvailabilityCalendar
        sectionTitle="Fishing Trip Availability"
        accentColor="text-sky-700"
      />

      </div>
    </PublicLayout>
  );
}
