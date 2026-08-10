import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import PublicLayout from "@shared/components/PublicLayout";
import SEOHead from '@shared/components/SEOHead';
import Picture from "@shared/components/Picture";

/* ── Hero slideshow ──────────────────────────────────────────────────────── */
const HERO_SLIDES: { src: string; alt: string; label: string; pos?: string }[] = [
  { src: "/img/Clubhouse%20Home.jpg", alt: "Timber Edge Clubhouse bar and lounge interior", label: "Hero Image 1" },
  { src: "/img/hero%203.jpg", alt: "Rivers Lodge & Hunt Club barn at sunset", label: "Hero Image 2", pos: "center 68%" },
  { src: "/brand/clubhouse%20exterior.jpg", alt: "Rivers Lodge & Hunt Club exterior at sunset", label: "Hero Image 3" },
];

function HeroSlideshow() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) return;
    const id = setInterval(() => setActiveIdx(i => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0">
      {HERO_SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className="absolute inset-0"
          style={{
            opacity: i === activeIdx ? 1 : 0,
            transition: reduced ? "none" : "opacity 1.2s ease-in-out",
            zIndex: i === activeIdx ? 1 : 0,
          }}
        >
          <Picture
            src={slide.src}
            alt={slide.alt}
            label={slide.label}
            className="absolute inset-0 w-full h-full"
                        imgClassName={`absolute inset-0 w-full h-full object-cover ${slide.pos ? "" : "object-center"}`}
            imgStyle={slide.pos ? { objectPosition: slide.pos } : undefined}
            fetchPriority={i === 0 ? "high" : "low"}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            width={1920}
            height={1080}
            sizes="100vw"
          />
        </div>
      ))}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.15) 40%, oklch(0 0 0/0.72) 100%)", zIndex: 2 }}
      />
    </div>
  );
}

/* ── Scroll indicator ────────────────────────────────────────────────────── */
function ScrollIndicator() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 transition-opacity duration-500"
      style={{ opacity: hidden ? 0 : 1 }}
      aria-hidden="true"
    >
      <p className="eyebrow text-white/30" style={{ fontSize: "9px", letterSpacing: "0.28em" }}>Scroll</p>
      <div className="relative w-px h-10 overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full bg-white/30"
          style={{ height: "100%", animation: "scrollLine 1.4s cubic-bezier(0.4,0,0.6,1) infinite" }}
        />
      </div>
      <style>{`
        @keyframes scrollLine {
          0%   { transform: translateY(-100%); opacity: 1; }
          60%  { transform: translateY(0%);    opacity: 1; }
          100% { transform: translateY(100%);  opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes scrollLine { 0%, 100% { transform: none; opacity: 0.3; } }
        }
      `}</style>
    </div>
  );
}

