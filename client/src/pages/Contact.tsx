import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";

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

export default function Contact() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const defaultType = params.get("type") || "general";

  const validTypes = ["general", "wedding", "corporate", "tour", "membership", "lodging", "event"] as const;
  type InquiryType = typeof validTypes[number];
  const safeType: InquiryType = validTypes.includes(defaultType as InquiryType) ? (defaultType as InquiryType) : "general";

  const [form, setForm] = useState<{
    name: string; email: string; phone: string; type: InquiryType;
    eventDate: string; guestCount: string; message: string;
  }>({
    name: "", email: "", phone: "", type: safeType,
    eventDate: "", guestCount: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submit = trpc.inquiries.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e: { message: string }) => setError(e.message),
  });

  const formRef = useFadeUp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    submit.mutate({
      ...form,
      phone: form.phone || undefined,
      eventDate: form.eventDate || undefined,
      guestCount: form.guestCount ? parseInt(form.guestCount, 10) : undefined,
      message: form.message || undefined,
    });
  };

  const inquiryTypes: { value: InquiryType; label: string }[] = [
    { value: "wedding",    label: "Wedding" },
    { value: "corporate",  label: "Corporate Event" },
    { value: "membership", label: "Membership" },
    { value: "lodging",    label: "Lodging" },
    { value: "tour",       label: "Property Tour" },
    { value: "general",    label: "General Inquiry" },
  ];

  return (
    <PublicLayout>

      {/* Minimal Hero */}
      <section className="pt-40 pb-20 bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="gold-rule mb-5" />
          <p className="eyebrow text-muted-brand mb-4">Contact</p>
          <h1 className="font-serif font-light text-warm leading-[0.92]" style={{ fontSize: "clamp(2.5rem,5.5vw,4.5rem)" }}>
            Let's talk about
            <br /><em className="italic font-light">what you're planning.</em>
          </h1>
        </div>
      </section>

      {/* Split: Form + Info */}
      <section ref={formRef as React.RefObject<HTMLDivElement>} className="fade-up section bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-16 lg:gap-24">

            {/* Form */}
            <div>
              {submitted ? (
                <div className="py-20">
                  <div className="gold-rule mb-6" />
                  <h2 className="font-serif font-light text-warm text-3xl mb-4">Thank you.</h2>
                  <p className="font-sans text-muted-brand leading-relaxed" style={{ fontSize: "0.9375rem" }}>
                    We've received your inquiry and will respond within 24 hours. We look forward to speaking with you.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Inquiry type */}
                  <div>
                    <p className="eyebrow text-muted-brand mb-4" style={{ fontSize: "10px" }}>Inquiry Type</p>
                    <div className="flex flex-wrap gap-3">
                      {inquiryTypes.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, type: t.value }))}
                          className="text-[11px] tracking-[0.14em] uppercase font-sans px-5 py-2.5 border transition-all duration-200"
                          style={{
                            borderColor: form.type === t.value ? "var(--gold)" : "oklch(0.28 0.008 64)",
                            color: form.type === t.value ? "var(--gold)" : "oklch(0.55 0.012 70)",
                            backgroundColor: "transparent",
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="field">
                      <label htmlFor="name">Full Name</label>
                      <input id="name" type="text" required placeholder="Your name"
                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label htmlFor="email">Email Address</label>
                      <input id="email" type="email" required placeholder="your@email.com"
                        value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="field">
                      <label htmlFor="phone">Phone (optional)</label>
                      <input id="phone" type="tel" placeholder="(555) 000-0000"
                        value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    {(form.type === "wedding" || form.type === "corporate" || form.type === "event") && (
                      <div className="field">
                        <label htmlFor="eventDate">Event Date (if known)</label>
                        <input id="eventDate" type="date"
                          value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} />
                      </div>
                    )}
                  </div>

                  {(form.type === "wedding" || form.type === "corporate" || form.type === "event") && (
                    <div className="field">
                      <label htmlFor="guestCount">Estimated Guest Count</label>
                      <input id="guestCount" type="number" placeholder="e.g. 150"
                        value={form.guestCount} onChange={e => setForm(f => ({ ...f, guestCount: e.target.value }))} />
                    </div>
                  )}

                  <div className="field">
                    <label htmlFor="message">Tell us about your plans</label>
                    <textarea id="message" rows={5} required placeholder="Share any details that will help us respond helpfully..."
                      value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                  </div>

                  {error && <p className="font-sans text-sm" style={{ color: "oklch(0.65 0.18 25)" }}>{error}</p>}

                  <button
                    type="submit"
                    disabled={submit.isPending}
                    className="btn-primary"
                    style={{ opacity: submit.isPending ? 0.6 : 1 }}
                  >
                    {submit.isPending ? "Sending..." : "Send Inquiry"}
                  </button>
                </form>
              )}
            </div>

            {/* Info sidebar */}
            <div className="space-y-12">
              <div>
                <div className="gold-rule mb-5" />
                <p className="eyebrow text-muted-brand mb-4">Response Time</p>
                <p className="font-sans text-muted-brand text-sm leading-relaxed">
                  We respond to all inquiries within 24 hours. For urgent matters, please call us directly.
                </p>
              </div>
              <div>
                <p className="eyebrow text-muted-brand mb-4">Location</p>
                <p className="font-serif text-warm text-lg leading-snug mb-1">18103 E 2300 Ln</p>
                <p className="font-serif text-warm text-lg leading-snug mb-4">La Cygne, KS 66040</p>
                <a href="https://maps.google.com/?q=18103+E+2300+Ln,+La+Cygne,+KS+66040"
                  target="_blank" rel="noopener noreferrer"
                  className="link-arrow text-sm">
                  Get Directions
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
              </div>
              <div>
                <p className="eyebrow text-muted-brand mb-4">From Kansas City</p>
                <p className="font-sans text-muted-brand text-sm leading-relaxed">
                  60 miles south via US-69. Approximately 1 hour.
                </p>
              </div>
              <div>
                <p className="eyebrow text-muted-brand mb-4">Inquiries</p>
                <div className="space-y-2">
                  <div>
                    <p className="eyebrow text-muted-brand" style={{ fontSize: "9px" }}>Weddings &amp; Events</p>
                    <a href="mailto:events@riverslodge.com" className="font-sans text-warm text-sm hover:text-gold transition-colors">events@riverslodge.com</a>
                  </div>
                  <div>
                    <p className="eyebrow text-muted-brand" style={{ fontSize: "9px" }}>Membership</p>
                    <a href="mailto:membership@riverslodge.com" className="font-sans text-warm text-sm hover:text-gold transition-colors">membership@riverslodge.com</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
