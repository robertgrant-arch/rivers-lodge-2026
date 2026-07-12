import { useRef, useEffect, useState } from "react";
import { Link } from "wouter";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import PublicLayout from "@/components/PublicLayout";
import Picture from "@shared/components/Picture";
import SEOHead, { structuredData } from '@shared/components/SEOHead';
import { useAuth } from '@features/auth/public';
import { trpc } from '@shared/lib/trpc';

const STAFF_ROLES_M = ["admin", "owner", "venue_sales", "events_manager", "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance"];

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const HERO   = "/img/Ohana%20Aerial.jpg"; /* TODO: replace with dedicated membership hero once uploaded */
const AERIAL = "/img/Ohana%20Aerial.jpg";

type MembershipTier = "Individual" | "Corporate" | "Not Sure Yet";

const ACCENT = "#6B7250";

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

const benefits = [
  { title: "Private Events",         desc: "Exclusive member events throughout the year — concerts, chef tours, lodge parties, and seasonal gatherings." },
  { title: "Guided Hunting",         desc: "Guided whitetail, waterfowl, turkey, and upland hunts with dedicated hunt managers and full field support." },
  { title: "DIY Hunting Access",     desc: "Self-guided access to the property's timber, food plots, river bottom, and blinds on your own schedule." },
  { title: "Guided Fishing",         desc: "Guided trips on the Marais des Cygnes, private lakes, and river sloughs for bass, catfish, crappie, and bluegill." },
  { title: "DIY Fishing Access",     desc: "Unrestricted DIY fishing access on select properties." },
  { title: "Lodging Priority",       desc: "Priority booking on The Lodge, Riverhouse Suites, The Annex, and all other lodge accommodations." },
  { title: "Land Access & Updates",  desc: "Year-round land access and seasonal stewardship updates — stay connected to the property between visits." },
  { title: "Guest Privileges",       desc: "Bring guests onto the property for hunting, fishing, sporting days, and member events." },
];

const tiers = [
  {
    name: "Individual" as MembershipTier,
    desc: "One designated member with full access to hunting, fishing, private events, and lodge amenities.",
    features: [
      "Private events — concerts, chef tours, parties",
      "Guided and DIY Hunting access",
      "Guided and DIY Fishing access",
      "Land access & stewardship updates",
      "Lodging priority booking",
      "Guest privileges",
    ],
  },
  {
    name: "Corporate" as MembershipTier,
    desc: "Three designated members — ideal for companies who want to entertain clients and reward teams on the Lodge.",
    features: [
      "Three designated members",
      "Private events — concerts, chef tours, parties",
      "Guided and DIY Hunting access",
      "Guided and DIY Fishing access",
      "Land access & stewardship updates",
      "Lodging priority booking",
      "Guest privileges",
    ],
  },
];

