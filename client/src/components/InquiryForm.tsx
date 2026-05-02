import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AvailabilityCalendar from "./AvailabilityCalendar";

type InquiryType = "wedding" | "corporate" | "membership" | "lodging" | "tour" | "event" | "general";

interface Props {
  defaultType?: InquiryType;
  track?: "weddings" | "outdoors";
  onSuccess?: () => void;
  className?: string;
}

const STEPS = ["Your Inquiry", "Event Details", "Contact Info"];

const TYPE_LABELS: Record<InquiryType, string> = {
  wedding: "Wedding",
  corporate: "Corporate Event",
  membership: "Membership",
  lodging: "Lodging",
  tour: "Property Tour",
  event: "Private Event",
  general: "General Inquiry",
};

export default function InquiryForm({ defaultType = "general", track, onSuccess, className = "" }: Props) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    type: defaultType as InquiryType,
    eventDate: "",
    guestCount: "",
    message: "",
    name: "",
    email: "",
    phone: "",
  });

  const submit = trpc.inquiries.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      onSuccess?.();
      const encodedName = encodeURIComponent(form.name);
      navigate(`/inquiry-confirmed?type=${form.type}&name=${encodedName}`);
    },
  });

  const accentColor = track === "outdoors" ? "var(--sage)" : "var(--gold)";

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canAdvance = () => {
    if (step === 0) return !!form.type;
    if (step === 1) return true; // date and guest count optional
    if (step === 2) return !!form.name && !!form.email;
    return false;
  };

  const handleSubmit = () => {
    submit.mutate({
      type: form.type,
      eventDate: form.eventDate || undefined,
      guestCount: form.guestCount ? parseInt(form.guestCount) : undefined,
      message: form.message || undefined,
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
    });
  };

  if (submitted) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-12 h-12 mx-auto mb-6 flex items-center justify-center border border-[var(--gold)]">
          <svg className="w-5 h-5 text-[var(--gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="eyebrow mb-3" style={{ color: accentColor }}>Inquiry Received</p>
        <h3 className="font-serif text-2xl text-white mb-3">Thank You</h3>
        <p className="text-white/50 font-sans text-sm leading-relaxed max-w-xs mx-auto">
          A member of our team will be in touch within one business day.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Progress indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-6 h-6 flex items-center justify-center text-[10px] font-sans font-medium transition-colors"
                style={{
                  background: i <= step ? accentColor : "transparent",
                  border: `1px solid ${i <= step ? accentColor : "rgba(255,255,255,0.15)"}`,
                  color: i <= step ? "oklch(0.12 0.015 66)" : "rgba(255,255,255,0.3)",
                }}
              >
                {i < step ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="text-[9px] tracking-[0.12em] uppercase font-sans hidden sm:block"
                style={{ color: i === step ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-px mx-3 transition-colors"
                style={{ background: i < step ? accentColor : "rgba(255,255,255,0.1)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Inquiry type */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-white/50 font-sans text-sm mb-5">What brings you to Rivers Lodge?</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPE_LABELS) as InquiryType[]).map((t) => (
              <button
                key={t}
                onClick={() => set("type", t)}
                className="px-4 py-3 text-left text-sm font-sans transition-all border"
                style={{
                  borderColor: form.type === t ? accentColor : "rgba(255,255,255,0.12)",
                  color: form.type === t ? "white" : "rgba(255,255,255,0.5)",
                  background: form.type === t ? `color-mix(in oklch, ${accentColor} 8%, transparent)` : "transparent",
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1 — Event details */}
      {step === 1 && (
        <div className="space-y-6">
          <p className="text-white/50 font-sans text-sm mb-2">Tell us about your event or stay.</p>

          {/* Availability calendar for date-sensitive inquiries */}
          {["wedding", "corporate", "lodging", "event", "tour"].includes(form.type) && (
            <div>
              <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-3">
                Preferred Date
              </label>
              <AvailabilityCalendar
                selectedDate={form.eventDate}
                onDateSelect={(d) => set("eventDate", d)}
                showLegend={true}
              />
              {form.eventDate && (
                <p className="mt-2 text-xs font-sans text-white/40">
                  Selected: {new Date(form.eventDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-2">
              Number of Guests
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={form.guestCount}
              onChange={(e) => set("guestCount", e.target.value)}
              placeholder="Approximate guest count"
              className="form-field w-full"
            />
          </div>

          <div>
            <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-2">
              Tell Us More
            </label>
            <textarea
              rows={4}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Share any details about your vision, specific needs, or questions…"
              className="form-field w-full resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 2 — Contact info */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-white/50 font-sans text-sm mb-2">How should we reach you?</p>

          <div>
            <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-2">
              Full Name <span style={{ color: accentColor }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your name"
              className="form-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-2">
              Email Address <span style={{ color: accentColor }}>*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="your@email.com"
              className="form-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Optional"
              className="form-field w-full"
            />
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 border border-white/8 bg-white/2">
            <p className="text-[9px] tracking-[0.12em] uppercase font-sans text-white/30 mb-3">Inquiry Summary</p>
            <div className="space-y-1.5 text-xs font-sans text-white/50">
              <div className="flex justify-between">
                <span>Type</span>
                <span className="text-white/70">{TYPE_LABELS[form.type]}</span>
              </div>
              {form.eventDate && (
                <div className="flex justify-between">
                  <span>Preferred Date</span>
                  <span className="text-white/70">
                    {new Date(form.eventDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              )}
              {form.guestCount && (
                <div className="flex justify-between">
                  <span>Guests</span>
                  <span className="text-white/70">{form.guestCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/8">
        {step > 0 ? (
          <button
            onClick={() => setStep(s => s - 1)}
            className="text-xs font-sans text-white/40 hover:text-white/70 transition-colors tracking-[0.1em] uppercase"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance()}
            className="btn-primary text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ "--btn-accent": accentColor } as React.CSSProperties}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canAdvance() || submit.isPending}
            className="btn-primary text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ "--btn-accent": accentColor } as React.CSSProperties}
          >
            {submit.isPending ? "Sending…" : "Send Inquiry"}
          </button>
        )}
      </div>

      {submit.isError && (
        <p className="mt-3 text-xs font-sans text-red-400/80">
          Something went wrong. Please try again or email us directly.
        </p>
      )}
    </div>
  );
}
