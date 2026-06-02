import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "../components/PublicLayout";
import SEOHead from '@shared/components/SEOHead';
import StickyInquiryCTA from "@/components/StickyInquiryCTA";


const HERO     = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/ydbhfuDouoqRGsqW.jpg";
const BARN     = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/GEBYbBimoPflfefP.jpg";
const GROUNDS  = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/RNvGygATwGRMluZa.jpg";
const AERIAL   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/jPtEuiXynfNedkpV.jpg";
const LODGE    = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/TdlSWCLWjUxbkCAY.jpg";
const INTERIOR = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/JcuUUmANmAAHItUn.jpg";

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

const eventTypes = [
  { title: "Corporate Retreats",    desc: "Multi-day team retreats with lodging, dining, and curated outdoor programming. The Lodge sleeps up to 20; the Barn accommodates 300 for evening events.", img: LODGE },
  { title: "Executive Meetings",    desc: "Private meeting space in the Clubhouse for boards, leadership teams, and strategy sessions — away from the office, on the land.", img: INTERIOR },
  { title: "Client Entertainment",  desc: "Hunting days, fishing excursions, sporting clays, and private dinners. The most memorable client entertainment is the kind that can't be replicated.", img: GROUNDS },
  { title: "Team-Building Days",    desc: "Guided outdoor experiences — from clay shooting to river fishing — that build genuine connection without a single trust fall.", img: AERIAL },
];

const capacities = [
  { space: "Rivers Barn",          seated: "256", reception: "300", notes: "Full AV, catering kitchen" },
  { space: "Clubhouse",            seated: "40",  reception: "60",  notes: "Bar, private dining room" },
  { space: "River Lawn",           seated: "200", reception: "300", notes: "Outdoor ceremony & dinner" },
  { space: "The Lodge",            seated: "20",  reception: "20",  notes: "Exclusive overnight lodging" },
  { space: "Riverhouse Suites",    seated: "—",   reception: "—",   notes: "4 boutique suites" },
];

export default function Corporate() {
  const typesRef = useFadeUp();
  const capRef   = useFadeUp();
  const ctaRef   = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
  title="Corporate Outings & Events"
  description="Private corporate retreats, team-building hunts, and executive events at The Rivers Lodge — a world-class venue in La Cygne, Kansas."
  url="/corporate"
/>
      <div style={{ "--track-accent": "oklch(0.70 0.060 50)" } as React.CSSProperties}>

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Corporate events at Rivers Lodge" className="w-full h-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.80) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div className="gold-rule mb-5" />
          <p className="eyebrow text-white/50 mb-4">Corporate Outings &amp; Events</p>
          <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
            Off-site that actually
            <br /><em className="italic font-light">means something.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            Corporate retreats, executive meetings, client entertainment, and team-building days on a private 300-acre estate. One group at a time.
          </p>
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
                The land changes
                <br /><em className="italic">the conversation.</em>
              </h2>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                <p>There is a reason the best corporate decisions get made away from the office. Rivers Lodge provides the kind of environment that strips away distraction and replaces it with clarity — open land, clean air, and the particular focus that comes from being somewhere genuinely different.</p>
                <p>The estate accommodates groups from 10 to 300. The Lodge sleeps 20 overnight guests. The Rivers Barn seats 256 for formal dinners. The Clubhouse provides private meeting space. And the 300 acres provide the programming.</p>
              </div>
            </div>
            <div className="aspect-[4/3] overflow-hidden">
              <img src={BARN} alt="Rivers Barn exterior at dusk" className="w-full h-full object-cover" loading="lazy" />
            </div>
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
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={e.img} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-8">
                  <div className="h-px w-6 mb-4" style={{ backgroundColor: "oklch(0.70 0.060 50)" }} />
                  <h3 className="font-serif text-warm text-xl mb-3">{e.title}</h3>
                  <p className="font-sans text-muted-brand text-sm leading-relaxed">{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capacity Table */}
      <section ref={capRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-12">
            <div className="gold-rule mb-5" />
            <p className="eyebrow text-muted-brand mb-4">Venue Capacities</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Space for every format.
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left eyebrow text-muted-brand pb-4 pr-8" style={{ fontSize: "10px" }}>Space</th>
                  <th className="text-left eyebrow text-muted-brand pb-4 pr-8" style={{ fontSize: "10px" }}>Seated Dinner</th>
                  <th className="text-left eyebrow text-muted-brand pb-4 pr-8" style={{ fontSize: "10px" }}>Reception</th>
                  <th className="text-left eyebrow text-muted-brand pb-4" style={{ fontSize: "10px" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {capacities.map((row, i) => (
                  <tr key={row.space} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-surface/30"}`}>
                    <td className="py-4 pr-8 text-warm font-medium">{row.space}</td>
                    <td className="py-4 pr-8 text-muted-brand">{row.seated}</td>
                    <td className="py-4 pr-8 text-muted-brand">{row.reception}</td>
                    <td className="py-4 text-muted-brand">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <StickyInquiryCTA
        href="/contact?type=corporate"
        label="Begin Corporate Inquiry"
      />
    </PublicLayout>
  );
}
