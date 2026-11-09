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

/** Slim labeled divider on a solid Night band — the same section break used on /weddings. */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="bg-[#2B2823] py-6 lg:py-8" role="presentation">
      <div className="max-w-[1440px] mx-auto px-5 lg:px-14 flex items-center justify-center gap-6">
        <div aria-hidden="true" className="flex-1 h-px bg-[#E0D3BD]/25" />
        <p className="text-[11px] uppercase tracking-[0.2em] font-sans text-[#E0D3BD]/80 whitespace-nowrap">{label}</p>
        <div aria-hidden="true" className="flex-1 h-px bg-[#E0D3BD]/25" />
      </div>
    </div>
  );
}

/** Corporate activities. Add or reorder entries here; omit `img` for a text-only card. */
type Activity = {
  title: string;
  desc: string;
  img?: string;
  alt?: string;
  objectPosition?: string;
};

const ACTIVITIES: Activity[] = [
  { title: "SPORTING CLAYS", desc: "Target shooting experience for team building.",          img: "/img/fivestand-hero.jpg", alt: "Guest shooting sporting clays from a five stand station at Rivers Lodge", objectPosition: "center 35%" },
  { title: "TROUT FISHING",  desc: "Guided stream fishing on the water.",                    img: "/img/fishing%202.JPG",    alt: "Angler in waders holding a trout in the stream at Rivers Lodge", objectPosition: "center 60%" },
  { title: "POND FISHING",   desc: "Relaxed access to our stocked ponds.",                   img: "/img/MHR53675.jpg",       alt: "Guest holding a bass caught on one of the stocked ponds at Rivers Lodge", objectPosition: "center 40%" },
  { title: "ARCHERY",        desc: "Outdoor archery range for group fun." },
  { title: "RANGER TOURS",   desc: "Guided utility vehicle tours across the land." },
  { title: "HIKING",         desc: "Trails through oak and hickory timber and native prairie." },
];

/** Sample retreat day. `time` is the 24-hour value for the <time> element. */
const RETREAT_SCHEDULE: { time: string; label: string; activity: string }[] = [
  { time: "09:00", label: "9:00 AM",  activity: "Morning Breakfast & Coffee" },
  { time: "10:00", label: "10:00 AM", activity: "Team Meeting" },
  { time: "12:00", label: "12:00 PM", activity: "Lunch Break" },
  { time: "13:30", label: "1:30 PM",  activity: "Outdoor Activity (Fishing, Clays, or Tour)" },
  { time: "16:00", label: "4:00 PM",  activity: "Downtime" },
  { time: "18:30", label: "6:30 PM",  activity: "Group Dinner & Drinks" },
  { time: "20:00", label: "8:00 PM",  activity: "Evening Fireside Social" },
];

function ActivityCard({ a }: { a: Activity }) {
  return (
    <article className="h-full flex flex-col bg-[#2B2823] overflow-hidden">
      {a.img ? (
        <Picture
          src={a.img}
          alt={a.alt ?? a.title}
          label={a.title}
          className="aspect-[4/3] overflow-hidden"
          imgClassName="absolute inset-0 w-full h-full object-cover"
          imgStyle={{ objectPosition: a.objectPosition ?? "center" }}
          loading="lazy"
          decoding="async"
          width={800}
          height={600}
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
        />
      ) : (
        <div className="aspect-[4/3] bg-[#6B7250] flex flex-col items-center justify-center gap-4 px-6" aria-hidden="true">
          <div className="h-px w-8 bg-[#E0D3BD]/60" />
          {/* 24px = WCAG "large text"; Sand on Grass is 3.4:1, which meets AA for large text */}
          <span className="font-sans uppercase text-[#E0D3BD] text-center" style={{ fontSize: "1.5rem", letterSpacing: "0.18em" }}>{a.title}</span>
          <div className="h-px w-8 bg-[#E0D3BD]/60" />
        </div>
      )}
      <div className="flex-1 p-7 lg:p-8">
        <div className="h-px w-6 mb-4" style={{ backgroundColor: "#9B4D19" }} />
        <h3 className="font-sans font-medium uppercase text-[#E0D3BD] mb-3" style={{ fontSize: "0.9375rem", letterSpacing: "0.12em" }}>{a.title}</h3>
        <p className="font-sans text-[#BABAAE] text-sm leading-relaxed">{a.desc}</p>
      </div>
    </article>
  );
}

