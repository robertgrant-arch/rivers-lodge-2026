import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { trpc } from '@shared/lib/trpc';
import AvailabilityCalendar from "../../../booking-engine/client/components/AvailabilityCalendar";

// Read at module init — env var is baked in at build time by Vite.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

type InquiryType = "wedding" | "corporate" | "membership" | "lodging" | "tour" | "event" | "general";

interface Props {
  defaultType?: InquiryType;
  track?: "weddings" | "outdoors";
  /** Restrict the type selector to a specific subset. Falls back to all types when omitted. */
  allowedTypes?: InquiryType[];
  /** Called when the user selects a type tile in step 0. Parent can use this to swap renderers. */
  onTypeChange?: (type: InquiryType) => void;
  onSuccess?: () => void;
  className?: string;
}

const STEPS = ["Your Inquiry", "Event Details", "Contact Info"];

const TYPE_LABELS: Record<InquiryType, string> = {
  wedding: "Wedding",
  corporate: "Corporate",
  membership: "Membership",
  lodging: "Lodging",
  tour: "Property Tour",
  event: "Private Event",
  general: "General Inquiry",
};

export default function InquiryForm({ defaultType = "general", track, allowedTypes, onTypeChange, onSuccess, className = "" }: Props) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const turnstileRef = useRef<TurnstileInstance>(null);

  const visibleTypes: InquiryType[] = allowedTypes ?? (Object.keys(TYPE_LABELS) as InquiryType[]);
  // If defaultType was stripped from the allowed set, fall back to the first visible type.
  const resolvedDefault: InquiryType = visibleTypes.includes(defaultType as InquiryType)
    ? (defaultType as InquiryType)
    : visibleTypes[0];

  const [form, setForm] = useState({
    type: resolvedDefault,
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
    onError: () => {
      // Reset the widget so the user can get a fresh token on retry.
      turnstileRef.current?.reset();
      setCaptchaToken("");
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
      // In dev (no TURNSTILE_SITE_KEY), the server bypasses verification so
      // an empty string is accepted.  In production, the widget always provides
      // a non-empty token before the Submit button becomes clickable.
      captchaToken,
    });
  };

  if (submitted) {
    return (
      <div className={`text-center py-12 ${className}`} role="status">
        <div className="w-12 h-12 mx-auto mb-6 flex items-center justify-center border border-[var(--gold)]" aria-hidden="true">
          <svg className="w-5 h-5 text-[var(--gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
      {/* Screen-reader step announcement — updates whenever step changes */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      {/* Progress indicator */}
      <div className="flex items-center gap-0 mb-8" role="list" aria-label="Form progress">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1" role="listitem">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-6 h-6 flex items-center justify-center text-[10px] font-sans font-medium transition-colors"
                aria-hidden="true"
                style={{
                  background: i <= step ? accentColor : "transparent",
                  border: `1px solid ${i <= step ? accentColor : "rgba(255,255,255,0.15)"}`,
                  color: i <= step ? "#2B2823" : "rgba(255,255,255,0.3)",
                }}
              >
                {i < step ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="text-[9px] tracking-[0.12em] uppercase font-sans"
                aria-current={i === step ? "step" : undefined}
                style={{ color: i === step ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}
              >
                {/* Always in DOM for screen readers; visually hidden on small screens */}
                <span className="hidden sm:inline">{label}</span>
                <span className="sr-only sm:hidden">{label}{i === step ? " (current)" : i < step ? " (complete)" : ""}</span>
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-px mx-3 transition-colors"
                aria-hidden="true"
                style={{ background: i < step ? accentColor : "rgba(255,255,255,0.1)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Inquiry type */}
      {step === 0 && (
        <fieldset className="border-0 p-0 m-0">
          <legend className="text-white/50 font-sans text-sm mb-5 w-full">
            What brings you to Rivers Lodge?
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {visibleTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { set("type", t); onTypeChange?.(t); }}
                aria-pressed={form.type === t}
                className="px-4 py-3 text-left text-sm font-sans transition-all border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  outlineColor: accentColor,
                  borderColor: form.type === t ? accentColor : "rgba(255,255,255,0.12)",
                  color: form.type === t ? "white" : "rgba(255,255,255,0.5)",
                  background: form.type === t ? `color-mix(in oklch, ${accentColor} 8%, transparent)` : "transparent",
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <p className="mt-5 text-[11px] font-sans text-white/30 leading-relaxed">
            We respond to all inquiries within 24 hours. Your dedicated coordinator will guide you from first contact through every detail.
          </p>
        </fieldset>
      )}

      {/* Step 1 — Event details */}
      {step === 1 && (
        <div className="space-y-6">
          <p className="text-white/50 font-sans text-sm">Tell us about your event or stay.</p>

          {/* Availability calendar for date-sensitive inquiries */}
          {["wedding", "corporate", "lodging", "event", "tour"].includes(form.type) && (
            <div>
              <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-3" htmlFor="eventDate">
                Preferred Date
              </label>
              <AvailabilityCalendar
                selectedDate={form.eventDate}
                onDateSelect={(d) => set("eventDate", d)}
                showLegend={true}
              />
              {form.eventDate && (
                <p className="mt-2 text-xs font-sans text-white/40" aria-live="polite">
                  Selected:{" "}
                  {new Date(form.eventDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-2" htmlFor="guestCount">
              Number of Guests
            </label>
            <input
              id="guestCount"
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
            <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-2" htmlFor="message">
              Tell Us More
            </label>
            <textarea
              id="message"
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
          <p className="text-white/50 font-sans text-sm">How should we reach you?</p>

          <div>
            <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-2" htmlFor="fullName">
              Full Name <span style={{ color: accentColor }} aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your name"
              className="form-field w-full"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-2" htmlFor="emailAddress">
              Email Address <span style={{ color: accentColor }} aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="emailAddress"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="your@email.com"
              className="form-field w-full"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label className="block text-[9px] tracking-[0.14em] uppercase font-sans text-white/40 mb-2" htmlFor="phoneNumber">
              Phone Number <span className="normal-case opacity-60">(optional)</span>
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Optional"
              className="form-field w-full"
            />
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 border border-white/8 bg-white/2" role="region" aria-label="Inquiry summary">
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

      {/* Turnstile widget — only shown on the final step, only when a site key is configured.
          In development (no VITE_TURNSTILE_SITE_KEY), the widget is omitted and the server
          bypasses verification automatically so local dev keeps working. */}
      {step === STEPS.length - 1 && TURNSTILE_SITE_KEY && (
        <div className="mt-6">
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
            onError={() => setCaptchaToken("")}
            options={{ theme: "dark", size: "normal" }}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/8">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            aria-label={`Back to ${STEPS[step - 1]}`}
            className="text-xs font-sans text-white/40 hover:text-white/70 transition-colors tracking-[0.1em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:rounded-sm"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance()}
            aria-label={`Continue to ${STEPS[step + 1]}`}
            className="btn-primary text-sm disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ "--btn-accent": accentColor } as React.CSSProperties}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              !canAdvance() ||
              submit.isPending ||
              // In production, block submit until the Turnstile token is ready.
              // In dev (no site key), captchaToken is "" and that's acceptable.
              (!!TURNSTILE_SITE_KEY && !captchaToken)
            }
            className="btn-primary text-sm disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ "--btn-accent": accentColor } as React.CSSProperties}
          >
            {submit.isPending ? "Sending…" : "Send Inquiry"}
          </button>
        )}
      </div>

      {submit.isError && (
        <p className="mt-3 text-xs font-sans text-red-400/80" role="alert">
          Something went wrong. Please try again or email us directly at{" "}
          <a href="mailto:events@riverslodge.com" className="underline">events@riverslodge.com</a>.
        </p>
      )}
    </div>
  );
}
