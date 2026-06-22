import { useRef, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "../../../_shared/components/PublicLayout";
import { trpc } from '@shared/lib/trpc';
import SEOHead from '@shared/components/SEOHead';


const HERO        = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/xZXSDWkpiCXfqsiU.jpg";
const AERIAL      = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/jPtEuiXynfNedkpV.jpg";
const RIVER       = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/aLRhjpmRWbewKvgx.jpg";
const FIELD       = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/RNvGygATwGRMluZa.jpg";
const TIMBER      = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/ydbhfuDouoqRGsqW.jpg";
const LODGE_EXT   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/TdlSWCLWjUxbkCAY.jpg";
const BARN        = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/GEBYbBimoPflfefP.jpg";
const INTERIOR    = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/JcuUUmANmAAHItUn.jpg";
const CLUBHOUSE   = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/ydbhfuDouoqRGsqW.jpg";
const FIRE_PIT    = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/ueUiZmGhmnLKziOQ.jpg";

function useFadeUp(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null);
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

const estateFacts = [
  { value: "300+", label: "Acres" },
  { value: "1",    label: "River" },
  { value: "5",    label: "Buildings" },
  { value: "16+",  label: "Bedrooms" },
  { value: "300",  label: "Event Capacity" },
  { value: "1 hr", label: "From Kansas City" },
];

const spaces = [
  { name: "The Lodge",          desc: "Main residence sleeping up to 20 guests across 8 bedrooms. Full kitchen, great room, and wraparound porch overlooking the river valley.", img: LODGE_EXT },
  { name: "Rivers Barn",        desc: "The estate's signature event venue. 6,000 sq ft of open timber-frame space accommodating up to 300 guests.", img: BARN },
  { name: "The Marais des Cygnes", desc: "The river that gives the property its character — wide, clear, and full of bass and catfish. The River Lawn runs along its bank.", img: RIVER },
  { name: "Clubhouse",          desc: "Full bar, dining room, and meeting space available to members and event guests.", img: CLUBHOUSE },
  { name: "Riverhouse Suites",  desc: "Four boutique suites positioned directly on the river bank with private porches and unobstructed water views.", img: INTERIOR },
  { name: "Timber & Grounds",   desc: "Old-growth timber lines the river corridor. Miles of maintained trail connect the lodge to the river through managed habitat.", img: TIMBER },
];

export default function Estate() {
  const { data: testimonials } = trpc.cms.getTestimonials.useQuery({ division: "general", featuredOnly: true });

  const storyRef  = useFadeUp();
  const spacesRef = useFadeUp();
  const mapRef    = useFadeUp();
  const ctaRef    = useFadeUp();

  return (
    <PublicLayout>
      <SEOHead
  title="The Estate"
  description="Explore the Rivers Lodge estate — 1,800 acres of private land, multiple venue spaces, luxury lodging, and a working farm along the Marais des Cygnes River."
  url="/estate"
/>

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="The Rivers Lodge estate" className="w-full h-full object-cover object-center" fetchPriority="high" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.80) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div className="gold-rule mb-5" />
          <p className="eyebrow text-white/50 mb-4">The Estate</p>
          <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(3rem,7.5vw,6.5rem)" }}>
            Thousands of acres.
            <br /><em className="italic font-light">One river.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-md leading-relaxed" style={{ fontSize: "0.9375rem" }}>
            A private estate on the Marais des Cygnes — an hour south of Kansas City, a world apart from everything else.
          </p>
        </div>
      </section>

      {/* Stats Strip */}
      <div className="bg-surface border-y border-border">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14 py-10">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-8">
            {estateFacts.map((f) => (
              <div key={f.label} className="stat-item">
                <span className="stat-value">{f.value}</span>
                <span className="stat-label">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Origin Story */}
      <section ref={storyRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-start">
            <div>
              <div className="gold-rule mb-5" />
              <p className="eyebrow text-muted-brand mb-4">The Property</p>
              <h2 className="font-serif font-light text-warm leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
                Built with intention.
                <br /><em className="italic">Tended with care.</em>
              </h2>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                <p>Rivers Lodge is a working private estate — not a resort, not a venue catalog. The land has been managed with a specific vision: the water holds fish, the fields hold game, and the spaces hold the kind of gatherings that people talk about for the rest of their lives.</p>
                <p>The estate sits on the Marais des Cygnes — a river that has shaped this part of Kansas for centuries. Five buildings, 16-plus bedrooms, and a staff that knows the property intimately.</p>
                <p>Whether you're here for a wedding weekend, a corporate retreat, or the opening weekend of whitetail season — Rivers Lodge is the kind of place you come back to.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={AERIAL} alt="Aerial view of Rivers Lodge" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-square overflow-hidden">
                  <img src={LODGE_EXT} alt="The Lodge exterior" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="aspect-square overflow-hidden">
                  <img src={FIELD} alt="River lawn at golden hour" className="w-full h-full object-cover" loading="lazy" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pull Quote */}
      <section className="section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-3xl">
            <blockquote className="pull-quote">
              "The land rewards those who know it. The river has been here longer than any of us. We built around it — not over it."
            </blockquote>
            <p className="eyebrow text-muted-brand mt-6" style={{ fontSize: "10px" }}>The Rivers Lodge &amp; Hunt Club</p>
          </div>
        </div>
      </section>

      {/* Named Spaces Grid */}
      <section ref={spacesRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div className="gold-rule mb-5" />
            <p className="eyebrow text-muted-brand mb-4">The Spaces</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Five buildings. One estate.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {spaces.map((s) => (
              <div key={s.name} className="bg-background overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={s.img} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-7">
                  <div className="h-px w-6 bg-gold mb-4" />
                  <h3 className="font-serif text-warm text-xl mb-3">{s.name}</h3>
                  <p className="font-sans text-muted-brand text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/lodging" className="link-arrow inline-flex justify-center">
              View Full Lodging &amp; Spaces Guide
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Location — aerial photo as estate map */}
      <section ref={mapRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={AERIAL} alt="Aerial view of the Rivers Lodge estate" className="w-full h-full object-cover" loading="lazy" />
              {[
                { label: "The Lodge",   top: "78%", left: "68%" },
                { label: "Rivers Barn", top: "55%", left: "75%" },
                { label: "River",       top: "22%", left: "62%" },
                { label: "Clubhouse",   top: "46%", left: "21%" },
              ].map((pt) => (
                <div key={pt.label} className="absolute flex items-center gap-2"
                  style={{ top: pt.top, left: pt.left, transform: "translate(-50%,-50%)" }}>
                  <div className="w-2 h-2 rounded-full bg-gold border border-white/60 shrink-0" />
                  <span className="eyebrow text-white bg-black/55 px-2 py-0.5 whitespace-nowrap" style={{ fontSize: "9px" }}>
                    {pt.label}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <div className="gold-rule mb-5" />
              <p className="eyebrow text-muted-brand mb-4">Location &amp; Directions</p>
              <h2 className="font-serif font-light text-warm leading-tight mb-8" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
                One hour south
                <br /><em className="italic">of Kansas City.</em>
              </h2>
              <p className="font-sans text-muted-brand leading-relaxed mb-8" style={{ fontSize: "0.9375rem" }}>
                Rivers Lodge is located in La Cygne, Kansas — 60 miles south of Kansas City along US-69. The drive takes guests from the city to the river valley in under an hour.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { label: "Address",          value: "18103 E 2300 Ln, La Cygne, KS 66040" },
                  { label: "From Kansas City", value: "60 miles · approx. 1 hour via US-69" },
                  { label: "Nearest Airport",  value: "Kansas City International (MCI) · 75 miles" },
                  { label: "Private Aviation", value: "Linn County Airport (K58) · 8 miles" },
                ].map((row) => (
                  <div key={row.label} className="flex gap-4 border-b border-border pb-3">
                    <span className="eyebrow text-muted-brand w-36 shrink-0" style={{ fontSize: "10px" }}>{row.label}</span>
                    <span className="font-sans text-warm text-sm">{row.value}</span>
                  </div>
                ))}
              </div>
              <a href="https://maps.google.com/?q=18103+E+2300+Ln,+La+Cygne,+KS+66040"
                target="_blank" rel="noopener noreferrer" className="link-arrow">
                Open in Google Maps
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials && testimonials.length > 0 && (
        <section className="section bg-background">
          <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
            <div className="mb-14">
              <div className="gold-rule mb-5" />
              <p className="eyebrow text-muted-brand">What Guests Say</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
              {testimonials.slice(0, 3).map((t: any) => (
                <div key={t.id} className="testimonial-card bg-background p-8 flex flex-col">
                  <blockquote className="font-serif italic text-warm text-lg leading-relaxed flex-1 mb-6">
                    "{t.quote || t.authorName}"
                  </blockquote>
                  <div className="border-t border-border pt-4">
                    <p className="text-warm font-sans text-sm font-medium">{t.authorName}</p>
                    {t.authorTitle && <p className="eyebrow text-muted-brand mt-1" style={{ fontSize: "10px" }}>{t.authorTitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Dual CTA */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            <div className="bg-surface p-10 lg:p-14 flex flex-col">
              <div className="h-px w-8 mb-6" style={{ backgroundColor: "oklch(0.70 0.060 50)" }} />
              <p className="eyebrow text-muted-brand mb-3">Weddings &amp; Events</p>
              <h3 className="font-serif font-light text-warm text-2xl leading-tight mb-5">Host your event on the estate.</h3>
              <p className="font-sans text-muted-brand text-sm leading-relaxed mb-8 flex-1">
                Destination weddings, corporate retreats, and private celebrations — exclusively yours for the weekend.
              </p>
              <Link href="/events" className="btn-outline self-start" style={{ borderColor: "oklch(0.70 0.060 50)", color: "oklch(0.70 0.060 50)" }}>
                Explore Events
              </Link>
            </div>
            <div className="bg-background p-10 lg:p-14 flex flex-col">
              <div className="h-px w-8 mb-6" style={{ backgroundColor: "oklch(0.58 0.065 145)" }} />
              <p className="eyebrow text-muted-brand mb-3">Membership &amp; Outdoors</p>
              <h3 className="font-serif font-light text-warm text-2xl leading-tight mb-5">Access the land season after season.</h3>
              <p className="font-sans text-muted-brand text-sm leading-relaxed mb-8 flex-1">
                Private hunting, fishing, and sporting access on 300 acres of managed Kansas land.
              </p>
              <Link href="/outdoors" className="btn-outline self-start" style={{ borderColor: "oklch(0.58 0.065 145)", color: "oklch(0.58 0.065 145)" }}>
                Explore Membership
              </Link>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
