import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const HERO   = "/manus-storage/Rivers_SEPT2022_-238-1_2bb5d5aa.jpg";
const RIVER  = "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg";
const AERIAL = "/manus-storage/DJI_0017_538feef1.jpg";
const FIELD  = "/manus-storage/Rivers_May2023-8_d07307f4.jpg";

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
          <Link href="/membership" className="btn-outline" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
            Explore Membership
          </Link>
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

      {/* Species */}
      <section ref={speciesRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-12">
            <div style={{ height: "1px", width: "2rem", backgroundColor: "oklch(0.58 0.065 145)", marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Species Guide</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              What lives in the water.
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left eyebrow text-muted-brand pb-4 pr-8" style={{ fontSize: "10px" }}>Species</th>
                  <th className="text-left eyebrow text-muted-brand pb-4 pr-8" style={{ fontSize: "10px" }}>Best Season</th>
                  <th className="text-left eyebrow text-muted-brand pb-4" style={{ fontSize: "10px" }}>Recommended Method</th>
                </tr>
              </thead>
              <tbody>
                {species.map((s, i) => (
                  <tr key={s.name} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-background/30"}`}>
                    <td className="py-4 pr-8 text-warm font-medium">{s.name}</td>
                    <td className="py-4 pr-8 text-muted-brand">{s.season}</td>
                    <td className="py-4 text-muted-brand">{s.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      </div>
    </PublicLayout>
  );
}
