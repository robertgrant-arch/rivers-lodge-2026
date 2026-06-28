import { Link } from "wouter";
import { useRef, useEffect } from "react";
import PublicLayout from "@shared/components/PublicLayout";
import SEOHead from "@shared/components/SEOHead";
import Picture from "@shared/components/Picture";
import { getPursuit } from "./pursuitData";
import NotFound from "@features/marketing/client/pages/NotFound";

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

interface Props {
  slug: string;
}

export default function PursuitDetail({ slug }: Props) {
  const pursuit = getPursuit(slug);
  const galleryRef = useFadeUp();

  if (!pursuit) return <NotFound />;

  return (
    <PublicLayout>
      <SEOHead
        title={pursuit.title}
        description={`${pursuit.teaser} Exclusive access at Rivers Lodge & Hunt Club, La Cygne, Kansas.`}
        url={`/outdoor-activities/${pursuit.slug}`}
        image={pursuit.heroImg || undefined}
      />

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[#2B2823] flex items-center justify-center" aria-hidden="true">
            <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/30 select-none pointer-events-none">
              {pursuit.title}
            </span>
          </div>
          {pursuit.heroImg && (
            <img
              src={pursuit.heroImg}
              alt={pursuit.heroAlt}
              className="absolute inset-0 w-full h-full object-cover"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              width={1920}
              height={1080}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.80) 100%)" }}
          />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Outdoor Activities</p>
          <h1
            className="font-serif font-light text-white leading-[0.92] mb-6"
            style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}
          >
            {pursuit.title}
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            {pursuit.teaser}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/membership" className="btn-outline" style={{ borderColor: ACCENT, color: ACCENT }}>
              Explore Membership
            </Link>
            <Link href="/contact" className="btn-ghost">
              Book a Trip
            </Link>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
          <p className="eyebrow text-muted-brand mb-4">{pursuit.title}</p>
          <div className="max-w-3xl space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
            {pursuit.description.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Photo gallery */}
      {pursuit.galleryImgs.length > 0 && (
        <section
          ref={galleryRef as React.RefObject<HTMLDivElement>}
          className="fade-up section bg-surface"
        >
          <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
            <div className="mb-10">
              <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand">Gallery</p>
            </div>
            <div className={`grid gap-px bg-border ${pursuit.galleryImgs.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
              {pursuit.galleryImgs.map((img, i) => (
                <Picture
                  key={i}
                  src={img.src}
                  alt={img.alt}
                  className="aspect-[16/9] overflow-hidden"
                  imgStyle={img.objectPosition ? { objectPosition: img.objectPosition } : undefined}
                  sizes="(max-width: 640px) 100vw, 50vw"
                  width={1200}
                  height={675}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back link + CTA */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <Link
              href="/outdoor-activities"
              className="font-sans text-sm text-muted-brand hover:text-warm transition-colors flex items-center gap-2"
            >
              ← Back to Outdoor Activities
            </Link>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/membership" className="btn-ghost" style={{ borderColor: ACCENT, color: ACCENT }}>
                Explore Membership
              </Link>
              <Link href="/contact" className="btn-ghost">
                Inquire About a Trip
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
