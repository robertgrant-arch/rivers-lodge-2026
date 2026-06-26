import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "@features/public-pages/components/PublicLayout";
import SEOHead from '@shared/components/SEOHead';

const ACCENT = "#9B4D19";

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

/* Image placeholder — used wherever photography is pending */
function ImgPlaceholder({ aspectClass, label }: { aspectClass: string; label: string }) {
  return (
    <div
      className={`${aspectClass} bg-[#363330] flex items-center justify-center`}
      aria-label={label}
      role="img"
    >
      <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-[#57544E] select-none">
        {label}
      </span>
    </div>
  );
}

/* Safe image — placeholder always in DOM as base layer; real <img> hides on 404 */
function SafeImg({ src, alt, label, aspectClass }: { src: string; alt: string; label: string; aspectClass: string }) {
  return (
    <div className={`${aspectClass} relative`}>
      <div className="absolute inset-0 bg-[#363330] flex items-center justify-center" aria-hidden="true">
        <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-[#57544E] select-none pointer-events-none">
          {label}
        </span>
      </div>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
}

export default function FoodAndWine() {
  const chefRef   = useFadeUp();
  const farmRef   = useFadeUp();
  const diningRef = useFadeUp();
  const ctaRef    = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
        title="Food & Wine"
        description="Chef-driven, land-to-table dining at The Rivers Lodge & Hunt Club — locally sourced pork, beef, and venison from the estate's own fields and garden."
        url="/food-and-wine"
      />
      <div style={{ "--track-accent": ACCENT } as React.CSSProperties}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          {/* TODO: replace with hero food/wine photography */}
          <div className="w-full h-full bg-[#2B2823]" aria-hidden="true" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.10) 40%, oklch(0 0 0/0.80) 100%)" }}
          />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Food &amp; Wine</p>
          <h1
            className="font-serif font-light text-white leading-[0.92] mb-6"
            style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}
          >
            From the land.
            <br /><em className="italic font-light">To your table.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            A chef-driven culinary program rooted in the estate's own fields — seasonally led, locally sourced, and unlike anything else in the region.
          </p>
          <Link
            href="/contact?type=dining"
            className="btn-primary"
            style={{ backgroundColor: ACCENT, borderColor: ACCENT, color: "#2B2823" }}
          >
            Inquire About Dining
          </Link>
        </div>
      </section>

      {/* ── Meet Chef Casey ──────────────────────────────────────────── */}
      <section
        ref={chefRef as React.RefObject<HTMLDivElement>}
        className="fade-up section bg-background"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">
            <div>
              <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">The Chef</p>
              <h2
                className="font-serif font-light text-warm leading-tight mb-8"
                style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}
              >
                Meet
                <br /><em className="italic">Chef Casey.</em>
              </h2>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                <p>
                  Casey Byrom is a classically trained chef, born and raised in Kansas City, Missouri. His resume boasts some of Kansas City's best restaurants, including Ibis Bakery, Webster House and The American Restaurant. Focusing on local farm fresh ingredients, Casey is passionate about exploring Mid-Western cuisine. His philosophy is that food is not only the way we nourish our bodies, but also how we connect with each other when we gather around the table.
                </p>
              </div>
            </div>
            <SafeImg src="/img/chef%20casey.jpg" alt="Chef Casey" label="Chef Casey portrait" aspectClass="aspect-[3/4] overflow-hidden w-full max-w-md mx-auto lg:mx-0" />
          </div>
        </div>
      </section>

      {/* ── Pull Quote ───────────────────────────────────────────────── */}
      <section className="section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-3xl">
            <blockquote className="pull-quote" style={{ borderLeftColor: ACCENT }}>
              "Every dish starts with what the land gives us — hunted, grown, and raised right here on the property."
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── Farm to Table ────────────────────────────────────────────── */}
      <section
        ref={farmRef as React.RefObject<HTMLDivElement>}
        className="fade-up section bg-background"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">

            {/* Image collage */}
            <div className="grid grid-cols-2 gap-3 order-last lg:order-first">
              <div className="col-span-2 overflow-hidden">
                <SafeImg src="/img/ChefSwethaSelect30617.jpg" alt="Farm-to-table food at Rivers Lodge" label="Garden or farm-to-table food" aspectClass="aspect-[16/9] w-full" />
              </div>
              <SafeImg src="/img/Cool%20Food%202.JPG" alt="Locally sourced ingredients" label="Locally sourced ingredients" aspectClass="aspect-square overflow-hidden" />
              <SafeImg src="/img/food%202.jpg" alt="On-property garden produce" label="On-property garden" aspectClass="aspect-square overflow-hidden" />
            </div>

            <div>
              <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">The Program</p>
              <h2
                className="font-serif font-light text-warm leading-tight mb-8"
                style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}
              >
                Farm to
                <br /><em className="italic">Table.</em>
              </h2>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed mb-8" style={{ fontSize: "0.9375rem" }}>
                <p>
                  At Rivers Lodge, our culinary program is rooted in the land around us. We source
                  locally raised pork, beef, and venison, and grow produce in our own on-property
                  garden — a true farm-to-table experience from our fields to your table.
                </p>
              </div>
              <ul className="space-y-3">
                {[
                  "Locally sourced pork",
                  "Locally sourced beef",
                  "Venison from the estate",
                  "On-property garden produce",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-sans text-sm text-muted-brand">
                    <span style={{ color: ACCENT, marginTop: "2px", flexShrink: 0 }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dining & Wine Experience ──────────────────────────────────── */}
      <section
        ref={diningRef as React.RefObject<HTMLDivElement>}
        className="fade-up section bg-surface"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">The Experience</p>
            <h2
              className="font-serif font-light text-warm leading-tight"
              style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}
            >
              Private dinners. Curated wine.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
            {[
              {
                title: "Private Dinners",
                /* TODO: Replace with confirmed private dining details */
                desc: "[Private dining experience details — to be provided. Describe the setting, format, and what guests can expect from an exclusive dinner at the lodge.]",
              },
              {
                title: "Culinary Experiences",
                /* TODO: Replace with confirmed culinary experience details */
                desc: "[Culinary experience details — to be provided. Describe any cooking demonstrations, tasting menus, or chef-led experiences available to guests and members.]",
              },
              {
                title: "Wine & Bar Program",
                /* TODO: Replace with confirmed wine/bar program details */
                desc: "[Wine and bar program details — to be provided. Describe the cellar, curated selections, and how the beverage program complements the food philosophy.]",
              },
            ].map((item) => (
              <div key={item.title} className="bg-surface p-8 lg:p-10 flex flex-col">
                <div style={{ height: "1px", width: "1.5rem", backgroundColor: ACCENT, marginBottom: "1rem" }} />
                <h3 className="font-serif text-warm text-xl mb-4">{item.title}</h3>
                <p className="font-sans text-muted-brand text-sm leading-relaxed italic text-[#7A766F]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section
        ref={ctaRef as React.RefObject<HTMLDivElement>}
        className="fade-up section bg-background"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-2xl">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Dining Inquiries</p>
            <h2
              className="font-serif font-light text-warm leading-tight mb-6"
              style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}
            >
              Reserve your table.
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
              Whether you're planning a private dinner, a culinary weekend, or would like to learn more about dining at the lodge, we'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact?type=dining"
                className="btn-primary"
                style={{ backgroundColor: ACCENT, borderColor: ACCENT, color: "#2B2823" }}
              >
                Inquire About Dining
              </Link>
              <Link href="/estate" className="btn-ghost">Explore the Estate</Link>
            </div>
          </div>
        </div>
      </section>

      </div>
    </PublicLayout>
  );
}
