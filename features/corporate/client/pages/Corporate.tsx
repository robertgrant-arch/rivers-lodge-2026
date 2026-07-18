import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "../../../_shared/components/PublicLayout";
import SEOHead from '@shared/components/SEOHead';
import Picture from "@shared/components/Picture";


const HERO     = "/brand/Corporate%20Event%201.jpg";
const BARN     = "/img/barn%20shot.jpg";
const GROUNDS  = "/img/Ohana%20Aerial.jpg";
const AERIAL   = "/img/Ohana%20Aerial.jpg";
const LODGE    = "/img/Main%20Lodge.jpg";
const INTERIOR = "/brand/clubhouse%204.jpg";

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

const CORP_RETREAT = "/brand/corporate%20clubhouse%20.JPG";
const CORP_ENTERTAIN = "/brand/corporate%204.jpg";

const eventTypes = [
  { title: "Corporate Retreats",    desc: "Multi-day team retreats with lodging, dining, and curated outdoor programming. From 5 to 300 people Lodge events are custom built for your team's retreat.", img: CORP_RETREAT,   alt: "Corporate retreat at the Clubhouse" },
  { title: "Executive Meetings",    desc: "Private meeting space in the Clubhouse for boards, leadership teams, and strategy sessions — away from the office, on the land.", img: INTERIOR,       alt: "Executive meetings at Rivers Lodge" },
  { title: "Client Entertainment",  desc: "Hunting days, fishing excursions, sporting clays, and private dinners. The most memorable client entertainment is the kind that can't be replicated.", img: CORP_ENTERTAIN, alt: "Client entertainment at Rivers Lodge" },
  { title: "Team-Building Days",    desc: "Guided outdoor experiences — from clay shooting to river fishing — that build genuine connection without a single trust fall.", img: AERIAL,          alt: "Team-building days at Rivers Lodge" },
];


export default function Corporate() {
  const typesRef = useFadeUp();
  const ctaRef   = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
  title="Corporate Outings & Events"
  description="Private corporate retreats, team-building hunts, and executive events at The Rivers Lodge — a world-class venue in La Cygne, Kansas."
  url="/corporate"
/>
      <div style={{ "--track-accent": "#9B4D19" } as React.CSSProperties}>

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <Picture
            src={HERO}
            alt="Corporate events at Rivers Lodge"
            className="absolute inset-0 w-full h-full"
            imgClassName="absolute inset-0 w-full h-full object-cover"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            width={1920}
            height={1080}
            sizes="100vw"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.35) 40%, oklch(0 0 0/0.90) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div className="gold-rule mb-5" />
          <p className="eyebrow text-white/50 mb-4">Corporate Outings &amp; Events</p>
          <div className="max-w-2xl">
            <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
              Off-site that actually
              <br /><em className="italic font-light">means something.</em>
            </h1>
            <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
              Corporate retreats, executive meetings, client entertainment, and team building days in a private lodge setting. One group at a time.
            </p>
          </div>
          <Link href="/contact?type=corporate" className="btn-primary">Begin Corporate Inquiry</Link>
        </div>
      </section>

      {/* Intro */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">
            <div>
              <div className="gold-rule mb-5" />
              <p className="eyebrow text-muted-brand mb-4">Why Rivers Lodge</p>
              <h2 className="font-serif font-light text-warm leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
                A Different
                <br /><em className="italic">Experience.</em>
              </h2>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                <p>The River's experience is genuinely different. It allows you to get away from the office and spend time with your team or clients in a distraction free environment that is a memorable experience.</p>
                <p>The Main Lodge accommodates any size group from 5 people to 300 people. Everything is custom and everything is built around your team.</p>
              </div>
            </div>
            <Picture
              src={BARN}
              alt="Rivers Barn exterior at dusk"
              className="aspect-[4/3] overflow-hidden w-full"
              imgClassName="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              width={800}
              height={600}
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* Event Types */}
      <section ref={typesRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div className="gold-rule mb-5" />
            <p className="eyebrow text-muted-brand mb-4">Event Types</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              What we host.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            {eventTypes.map((e) => (
              <div key={e.title} className="bg-surface overflow-hidden">
                <Picture
                  src={e.img}
                  alt={e.alt}
                  className="aspect-[16/9] overflow-hidden"
                  imgClassName="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  width={800}
                  height={450}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="p-8">
                  <div className="h-px w-6 mb-4" style={{ backgroundColor: "#9B4D19" }} />
                  <h3 className="font-serif text-warm text-xl mb-3">{e.title}</h3>
                  <p className="font-sans text-muted-brand text-sm leading-relaxed">{e.desc}</p>
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
            <div className="gold-rule mb-5" />
            <p className="eyebrow text-muted-brand mb-4">Plan Your Event</p>
            <h2 className="font-serif font-light text-warm leading-tight mb-6" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
              Tell us what you're planning.
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
              We work with a limited number of corporate groups each year. Share the basics and we'll respond within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact?type=corporate" className="btn-primary">Begin Inquiry</Link>
              <Link href="/lodging" className="btn-ghost">View Spaces &amp; Lodging</Link>
            </div>
          </div>
        </div>
      </section>

      </div>
    </PublicLayout>
  );
}