const eventTypes = [
  { title: "Corporate Retreats",    desc: "Multi-day team retreats with lodging, dining, and curated outdoor programming. From 5 to 250 people Lodge events are custom built for your team's retreat.", img: CORP_RETREAT,   alt: "Corporate retreat at the Clubhouse" },
  { title: "Executive Meetings",    desc: "Private meeting space in the Clubhouse for boards, leadership teams, and strategy sessions — away from the office, on the land.", img: INTERIOR,       alt: "Executive meetings at Rivers Lodge" },
  { title: "Client Entertainment",  desc: "Hunting days, fishing excursions, sporting clays, and private dinners. The most memorable client entertainment is the kind that can't be replicated.", img: CORP_ENTERTAIN, alt: "Client entertainment at Rivers Lodge" },
  { title: "Team-Building Days",    desc: "Guided outdoor experiences — from clay shooting to premier fishing opportunities — that build genuine connection without a single trust fall.", img: AERIAL,          alt: "Team-building days at Rivers Lodge" },
];


export default function Corporate() {
  const typesRef = useFadeUp();
  const activitiesRef = useFadeUp();
  const scheduleRef = useFadeUp();
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
      <SectionDivider label="Why Rivers Lodge" />
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
                <p>We can sleep up to 23 guests on site and host meetings of any size, up to 250 people. Our private estate gives groups space to work, stay, dine, and enjoy nature together.</p>
              </div>
            </div>
            <Picture
              src={BARN}
              alt="The Event Barn exterior at dusk"
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
      <SectionDivider label="Event Types" />
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

      {/* Activities */}
      <SectionDivider label="Activities" />
      <section ref={activitiesRef as React.RefObject<HTMLDivElement>} aria-labelledby="corp-activities-heading" className="fade-up section bg-[#E0D3BD]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14 max-w-2xl">
            <div className="gold-rule mb-5" />
            <p className="eyebrow text-[#2B2823]/80 mb-4">Activities Overview</p>
            <h2 id="corp-activities-heading" className="font-serif font-light text-[#2B2823] leading-tight mb-6" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Beyond the boardroom.
            </h2>
            <p className="font-sans text-[#2B2823] leading-relaxed" style={{ fontSize: "0.9375rem" }}>
              Help your team get out of the boardroom and explore the grounds.
            </p>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {ACTIVITIES.map((a) => (
              <li key={a.title}><ActivityCard a={a} /></li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sample Retreat Schedule */}
      <SectionDivider label="Sample Itinerary" />
      <section ref={scheduleRef as React.RefObject<HTMLDivElement>} aria-labelledby="corp-schedule-heading" className="fade-up section bg-[#2B2823]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-3xl">
            <div className="mb-12">
              <div className="gold-rule mb-5" />
              <h2 id="corp-schedule-heading" className="font-serif font-light text-[#E0D3BD] leading-tight mb-4" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
                A day at the Lodge.
              </h2>
              <p className="font-sans uppercase text-[#BABAAE]" style={{ fontSize: "0.75rem", letterSpacing: "0.18em" }}>
                Sample (Corporate) Retreat Schedule
              </p>
            </div>
            <ol className="relative border-l border-[#E0D3BD]/25 ml-[5px] sm:ml-0 sm:border-l-0">
              {RETREAT_SCHEDULE.map((s) => (
                <li key={s.time} className="relative grid grid-cols-1 sm:grid-cols-[8.5rem_1fr] gap-1 sm:gap-8 pl-7 sm:pl-0 py-5 border-b border-[#E0D3BD]/15 last:border-b-0">
                  <span aria-hidden="true" className="absolute left-[-5px] top-[1.65rem] sm:hidden h-[9px] w-[9px] rounded-full bg-[#9B4D19]" />
                  <time dateTime={s.time} className="font-sans font-medium uppercase text-[#E0D3BD] sm:text-right sm:pr-8 sm:border-r sm:border-[#9B4D19]/70" style={{ fontSize: "0.8125rem", letterSpacing: "0.14em", lineHeight: "1.9" }}>
                    {s.label}
                  </time>
                  <span className="font-serif text-[#E0D3BD]" style={{ fontSize: "1.25rem", lineHeight: "1.4" }}>{s.activity}</span>
                </li>
              ))}
            </ol>
            <p className="font-sans italic text-[#BABAAE] mt-10" style={{ fontSize: "0.875rem" }}>
              Every retreat is custom. We'll build your schedule around your team.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <SectionDivider label="Plan Your Event" />
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