/* ── Fade-up hook ────────────────────────────────────────────────────────── */
function useFadeUp(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { el.classList.add("visible"); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function Home() {
  const estateRef    = useFadeUp();
  const stayRef      = useFadeUp();
  const storyRef     = useFadeUp();
  const memberRef    = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
        title="Rivers Lodge & Hunt Club"
        description="Rivers Lodge & Hunt Club — a private Lodge on the Marais des Cygnes in La Cygne, Kansas. Destination weddings, private events, hunting, fishing, and membership."
        url="/"
        image="/img/Ohana%20Aerial.jpg"
      />

      {/* ── 01. Hero ─────────────────────────────────────────────────────── */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <HeroSlideshow />
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div className="gold-rule mb-5" />
          <p className="eyebrow text-white/50 mb-5">La Cygne, Kansas</p>
          <h1
            className="font-serif font-light text-white leading-[0.92] mb-6"
            style={{ fontSize: "clamp(3.25rem,8.5vw,7.5rem)" }}
          >
            Rivers Lodge
            <br />
            <em className="italic font-light">&amp; Hunt Club</em>
          </h1>
          <p
            className="font-sans text-white/70 max-w-lg mb-10 leading-relaxed"
            style={{ fontSize: "clamp(0.9375rem,1.2vw,1.0625rem)" }}
          >
            A private lodge just 45 minutes south of Kansas City. Rivers Lodge is an exclusive membership club, a wedding venue and a premier outdoor destination for those who love the outdoors with a touch of luxury.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/membership" className="btn-primary">Explore Membership</Link>
            <Link href="/weddings-events" className="btn-ghost">Weddings &amp; Events</Link>
          </div>
        </div>
        <ScrollIndicator />
      </section>

      {/* ── 02. Teaser: Our Story ────────────────────────────────────────── */}
      <section ref={storyRef} className="fade-up relative py-32 lg:py-48 overflow-hidden min-h-[500px] lg:min-h-[600px]">
        <Picture
          src="/img/rivers-1-rockhome.jpg"
          alt="The rock home at Rivers Lodge & Hunt Club"
          label="Our story"
          className="absolute inset-0 w-full h-full"
          imgClassName="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
          sizes="100vw"
        />
        {/* Gradient overlay for text legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(43,40,35,0.85) 0%, rgba(43,40,35,0.7) 40%, rgba(43,40,35,0.5) 100%)",
          }}
          aria-hidden="true"
        />
        {/* Content */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 h-full flex items-center">
          <div className="max-w-lg">
            <div className="gold-rule mb-5" />
            <p className="eyebrow text-white/60 mb-4">Our Story</p>
            <h2
              className="font-serif font-light text-white leading-tight mb-6"
              style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}
            >
              The Rivers Lodge<br />
              <em className="italic">&amp; Hunt Club.</em>
            </h2>
            <p className="font-sans text-white/80 leading-relaxed" style={{ fontSize: "0.9375rem" }}>
              A privately owned luxury lodge located just 45 minutes south of Kansas City. The Main Lodge and Campus was built around a simple idea: give a small number of families and guests exclusive access to thousands of acres of land with high end accommodations and something for everyone to enjoy.
            </p>
          </div>
        </div>
      </section>

      {/* ── 03. Teaser: Lodging & Venues ─────────────────────────────────── */}
      <section ref={stayRef} className="fade-up relative py-32 lg:py-48 overflow-hidden min-h-[500px] lg:min-h-[600px]">
        <Picture
          src="/img/Clubhouse%20Home.jpg"
          alt="Clubhouse interior at Rivers Lodge"
          label="Clubhouse interior"
          className="absolute inset-0 w-full h-full"
          imgClassName="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
          sizes="100vw"
        />
        {/* Gradient overlay for text legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(43,40,35,0.85) 0%, rgba(43,40,35,0.7) 40%, rgba(43,40,35,0.5) 100%)",
          }}
          aria-hidden="true"
        />
        {/* Content */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 h-full flex items-center">
          <div className="max-w-lg">
            <div className="h-px w-8 mb-5" style={{ backgroundColor: "#9B4D19" }} />
            <p className="eyebrow text-white/60 mb-4">Lodging &amp; Venues</p>
            <h2
              className="font-serif font-light text-white leading-tight mb-6"
              style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}
            >
              From ceremonies to corporate retreats — entirely yours.
            </h2>
            <p className="font-sans text-white/80 leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
              When you book Rivers for any event the property is exclusively yours. You will have the full attention of our staff and our team will make your event exactly what you want. All of our events are curated specifically for your group. No overlapping events, no shared grounds.
            </p>
            <Link href="/lodging" className="btn-ghost" style={{ borderColor: "#9B4D19", color: "#9B4D19" }}>Plan Your Stay</Link>
          </div>
        </div>
      </section>

      {/* ── 04. Teaser: Explore Membership ──────────────────────────────────── */}
      <section className="fade-up relative py-32 lg:py-48 overflow-hidden">
        <img
          src="/img/membershiphomepage-1-.jpg"
          alt="Upland bird hunting at Rivers Lodge & Hunt Club"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
          sizes="100vw"
        />
        {/* Gradient overlay for text legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(43,40,35,0.85) 0%, rgba(43,40,35,0.7) 40%, rgba(43,40,35,0.5) 100%)",
          }}
          aria-hidden="true"
        />
        {/* Content */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 h-full flex items-center">
          <div className="max-w-lg">
            <div className="h-px w-8 mb-5" style={{ backgroundColor: "#6B7250" }} />
            <p className="eyebrow text-white/60 mb-4">Explore Membership</p>
            <h2
              className="font-serif font-light text-white leading-tight mb-6"
              style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}
            >
              A private club shaped by land and season.
            </h2>
            <p className="font-sans text-white/80 leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
              Managed hunting and fishing across thousands of private acres, alongside guest chef dinners, private concerts, game dinners, and seasonal celebrations. An intentional membership — small by design — with access to the full Lodge and the community around it.
            </p>
            <Link href="/membership" className="btn-ghost" style={{ borderColor: "#6B7250", color: "#6B7250" }}>Explore Membership</Link>
          </div>
        </div>
      </section>

            {/* ── 05. Teaser: Outdoor Pursuits ─────────────────────────────────── */}
<section className="fade-up relative py-32 lg:py-48 overflow-hidden">
  <Picture
    src="/img/waterfowldark.jpg"
    alt="Upland bird hunter walking through tall grass at Rivers Lodge"
    label="Upland hunt"
    className="absolute inset-0 w-full h-full"
    imgClassName="absolute inset-0 w-full h-full object-cover"
    width={1920}
    height={1080}
    sizes="100vw"
  />
  {/* Gradient overlay for text legibility */}
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      background: "linear-gradient(135deg, rgba(43,40,35,0.85) 0%, rgba(43,40,35,0.7) 40%, rgba(43,40,35,0.5) 100%)",
    }}
    aria-hidden="true"
  />
  {/* Content */}
  <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 h-full flex items-center">
    <div className="max-w-lg">
      <div className="gold-rule mb-5" />
      <p className="eyebrow text-white/60 mb-4">Outdoor Pursuits</p>
      <h2
        className="font-serif font-light text-white leading-tight mb-6"
        style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}
      >
        An activity for everyone.
      </h2>
      <p className="font-sans text-white/80 leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
        Whether you enjoy hiking, five-stand, fishing, upland, waterfowl, archery, or whitetail, we have something for everyone. Our world-class guides can create an incredible experience — or go Do-It-Yourself with our exclusive private options.
      </p>
      <Link href="/outdoor-activities" className="btn-ghost">Choose Your Pursuit</Link>
    </div>
  </div>
</section>


    </PublicLayout>
  );
}
