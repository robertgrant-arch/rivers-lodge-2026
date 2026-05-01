import { useState } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const HERO = "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg";
const HUNT = "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg";
const FISH = "/manus-storage/DJI_0017_538feef1.jpg";
const CLAY = "/manus-storage/Rivers_May2023-8_d07307f4.jpg";

const privileges = [
  { title: "10,000+ Acres", desc: "Private access to over 10,000 acres of managed Kansas hunting ground — no public access, no crowds, no compromise." },
  { title: "Guided Hunting", desc: "Expert local guides who know the land intimately. Whitetail, waterfowl, and turkey hunts guided by people who manage the habitat year-round." },
  { title: "Private Fisheries", desc: "Exclusive access to the Marais des Cygnes and estate ponds. Trophy bass, catfish, and crappie on water that sees no public pressure." },
  { title: "On-Site Lodging", desc: "Member rates on all estate lodging — from The Lodge to Ohana House on its own private lake." },
  { title: "Sporting Clays", desc: "Access to the sporting clays course for year-round practice, member events, and pre-season preparation." },
  { title: "Concierge Service", desc: "Direct access to estate staff for trip planning, equipment coordination, guide scheduling, and special requests." },
];

const seasons = [
  { name: "Whitetail", months: "Oct – Dec", icon: "🦌" },
  { name: "Waterfowl", months: "Nov – Jan", icon: "🦆" },
  { name: "Turkey", months: "Apr – May", icon: "🦃" },
  { name: "Fishing", months: "Year-Round", icon: "🎣" },
  { name: "Sporting Clays", months: "Year-Round", icon: "🎯" },
];

const tiers = [
  { name: "Standard", desc: "Full hunting and fishing access, member rates on lodging, seasonal updates.", highlight: false },
  { name: "Premier", desc: "Everything in Standard, plus priority booking, guest privileges, and dedicated concierge access.", highlight: true },
  { name: "Founding", desc: "Reserved for original members. Lifetime rates, first-right-of-renewal, and full estate privileges.", highlight: false },
];

export default function Membership() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", state: "", interests: "", referral: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const submitApp = trpc.membership.submitApplication.useMutation({
    onSuccess: () => { setSubmitted(true); toast.success("Application received. We'll be in touch."); },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitApp.mutate(form);
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[520px] flex items-end pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Membership at Rivers Lodge" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/80" />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
          <div className="h-px w-10 mb-6" style={{ backgroundColor: "oklch(0.58 0.065 145)" }} />
          <p className="eyebrow text-[oklch(0.94_0.008_78)/55] mb-4">Membership &amp; Outdoors</p>
          <h1
            className="font-serif font-light italic text-white leading-tight mb-6"
            style={{ fontSize: "clamp(2.5rem,6vw,5.5rem)" }}
          >
            Private access.<br />Season after season.
          </h1>
          <p className="text-[oklch(0.94_0.008_78)/75] font-sans text-base max-w-lg mb-10 leading-relaxed">
            A private membership club on 300 acres of managed Kansas hunting ground, private fisheries, and old-growth river corridor. Access is earned. Legacy is built here.
          </p>
          <a href="#apply" className="btn-primary">
            Apply for Membership
          </a>
        </div>
      </section>

      {/* Privileges */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="mb-12">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-3">Member Privileges</p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">What membership includes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {privileges.map((p) => (
              <div key={p.title} className="border-t border-border pt-6">
                <h3 className="font-serif text-xl text-foreground mb-3">{p.title}</h3>
                <p className="text-sm font-sans text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seasons */}
      <section className="section bg-[oklch(0.115_0.007_64)]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="mb-12">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-white/40 mb-3">The Calendar</p>
            <h2 className="font-serif text-3xl md:text-4xl text-white">A full season on the land</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {seasons.map((s) => (
              <div key={s.name} className="border border-white/15 p-6 text-center">
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-serif text-lg text-white mb-1">{s.name}</h3>
                <p className="text-[10px] tracking-[0.16em] uppercase font-sans text-white/40">{s.months}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {[
              { img: HUNT, label: "Whitetail & Waterfowl", href: "/hunt" },
              { img: FISH, label: "Fishing", href: "/fish" },
              { img: CLAY, label: "Sporting Clays", href: "/hunt#clays" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="group relative overflow-hidden aspect-[16/9] flex items-end">
                <img src={item.img} alt={item.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="relative z-10 p-5 font-serif text-lg text-white">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="mb-12">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-3">Membership Tiers</p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">Choose your level</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div key={tier.name} className={`p-8 border ${tier.highlight ? "bg-foreground text-background border-foreground" : "border-border"}`}>
                <h3 className={`font-serif text-2xl mb-4 ${tier.highlight ? "text-background" : "text-foreground"}`}>{tier.name}</h3>
                <p className={`text-sm font-sans leading-relaxed mb-6 ${tier.highlight ? "text-background/70" : "text-muted-foreground"}`}>{tier.desc}</p>
                <a href="#apply" className={`text-xs tracking-[0.14em] uppercase font-sans border-b pb-0.5 transition-colors ${tier.highlight ? "text-background border-background/40 hover:border-background" : "text-foreground border-foreground/30 hover:border-foreground"}`}>
                  Apply
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="section bg-[oklch(0.115_0.007_64)]">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">Membership Application</p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-6 leading-tight">
                Apply for<br /><span className="italic">membership.</span>
              </h2>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-4">
                Membership at Rivers Lodge is by application. We review applications on a rolling basis and respond within one week. Membership is limited — we keep the club small by design.
              </p>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-4">
                We are looking for members who share our values: respect for the land, ethical hunting and fishing practices, and a genuine appreciation for what a well-managed private estate can offer across generations.
              </p>
              <p className="text-base font-sans text-muted-foreground leading-relaxed">
                This is not a day-use club. It is a multi-generational relationship with a piece of Kansas that has been managed with intention for decades.
              </p>
            </div>
            <div>
              {submitted ? (
                <div className="bg-card border border-border p-10 text-center">
                  <div className="font-serif text-3xl text-foreground mb-4">Application received.</div>
                  <p className="text-base font-sans text-muted-foreground">We'll review your application and be in touch within one week.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Name *</label>
                      <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" placeholder="Full name" />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Email *</label>
                      <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" placeholder="your@email.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Phone</label>
                      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" placeholder="(555) 000-0000" />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">City, State</label>
                      <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" placeholder="Kansas City, MO" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Outdoor Interests</label>
                    <input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" placeholder="e.g. Whitetail, Waterfowl, Fishing, Sporting Clays" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">How did you hear about us?</label>
                    <input value={form.referral} onChange={(e) => setForm({ ...form, referral: e.target.value })} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" placeholder="Referral, social media, etc." />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Tell us about yourself</label>
                    <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors resize-none" placeholder="What draws you to Rivers Lodge?" />
                  </div>
                  <button type="submit" disabled={submitApp.isPending} className="w-full py-4 bg-foreground text-background text-xs tracking-[0.18em] uppercase font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {submitApp.isPending ? "Submitting..." : "Submit Application"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
