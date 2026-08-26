import { AlertTriangle } from "lucide-react";

interface AuthCardProps {
  heading: string;
  subheading?: string;
  children: React.ReactNode;
}

export function AuthCard({ heading, subheading, children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "oklch(0.095 0.006 64)" }}>
      <div
        className="w-full max-w-md rounded-lg p-10"
        style={{
          backgroundColor: "oklch(0.115 0.007 64)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
          border: "1px solid oklch(0.22 0.008 64)",
        }}
      >
        {/* Wordmark */}
        <p
          className="text-center font-sans tracking-[0.25em] uppercase mb-6"
          style={{ fontSize: "10px", color: "oklch(0.72 0.095 78)" }}
        >
          Rivers Lodge
        </p>

        {/* Heading */}
        <h1
          className="text-center font-serif font-light tracking-[0.18em] uppercase mb-2"
          style={{ fontSize: "clamp(1.35rem,4vw,1.75rem)", color: "oklch(0.94 0.008 78)", letterSpacing: "0.18em" }}
        >
          {heading}
        </h1>

        {/* Subheading */}
        {subheading && (
          <p
            className="text-center font-sans mb-8"
            style={{ fontSize: "13px", color: "oklch(0.60 0.006 64)" }}
          >
            {subheading}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}

interface AuthErrorProps {
  message: string | null | undefined;
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;
  return (
    <div
      className="flex items-start gap-3 rounded px-4 py-3 mb-5"
      style={{
        border: "1px solid oklch(0.50 0.20 25)",
        backgroundColor: "oklch(0.16 0.04 25)",
      }}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.20 25)" }} />
      <p className="font-sans text-sm" style={{ color: "oklch(0.88 0.06 25)" }}>
        {message}
      </p>
    </div>
  );
}

interface AuthFieldProps {
  label: string;
  id: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function AuthField({
  label, id, type = "text", autoComplete, placeholder, value, onChange, disabled,
}: AuthFieldProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block font-sans tracking-[0.1em] uppercase mb-2"
        style={{ fontSize: "10px", color: "oklch(0.60 0.006 64)" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded px-4 py-3 font-sans text-sm outline-none transition-all focus:ring-1"
        style={{
          backgroundColor: "oklch(0.08 0.005 64)",
          border: "1px solid oklch(0.22 0.008 64)",
          color: "oklch(0.94 0.008 78)",
          fontSize: "14px",
          // @ts-ignore
          "--tw-ring-color": "oklch(0.72 0.095 78)",
        }}
      />
    </div>
  );
}

interface AuthButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}

export function AuthButton({ children, loading, disabled, type = "submit", onClick }: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="w-full py-3.5 rounded font-sans tracking-[0.15em] uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      style={{
        fontSize: "11px",
        background: "linear-gradient(135deg, oklch(0.20 0.010 64) 0%, oklch(0.14 0.008 64) 100%)",
        border: "1px solid oklch(0.30 0.010 64)",
        color: "oklch(0.94 0.008 78)",
      }}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
