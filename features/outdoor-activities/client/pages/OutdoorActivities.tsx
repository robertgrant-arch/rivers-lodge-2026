import { Link } from "wouter";
import { useRef, useEffect } from "react";
import PublicLayout from "@shared/components/PublicLayout";
import SEOHead from "@shared/components/SEOHead";
import Picture from "@shared/components/Picture";
import { PURSUITS } from "./pursuitData";
// build: 20260706-0400-placeholder-tiles-fixed

const ACCENT = "#6B7250";

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

export default function OutdoorActivities() {
  const pursuitsRef = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
        title="Outdoor Pursuits"
        description="Hunting, fishing, and outdoor pursuits on thousands of privately managed acres in La Cygne, Kansas. Whitetail, waterfowl, upland birds, turkey, and world-class fishing — exclusively for members and guests of Rivers Lodge."
        url="/outdoor-activities"
      />

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <Picture
            src="/img/3C0A0165.jpg"
            alt="Outdoor pursuits at Rivers Lodge & Hunt Club"
            label="Outdoor Activities"
            className="absolute inset-0 w-full h-full"
            imgClassName="absolute inset-0 w-full h-full object-cover"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            width={1920}
            height={1080}
            sizes="100vw"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.80) 100%)" }}
          />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Pursuits</p>
          <h1
            className="font-serif font-light text-white leading-[0.92] mb-6"
            style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}
          >
            What the land holds.
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            Thousands of privately managed acres along the Marais des Cygnes. Trophy whitetail, world-class fishing, waterfowl, upland birds, and more — one hour south of Kansas City.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#pursuits" className="btn-outline" style={{ borderColor: ACCENT, color: ACCENT }}>
              Choose a Pursuit
            </a>
            <Link href="/contact" className="btn-ghost">
              Plan a Trip
            </Link>
          </div>
        </div>
      </section>

      {/* Intro band */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-3xl">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">The Land</p>
            <h2
              className="font-serif font-light text-warm leading-tight mb-8"
              style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}
            >
              What The Land Holds.
            </h2>
            <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
              <p>
                Thousands of privately managed acres in the Marais des Cygnes River valley with something for everyone. Whether you enjoy hiking, biking, ATVs, 5-stand shooting, trophy fishing, whitetail deer hunting or waterfowl, there is an outdoor pursuit for everyone — one hour south of Kansas City.
              </p>
              <h3
                className="font-serif font-light text-warm leading-tight mt-8 mb-4"
                style={{ fontSize: "clamp(1.25rem,2.5vw,1.875rem)" }}
              >
                Managed for the long term.
              </h3>
              <p>
                Rivers Lodge manages its land and its membership in the same way — with care and at low density. All of our programs ensure getting the maximum out of the land and making sure that your experience is private and first class.
              </p>
              <p>
                As a result our land gets better every year. Members and guests consistently report it as the finest private hunting and fishing access they have found anywhere in the Midwest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pursuit cards grid */}
      <section
        id="pursuits"
        ref={pursuitsRef as React.RefObject<HTMLDivElement>}
        className="fade-up section bg-surface"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Outdoor Pursuits</p>
            <h2
              className="font-serif font-light text-warm leading-tight"
              style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
            >
              Choose your pursuit.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {PURSUITS.map((pursuit) => (
              <Link
                key={pursuit.slug}
                href={`/outdoor-activities/${pursuit.slug}`}
                className="group bg-surface hover:bg-background transition-colors flex flex-col"
              >
                {/* Image or Placeholder */}
                {pursuit.slug === "whitetail" ? (
                  <Picture
                    src="/deer-1-gallery.jpg"
                    alt="Whitetail Deer"
                    label={pursuit.title}
                    className="aspect-[4/3] overflow-hidden"
                    imgClassName="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    width={800}
                    height={600}
                  />
                ) : pursuit.slug === "upland-birds" ? (
                  <div className="aspect-[4/3] overflow-hidden bg-stone-800 flex flex-col items-center justify-center space-y-2">
                    <p className="text-sm font-light text-amber-900/60 uppercase tracking-wide">Placeholder #{pursuit.placeholderId}</p>
                    <p className="text-xs font-light text-amber-900/50 uppercase tracking-wider">{pursuit.title}</p>
                    <p className="text-[10px] text-stone-500 text-center px-4 leading-tight uppercase tracking-wide mt-2">Bill decides<br/>e.g., acres or stat</p>
                  </div>
                ) : (
                  <Picture
                    src={pursuit.heroImg}
                    alt={pursuit.heroAlt}
                    label={pursuit.title}
                    className="aspect-[4/3] overflow-hidden"
                    imgClassName="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    width={800}
                    height={600}
                  />
                )}

                {/* Card body */}
                <div className="p-7 flex flex-col flex-1">
                  <div style={{ height: "1px", width: "1.5rem", backgroundColor: ACCENT, marginBottom: "1rem" }} />
                  <h3 className="font-serif text-warm text-xl mb-3">{pursuit.title}</h3>
                  <p className="font-sans text-muted-brand text-sm leading-relaxed flex-1 mb-5">
                    {pursuit.teaser}
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

      {/* Membership CTA */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">Access</p>
              <h2
                className="font-serif font-light text-warm leading-tight mb-8"
                style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}
              >
                Membership unlocks<br />
                <em className="italic">everything.</em>
              </h2>
              <p className="font-sans text-muted-brand leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
                Members receive unlimited access to all hunting and fishing on the estate, priority lodging booking, guest privileges, and an invitation to annual member events. Day trips and guided packages are available for non-members by arrangement.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/membership" className="btn-ghost" style={{ borderColor: ACCENT, color: ACCENT }}>
                  Explore Membership
                </Link>
                <Link href="/contact" className="btn-ghost">
                  Inquire About a Trip
                </Link>
              </div>
            </div>
            <Picture
              src="/img/Ohana%20Aerial.jpg"
              alt="Rivers Lodge estate aerial view"
              label="Estate aerial"
              className="aspect-[4/3] overflow-hidden w-full"
              loading="lazy"
              decoding="async"
              sizes="(max-width: 1024px) 100vw, 50vw"
              width={1200}
              height={900}
            />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
