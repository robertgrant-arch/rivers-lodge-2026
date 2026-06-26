import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "../../../_shared/components/PublicLayout";
import SEOHead from '@shared/components/SEOHead';

const ACCENT = "oklch(0.58 0.065 145)";
const HUNT_HERO = "/img/hunt-hero.jpg";

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

/* Image placeholder — replace with real photography */
function ImgPlaceholder({ aspectClass, label }: { aspectClass: string; label: string }) {
  return (
    <div
      className={`${aspectClass} bg-[oklch(0.13_0.008_70)] flex items-center justify-center`}
      aria-label={label}
      role="img"
    >
      {/* TODO: replace with real photography */}
      <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-[oklch(0.28_0.010_70)] select-none">
        {label}
      </span>
    </div>
  );
}

const pursuits: { title: string; desc: string; imgLabel: string; img?: string }[] = [
  {
    title: "Whitetail Deer",
    desc: "Managed trophy whitetail hunting across thousands of acres of timber, flood plots, and river bottom. Elevated stands and ground blinds positioned throughout the property.",
    imgLabel: "Whitetail deer hunting",
  },
  {
    title: "Waterfowl",
    desc: "Duck and goose hunting on the Marais des Cygnes and managed wetlands. Early season teal through late-season mallards.",
    imgLabel: "Waterfowl hunting",
  },
  {
    title: "Turkey",
    desc: "Spring and fall turkey hunting in the timber corridor and open fields. The river bottom holds birds year-round.",
    imgLabel: "Turkey hunting",
  },
  {
    title: "Sporting Clays",
    desc: "A private sporting clays course on the property. Available to members and event guests for guided instruction or casual rounds.",
    imgLabel: "Sporting clays course",
  },
  {
    title: "Upland Birds",
    desc: "Quail and pheasant hunting in the upland fields and native grass areas. Guided hunts available with trained dogs.",
    imgLabel: "Upland bird hunting",
    img: "/img/3C0A0165.jpg",
  },
  {
    title: "Fishing",
    desc: "Our fishing is very tightly managed and we provide an experience that is rarely found in the Mid-West. We offer private access to waters that hold Striped Bass, Largemouth Bass, Walleye, Yellow Perch, Tiger Musky and more. Our fishing is truly world class.",
    imgLabel: "Private fishing",
  },
];

export default function Hunt() {
  const pursuitsRef = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
        title="Hunt"
        description="Private hunting and fishing on managed Kansas and Missouri land. Trophy whitetail, waterfowl, turkey, and world-class fishing — exclusive member access."
        url="/hunt"
      />
      <div style={{ "--track-accent": ACCENT } as React.CSSProperties}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          {/* Placeholder — always in the DOM; visible until hunt-hero.jpg is added */}
          <div className="absolute inset-0 bg-[oklch(0.17_0.012_70)] flex items-center justify-center" aria-hidden="true">
            <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/40 select-none pointer-events-none">
              Hunt Hero Image
            </span>
          </div>
          {/* Real photo — absolutely positioned on top; hidden via onError until the file exists */}
          <img
            src={HUNT_HERO}
            alt="Hunt and outdoor pursuits at Rivers Lodge"
            className="absolute inset-0 w-full h-full object-cover"
            fetchPriority="high"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.82) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Hunt</p>
          <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
            Private hunting and fishing on
            <br /><em className="italic font-light">managed Kansas and Missouri land.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            Thousands of acres of whitetail timber, managed food plots, waterfowl wetlands, and upland fields.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/membership" className="btn-outline" style={{ borderColor: ACCENT, color: ACCENT }}>
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

      {/* ── The Land ─────────────────────────────────────────────────── */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">
            <div>
              <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">The Land</p>
              <h2 className="font-serif font-light text-warm leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
                Managed with purpose.
                <br /><em className="italic">Hunted with respect.</em>
              </h2>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                <p>The Rivers Lodge hunting program is built on land management first. Food plots, timber management, and water management are maintained year-round to produce consistent, ethical hunting — not just for one season, but for decades.</p>
              </div>
            </div>
            {/* TODO: replace with managed land / food plot photography */}
            <ImgPlaceholder aspectClass="aspect-[4/3] overflow-hidden w-full" label="Managed land and food plots" />
          </div>
        </div>
      </section>

      {/* ── Pursuits ─────────────────────────────────────────────────── */}
      <section ref={pursuitsRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Pursuits</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              What the land holds.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {pursuits.map((p) => (
              <div key={p.title} className="bg-surface overflow-hidden">
                {p.img ? (
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <img src={p.img} alt={p.imgLabel} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  /* TODO: replace with real pursuit photography */
                  <ImgPlaceholder aspectClass="aspect-[4/3] w-full" label={p.imgLabel} />
                )}
                <div className="p-7">
                  <div style={{ height: "1px", width: "1.5rem", backgroundColor: ACCENT, marginBottom: "1rem" }} />
                  <h3 className="font-serif text-warm text-xl mb-3">{p.title}</h3>
                  <p className="font-sans text-muted-brand text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      </div>
    </PublicLayout>
  );
}