function MembershipInquiryForm({ initialTier }: { initialTier: MembershipTier | "" }) {
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    membershipInterest: initialTier as MembershipTier | "",
    message: "",
  });

  // Sync initialTier when the parent updates it (tier "Apply" click)
  useEffect(() => {
    if (initialTier) {
      setForm((f) => ({ ...f, membershipInterest: initialTier }));
    }
  }, [initialTier]);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const submit = trpc.inquiries.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: () => {
      turnstileRef.current?.reset();
      setCaptchaToken("");
    },
  });

  const canSubmit =
    !!form.name &&
    !!form.email &&
    !!form.phone &&
    !!form.membershipInterest &&
    !submit.isPending &&
    (!TURNSTILE_SITE_KEY || !!captchaToken);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const fullMessage = [
      `Membership Interest: ${form.membershipInterest}`,
      `Source: Membership page`,
      form.message ? `\n${form.message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    submit.mutate({
      type: "membership",
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      message: fullMessage,
      captchaToken,
    });
  };

  if (submitted) {
    return (
      <div className="max-w-2xl" role="status">
        <div
          className="flex items-start gap-4 p-6 border"
          style={{ borderColor: ACCENT }}
        >
          <div
            className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
            style={{ border: `1px solid ${ACCENT}` }}
            aria-hidden="true"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: ACCENT }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="eyebrow mb-2" style={{ color: ACCENT }}>Inquiry Received</p>
            <p className="font-sans text-warm leading-relaxed" style={{ fontSize: "0.9375rem" }}>
              Thank you — we've received your membership inquiry. A member of our team will be in touch shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-5" aria-label="Membership inquiry form">
      <div className="mt-5">
        <label htmlFor="m-name" className="block text-white/70 tracking-wider text-xs mb-2">
          Full Name <span style={{ color: ACCENT }} aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          id="m-name"
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Your full name"
          className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition"
          required
          aria-required="true"
          autoComplete="name"
        />
      </div>

      <div className="mt-5">
        <label htmlFor="m-email" className="block text-white/70 tracking-wider text-xs mb-2">
          Email Address <span style={{ color: ACCENT }} aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          id="m-email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition"
          required
          aria-required="true"
          autoComplete="email"
        />
      </div>

      <div className="mt-5">
        <label htmlFor="m-phone" className="block text-white/70 tracking-wider text-xs mb-2">
          Phone Number <span style={{ color: ACCENT }} aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          id="m-phone"
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="(555) 555-5555"
          className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition"
          required
          aria-required="true"
          autoComplete="tel"
        />
      </div>

      <div className="mt-5">
        <label htmlFor="m-interest" className="block text-white/70 tracking-wider text-xs mb-2">
          Membership Interest <span style={{ color: ACCENT }} aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <select
          id="m-interest"
          value={form.membershipInterest}
          onChange={(e) => set("membershipInterest", e.target.value)}
          className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition"
          required
          aria-required="true"
        >
          <option value="" disabled>Select a tier…</option>
          <option value="Individual">Individual</option>
          <option value="Corporate">Corporate</option>
          <option value="Not Sure Yet">Not Sure Yet</option>
        </select>
      </div>

      <div className="mt-5">
        <label htmlFor="m-message" className="block text-white/70 tracking-wider text-xs mb-2">
          Tell Us About Your Interest <span style={{ color: ACCENT }} aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <textarea
          id="m-message"
          rows={4}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Tell us a bit about your interest in hunting, fishing, lodging access, or the property."
          className="w-full rounded-md bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#9B4D19]/60 focus:border-[#9B4D19] transition resize-y"
          required
          aria-required="true"
        />
      </div>

      {TURNSTILE_SITE_KEY && (
        <div className="mt-4">
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
            onError={() => setCaptchaToken("")}
            options={{ theme: "dark" }}
          />
        </div>
      )}

      {submit.isError && (
        <p className="text-sm font-sans text-red-600" role="alert">
          Something went wrong. Please try again or email us at{" "}
          <a href="mailto:info@riverslodge.com" className="underline">info@riverslodge.com</a>.
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex items-center justify-center rounded-md bg-[#9B4D19] hover:bg-[#B4591E] disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase tracking-widest text-sm px-8 py-3 transition"
      >
        {submit.isPending ? "Sending…" : "SUBMIT MEMBERSHIP INQUIRY"}
      </button>
    </form>
  );
}

export default function Membership() {
  const benefitsRef = useFadeUp();
  const tiersRef    = useFadeUp();
  const applyRef    = useFadeUp();

  const [selectedTier, setSelectedTier] = useState<MembershipTier | "">("");

  const { user, isAuthenticated } = useAuth();
  const memberStatus = trpc.membership.myStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const isStaffM = !!user?.role && STAFF_ROLES_M.includes(user.role as string);
  const isActiveMember = isStaffM || (!!memberStatus.data && memberStatus.data.active);

  const handleApply = (tier: MembershipTier) => {
    setSelectedTier(tier);
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <PublicLayout>
      <SEOHead
  title="Membership"
  description="Apply for an exclusive sporting membership at The Rivers Lodge & Hunt Club — hunting, fishing, lodging, and a private community in Kansas."
  url="/membership"
  structuredData={structuredData.membershipClub()}
/>
      <div style={{ "--track-accent": ACCENT } as React.CSSProperties}>

      {/* Active member shortcut banner */}
      {isActiveMember && (
        <div className="bg-[#2B2823] border-b border-[#57544E] px-5 lg:px-14 pt-24 lg:pt-28 pb-3 flex items-center justify-between gap-4">
          <p className="text-[11px] tracking-[0.14em] uppercase font-sans text-[#9B4D19]">
            You are an active member
          </p>
          <Link
            href="/portal"
            className="text-[11px] tracking-[0.14em] uppercase font-sans font-medium border border-[#9B4D19] text-[#9B4D19] px-4 py-1.5 hover:bg-[#9B4D19] hover:text-[#2B2823] transition-all duration-200 shrink-0"
          >
            Go to Member Portal →
          </Link>
        </div>
      )}

      {/* Hero */}
      <section className="relative hero-full flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <Picture
            src={HERO}
            alt="Membership at Rivers Lodge"
            className="absolute inset-0 w-full h-full"
            imgClassName="absolute inset-0 w-full h-full object-cover"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            width={1920}
            height={1080}
            sizes="100vw"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, oklch(0 0 0/0.12) 40%, oklch(0 0 0/0.82) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-14 w-full">
          <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
          <p className="eyebrow text-white/50 mb-4">Membership</p>
          <h1 className="font-serif font-light text-white leading-[0.92] mb-6" style={{ fontSize: "clamp(2.75rem,6.5vw,5.5rem)" }}>
            Hunt, fish, and
            <br /><em className="italic font-light">belong.</em>
          </h1>
          <p className="font-sans text-white/65 max-w-lg leading-relaxed mb-10" style={{ fontSize: "0.9375rem" }}>
            A private club built on creating quality experiences for members and their families
          </p>
          <a href="#apply" className="btn-outline" style={{ borderColor: ACCENT, color: ACCENT }}>
            Apply for Membership
          </a>
        </div>
      </section>

      {/* Philosophy */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">
            <div>
              <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
              <p className="eyebrow text-muted-brand mb-4">The Philosophy</p>
              <h2 className="font-serif font-light text-warm leading-tight mb-8" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
                Land, community,
                <br /><em className="italic">and the way it's used.</em>
              </h2>
              <div className="space-y-5 font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                <p>Rivers Lodge membership is built around the land — Hunting, Fishing, private events, and a community of people who take long-term stewardship seriously. Members get access to thousands of acres of managed Kansas and Missouri property, priority lodging, and an exclusive calendar of concerts, chef tours, estate parties, and seasonal gatherings.</p>
                <p>We keep the membership intentionally small. The land is never over-pressured, the experience is never crowded, and the community remains one where everyone knows each other. Membership is by invitation.</p>
              </div>
            </div>
            <div />
          </div>
        </div>
      </section>

      {/* Pull Quote */}
      <section className="section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="max-w-3xl">
            <blockquote className="pull-quote" style={{ borderLeftColor: ACCENT }}>
              "We limit membership to protect the land and the experience. The people who belong here know why that matters."
            </blockquote>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section ref={benefitsRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Member Benefits</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              What membership includes.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {benefits.map((b) => (
              <div key={b.title} className="bg-background p-7">
                <div style={{ height: "1px", width: "1.5rem", backgroundColor: ACCENT, marginBottom: "1rem" }} />
                <h3 className="font-serif text-warm text-lg mb-3">{b.title}</h3>
                <p className="font-sans text-muted-brand text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section ref={tiersRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Membership Tiers</p>
            <h2 className="font-serif font-light text-warm leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              Two membership types.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            {tiers.map((tier) => (
              <div key={tier.name} className="p-8 lg:p-10 flex flex-col bg-background">
                <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
                <h3 className="font-serif font-light text-warm leading-tight mb-4" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>{tier.name}</h3>
                <p className="font-sans text-muted-brand text-sm leading-relaxed mb-6">{tier.desc}</p>
                <ul className="space-y-2 flex-1 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 font-sans text-sm text-muted-brand">
                      <span style={{ color: ACCENT, marginTop: "2px", flexShrink: 0 }}>—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleApply(tier.name)}
                  className="btn-outline self-start text-xs"
                  style={{ borderColor: ACCENT, color: ACCENT }}
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply */}
      <section id="apply" ref={applyRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-10">
            <div style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-muted-brand mb-4">Apply for Membership</p>
            <h2 className="font-serif font-light text-warm leading-tight mb-6" style={{ fontSize: "clamp(1.875rem,3.5vw,3rem)" }}>
              Tell us about yourself.
            </h2>
            <p className="font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem", maxWidth: "38rem" }}>
              Membership is by invitation. Share a bit about yourself and your interest in the property and we'll be in touch.
            </p>
          </div>
          <MembershipInquiryForm initialTier={selectedTier} />
        </div>
      </section>

      </div>
    </PublicLayout>
  );
}
