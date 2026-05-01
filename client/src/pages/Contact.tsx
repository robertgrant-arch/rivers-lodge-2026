import { useState } from "react";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type InquiryType = "wedding" | "corporate" | "tour" | "general";

function getTypeFromSearch(): InquiryType {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("type");
  if (t === "wedding" || t === "corporate" || t === "tour" || t === "general") return t;
  return "general";
}

export default function Contact() {
  const [type, setType] = useState<InquiryType>(getTypeFromSearch);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    eventDate: "",
    guestCount: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submitInquiry = trpc.inquiries.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Your inquiry has been received. We'll be in touch within 24 hours.");
    },
    onError: (err) => {
      toast.error("Something went wrong. Please try again or email us directly.");
      console.error(err);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitInquiry.mutate({
      type,
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      eventDate: form.eventDate || undefined,
      guestCount: form.guestCount ? parseInt(form.guestCount) : undefined,
      message: form.message || undefined,
    });
  };

  const typeLabels: Record<InquiryType, string> = {
    wedding: "Wedding Inquiry",
    corporate: "Corporate / Group Event",
    tour: "Book a Private Tour",
    general: "General Inquiry",
  };

  return (
    <PublicLayout>
      <section className="pt-32 pb-24 md:pt-40 md:pb-32 bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
            {/* Left: Info */}
            <div>
              <div className="gold-rule" />
              <p className="eyebrow text-[oklch(0.55_0.012_70)] mb-4">Get in Touch</p>
              <h1
                className="font-serif font-light italic text-[oklch(0.94_0.008_78)] leading-tight mb-6"
                style={{ fontSize: "clamp(2rem,4vw,3.5rem)" }}
              >
                Let's start<br />the conversation.
              </h1>
              <p className="text-base font-sans text-muted-foreground leading-relaxed mb-8">
                Whether you're planning a wedding weekend, a corporate retreat, or simply want to walk the land — we'd love to hear from you. We respond to every inquiry within 24 hours.
              </p>

              <div className="flex flex-col gap-6 mb-10">
                <div>
                  <p className="text-[10px] tracking-[0.20em] uppercase font-sans text-muted-foreground mb-1">Address</p>
                  <p className="font-serif text-lg text-foreground">18103 E 2300 Ln, La Cygne, KS 66040</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.20em] uppercase font-sans text-muted-foreground mb-1">Distance from KC</p>
                  <p className="font-serif text-lg text-foreground">Approximately 60 minutes south</p>
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <p className="text-[10px] tracking-[0.20em] uppercase font-sans text-muted-foreground mb-4">What to Expect</p>
                <div className="flex flex-col gap-3">
                  {[
                    "We respond to every inquiry within 24 hours",
                    "Private tours are available by appointment",
                    "We host a limited number of weddings per year",
                    "Membership applications are reviewed on a rolling basis",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm font-sans text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0 mt-2" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div>
              {submitted ? (
                <div className="bg-secondary/40 border border-border p-10 text-center">
                  <div className="font-serif text-3xl text-foreground mb-4">Thank you.</div>
                  <p className="text-base font-sans text-muted-foreground leading-relaxed">
                    Your inquiry has been received. We'll be in touch within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Inquiry type */}
                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Inquiry Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(typeLabels) as [InquiryType, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setType(key)}
                          className={`py-2.5 px-4 text-[10px] tracking-[0.14em] uppercase font-sans transition-colors text-left ${
                            type === key
                              ? "bg-foreground text-background"
                              : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Name *</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Email *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                        placeholder="(555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">
                        {type === "wedding" || type === "corporate" ? "Preferred Date" : "Preferred Tour Date"}
                      </label>
                      <input
                        type="text"
                        value={form.eventDate}
                        onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                        className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                        placeholder="e.g. September 2025"
                      />
                    </div>
                  </div>

                  {(type === "wedding" || type === "corporate") && (
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Estimated Guest Count</label>
                      <input
                        type="number"
                        value={form.guestCount}
                        onChange={(e) => setForm({ ...form, guestCount: e.target.value })}
                        className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                        placeholder="e.g. 150"
                        min="1"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Message</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      rows={5}
                      className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors resize-none"
                      placeholder="Tell us about what you're imagining..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitInquiry.isPending}
                    className="w-full py-4 bg-foreground text-background text-xs tracking-[0.18em] uppercase font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {submitInquiry.isPending ? "Sending..." : "Send Inquiry"}
                  </button>

                  <p className="text-[10px] font-sans text-muted-foreground text-center">
                    We respond to every inquiry within 24 hours.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
