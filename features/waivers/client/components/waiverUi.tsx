/**
 * Shared bits for the DocuSign waiver UI (ops + member portal).
 */
import type { ReactNode } from "react";

export const ops = {
  label: "font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]",
  input: "bg-[#2B2823] border-[#57544E] text-[#E0D3BD] placeholder:text-[#57544E] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]",
  select: "bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus:ring-[#9B4D19] focus:ring-1",
  selectContent: "bg-[#363330] border-[#57544E] rounded-none text-[#E0D3BD]",
  primaryBtn: "bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none",
  ghostBtn: "font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD]",
  outlineBtn: "border-[#57544E] text-[#E0D3BD] hover:border-[#9B4D19] hover:text-[#9B4D19] rounded-none font-sans text-xs tracking-[0.08em] uppercase h-8 px-3",
  card: "bg-[#363330] border border-[#57544E]",
};

const STATUS: Record<string, { label: string; dot: string }> = {
  queued: { label: "Sending…", dot: "#576276" },
  sent: { label: "Sent", dot: "#576276" },
  viewed: { label: "Viewed", dot: "#9B4D19" },
  signed: { label: "Signed", dot: "#6B7250" },
  declined: { label: "Declined", dot: "#b4442b" },
  expired: { label: "Expired", dot: "#57544E" },
  voided: { label: "Voided", dot: "#57544E" },
  failed: { label: "Not sent", dot: "#b4442b" },
  removed: { label: "Removed", dot: "#57544E" },
  // Master waiver states
  valid: { label: "On file", dot: "#6B7250" },
  missing: { label: "Not signed", dot: "#b4442b" },
  pending: { label: "Awaiting signature", dot: "#9B4D19" },
  outdated: { label: "New version — re-sign", dot: "#b4442b" },
  resign_required: { label: "Re-sign required", dot: "#b4442b" },
  no_template: { label: "No Master template", dot: "#57544E" },
  disabled: { label: "Off", dot: "#57544E" },
};

export function waiverStatusLabel(status: string): string {
  return STATUS[status]?.label ?? status;
}

export function WaiverStatusBadge({ status, light = false }: { status: string; light?: boolean }) {
  const m = STATUS[status] ?? { label: status, dot: "#57544E" };
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      <span className={`text-sm ${light ? "text-stone-200" : "text-[#E0D3BD]"}`}>{m.label}</span>
    </span>
  );
}

export function fmtDateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
}

export function fmtDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtYmd(v: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ""));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : String(v ?? "");
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1">
      <span className="text-[#BABAAE]">{label}</span>
      <span className="text-[#E0D3BD] text-right">{children}</span>
    </div>
  );
}

/** Result shape returned by send/resend/edit mutations. */
export type SendResultLike = { ok: boolean; error?: string; queued?: boolean; canEmailOnly?: boolean };
