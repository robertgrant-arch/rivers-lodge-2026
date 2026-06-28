import { Link } from "wouter";
import { useRef, useEffect } from "react";
import PublicLayout from "@shared/components/PublicLayout";
import SEOHead from "@shared/components/SEOHead";
import Picture from "@shared/components/Picture";

const ACCENT = "#9B4D19";

const HERO_IMG = "/img/Ohana%20Dock.jpg";

function useFadeUp(t = 0.12) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { el.classList.add("visible"); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: t }
    );
    obs.observe(el); return () => obs.disconnect();
  }, [t]);
  return ref;
}

const CATEGORIES = [
  {
    label: "Weddings",
    href: "/weddings",
    desc: "Ceremonies, receptions, and immersive wedding weekends along the Marais des Cygnes. One venue, entirely yours from rehearsal to farewell.",
    img: "/img/wedding%20hero.JPG",
    imgAlt: "Wedding ceremony at Rivers Lodge",
    eyebrow: "Celebrations",
  },
  {
    label: "Corporate Events",
    href: "/corporate",
    desc: "Executive retreats, client entertainment, and leadership off-sites on a private estate. Groups from 10 to 250, fully accommodated.",
    img: "/img/Clubhouse%20Hero.jpg",
    imgAlt: "Clubhouse and gathering spaces at Rivers Lodge",
    eyebrow: "Corporate",
  },
  {
    label: "Outdoor Pursuits",
    href: "/outdoor-activities",
    desc: "Trophy whitetail, world-class fishing, waterfowl, upland birds, and turkey on thousands of privately managed acres.",
    img: "/img/3C0A0165.jpg",
    imgAlt: "Hunting and fishing at Rivers Lodge",
    eyebrow: "Hunt & Fish",
  },
  {
    label: "Food & Wine",
    href: "/food-and-wine",
    desc: "Chef-driven, land-to-table dining. Private dinners, tasting events, and custom menus built around the estate and the season.",
    img: "/img/ChefSwethaSelect30617-1200w.avif",
    imgAlt: "Chef-driven dining at Rivers Lodge",
    eyebrow: "Culinary",
  },
];

export default function WeddingsEvents() {
  const cardsRef = useFadeUp();
  const ctaRef   = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
        title="Weddings & Events"
        description="Weddings, corporate events, outdoor pursuits, and culinary experiences on a private estate along the Marais des Cygnes in La Cygne, Kansas."
        url="/weddings-events"
      />

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="Wedding at Rivers Lodge"
            className="absolute inset-0 w-full h-full object-cover object-top"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            width={1920}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.15) 40%, oklch(0 0 0/0.82) 100%)" }}
          />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Weddings & Events</p>
          <h1
            className="font-serif font-light text-white leading-[0.92] mb-6"
            style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}
          >
            One estate.
            <br /><em className="italic font-light">Every occasion.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-xl leading-relaxed" style={{ fontSize: "0.9375rem" }}>
            The Rivers Lodge hosts one occasion at a time — so every wedding, retreat, and gathering receives the full breadth of the estate. One hour south of Kansas City.
          </p>
        </div>
      </section>

      {/* Category cards */}
      <section
        ref={cardsRef as React.RefObject<HTMLDivElement>}
        className="fade-up section bg-background"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">What We Host</p>
            <h2
              className="font-serif font-light text-warm leading-tight"
              style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
            >
              The estate, at your discretion.
            </h2>
          </div>

          <div className="space-y-px bg-border">
            {CATEGORIES.map((cat, i) => (
              <Link
                key={cat.href}
                href={cat.href}
                className={`group grid grid-cols-1 md:grid-cols-2 bg-background hover:bg-surface transition-colors ${i % 2 === 1 ? "md:[direction:rtl]" : ""}`}
              >
                {/* Image */}
                <div className={`aspect-[4/3] overflow-hidden ${i % 2 === 1 ? "md:[direction:ltr]" : ""}`}>
                  <Picture
                    src={cat.img}
                    alt={cat.imgAlt}
                    label={cat.label}
                    className="w-full h-full"
                    imgClassName="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    width={800}
                    height={600}
                  />
                </div>

                {/* Text */}
                <div className={`p-10 lg:p-16 flex flex-col justify-center ${i % 2 === 1 ? "md:[direction:ltr]" : ""}`}>
                  <div style={{ height: "1px", width: "1.5rem", backgroundColor: ACCENT, marginBottom: "1rem" }} />
                  <p className="eyebrow text-muted-brand mb-3">{cat.eyebrow}</p>
                  <h3 className="font-serif text-warm leading-tight mb-4" style={{ fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                    {cat.label}
                  </h3>
                  <p className="font-sans text-muted-brand text-sm leading-relaxed mb-6 max-w-sm">
                    {cat.desc}
                  </p>
                  <span
                    className="text-[10px] tracking-[0.16em] uppercase font-sans font-medium transition-colors"
                    style={{ color: ACCENT }}
                  >
                    Learn more →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        ref={ctaRef as React.RefObject<HTMLDivElement>}
        className="fade-up section bg-surface"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-2xl">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Plan Your Visit</p>
            <h2
              className="font-serif font-light text-warm leading-tight mb-6"
              style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}
            >
              Ready to see the estate?
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
              Whether you're planning a wedding weekend, a corporate retreat, or a private hunt — reach out and we'll arrange a private tour of the estate.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact" className="btn-outline" style={{ borderColor: ACCENT, color: ACCENT }}>
                Get in Touch
              </Link>
              <Link href="/membership" className="btn-ghost">Explore Membership</Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
