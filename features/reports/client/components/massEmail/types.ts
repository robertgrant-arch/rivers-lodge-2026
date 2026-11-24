export const SKILL_GROUPS = [
  { slug: "designated", label: "Designated" },
  { slug: "silver", label: "Silver" },
  { slug: "social", label: "Social" },
  { slug: "employee", label: "Employee" },
  { slug: "admin", label: "Admin" },
] as const;
export type SkillGroupSlug = (typeof SKILL_GROUPS)[number]["slug"];

export type EmailAudience =
  | { type: "all_members" }
  | { type: "skill_groups"; slugs: SkillGroupSlug[] }
  | { type: "customers" }
  | { type: "individuals"; emails: string[] };

export type EmailStatus = "draft" | "pending_approval" | "approved" | "scheduled" | "sending" | "sent" | "cancelled";

export const STATUS_CONFIG: Record<EmailStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-[#57544E]/50 text-[#E0D3BD] border-[#57544E]" },
  approved: { label: "Draft", cls: "bg-[#57544E]/50 text-[#E0D3BD] border-[#57544E]" }, // old newsletter tool
  cancelled: { label: "Draft", cls: "bg-[#57544E]/50 text-[#E0D3BD] border-[#57544E]" },
  pending_approval: { label: "Pending approval", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  scheduled: { label: "Scheduled", cls: "bg-sky-500/15 text-sky-300 border-sky-500/40" },
  sending: { label: "Sending", cls: "bg-violet-500/15 text-violet-300 border-violet-500/40" },
  sent: { label: "Sent", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
};

export const fmtDateTime = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
