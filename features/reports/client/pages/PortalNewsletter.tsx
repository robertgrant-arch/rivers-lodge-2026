/**
 * /ops/newsletter — Newsletter & mass email.
 *
 * Admins and staff employees write emails to groups of members and customers,
 * send a test to themselves, preview, and send now or schedule. Employees'
 * emails need admin approval when that setting is on. The Sent Emails list
 * keeps every email (draft, pending, scheduled, sent) to view or duplicate.
 * All permissions are enforced on the server (reports.newsletters.*).
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, Plus, Sparkles, Loader2, ShieldCheck, Users, Inbox } from "lucide-react";
import { trpc } from "@shared/lib/trpc";
import { useAuth } from "@features/auth/public";
import { Button } from "@shared/ui/button";
import { Label } from "@shared/ui/label";
import { Switch } from "@shared/ui/switch";
import { Textarea } from "@shared/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import EmailComposer, { type EmailAccess } from "../components/massEmail/EmailComposer";
import EmailDetailDialog, { StatusBadge } from "../components/massEmail/EmailDetailDialog";
import { fmtDateTime } from "../components/massEmail/types";

type Filter = "all" | "draft" | "pending_approval" | "scheduled" | "sent";
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "pending_approval", label: "Pending approval" },
  { key: "scheduled", label: "Scheduled" },
  { key: "sent", label: "Sent" },
];
const DRAFTISH = new Set(["draft", "cancelled", "approved"]);
const matches = (status: string, f: Filter) =>
  f === "all" || (f === "draft" ? DRAFTISH.has(status) : f === "sent" ? status === "sent" || status === "sending" : status === f);

function GenerateDraftDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: number) => void }) {
  const [context, setContext] = useState("");
  const [includeReports, setIncludeReports] = useState(true);
  const gen = trpc.reports.newsletters.generateDraft.useMutation({
    onSuccess: (r) => { toast.success("AI draft created"); onOpenChange(false); setContext(""); onCreated(r.id); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#C2662A]" />Generate AI newsletter draft</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Writes a seasonal member newsletter in the voice of The Rivers Lodge &amp; Hunt Club as a draft. Review every detail before sending.</p>
          <div className="space-y-1.5">
            <Label htmlFor="ai-context">Additional context (optional)</Label>
            <Textarea id="ai-context" value={context} onChange={(e) => setContext(e.target.value)} rows={4} placeholder="Topics, announcements or notes to include" />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="include-reports" checked={includeReports} onCheckedChange={setIncludeReports} />
            <Label htmlFor="include-reports" className="cursor-pointer">Use recent published field reports</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={gen.isPending} className="gap-2" onClick={() => gen.mutate({ context: context || undefined, includeRecentReports: includeReports })}>
            {gen.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApprovalSetting({ value }: { value: boolean }) {
  const utils = trpc.useUtils();
  const update = trpc.reports.newsletters.settings.update.useMutation({
    onSuccess: (r) => { toast.success(r.requireEmployeeApproval ? "Employee emails now need admin approval" : "Employees can now send without approval"); utils.reports.newsletters.access.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="flex items-start gap-3 p-3 border border-[#57544E] bg-[#363330]">
      <Switch id="require-approval" checked={value} disabled={update.isPending} onCheckedChange={(v) => update.mutate({ requireEmployeeApproval: v })} className="mt-0.5" />
      <Label htmlFor="require-approval" className="cursor-pointer leading-snug">
        <span className="block text-sm text-[#E0D3BD]">Require admin approval for employee emails</span>
        <span className="block text-xs text-[#BABAAE] font-normal mt-0.5">When on, emails written by employees wait in “Pending approval” until an admin approves them.</span>
      </Label>
    </div>
  );
}

export default function PortalNewsletter() {
  const { user } = useAuth();
  const access = trpc.reports.newsletters.access.useQuery();
  const [view, setView] = useState<{ mode: "list" } | { mode: "compose"; id?: number }>({ mode: "list" });
  const [detailId, setDetailId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [generateOpen, setGenerateOpen] = useState(false);
  const canUse = access.data?.canUse === true;
  const list = trpc.reports.newsletters.list.useQuery(undefined, {
    enabled: canUse,
    refetchInterval: (q) => (q.state.data?.some((e) => e.status === "sending") ? 3000 : false),
  });
  const rows = useMemo(() => (list.data ?? []).filter((e) => matches(e.status, filter)), [list.data, filter]);
  const pendingCount = (list.data ?? []).filter((e) => e.status === "pending_approval").length;

  if (access.isLoading) return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>;
  if (!access.data || access.data.canUse !== true) return <div className="p-8 text-muted-foreground">Mass email is only available to Rivers Lodge staff.</div>;
  const a = access.data as EmailAccess;

  if (view.mode === "compose") {
    return <EmailComposer key={view.id ?? "new"} id={view.id} access={a} onClose={() => setView({ mode: "list" })} />;
  }

  const dateFor = (e: (typeof rows)[number]) =>
    e.status === "sent" ? e.sentAt : e.status === "sending" ? e.sendStartedAt : e.status === "scheduled" ? e.scheduledFor : e.updatedAt;
  const sender = (e: (typeof rows)[number]) => e.senderName ?? e.creatorEmail ?? "—";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2"><Mail className="w-6 h-6 text-[#C2662A]" />Newsletter &amp; Email</h1>
          <p className="text-sm text-muted-foreground mt-1">Email groups of members and customers. Unsubscribed people are always left out.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.isAdmin && <Button variant="outline" className="gap-2" onClick={() => setGenerateOpen(true)}><Sparkles className="w-4 h-4" />AI draft</Button>}
          <Button className="gap-2 bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD]" onClick={() => setView({ mode: "compose" })}><Plus className="w-4 h-4" />New email</Button>
        </div>
      </div>

      {a.isAdmin && <ApprovalSetting value={a.requireEmployeeApproval} />}
      {!a.isAdmin && a.needsApproval && (
        <p className="text-sm text-[#BABAAE] flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#C2662A]" />Your emails are reviewed by an admin before they're sent.</p>
      )}
      {!a.deliveryConfigured && (
        <p className="text-sm p-3 border border-amber-500/40 bg-amber-500/10 text-amber-200">Email sending isn't set up on the server yet (RESEND_API_KEY). Drafts can be written and saved.</p>
      )}
      {a.isAdmin && pendingCount > 0 && filter !== "pending_approval" && (
        <button type="button" onClick={() => setFilter("pending_approval")} className="w-full text-left p-3 border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm flex items-center gap-2">
          <Inbox className="w-4 h-4" />{pendingCount} {pendingCount === 1 ? "email is" : "emails are"} waiting for your approval — review
        </button>
      )}

      <section className="space-y-3" aria-labelledby="sent-emails-heading">
        <h2 id="sent-emails-heading" className="text-lg font-semibold text-foreground">Sent Emails</h2>
        <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <Button key={f.key} role="tab" aria-selected={filter === f.key} size="sm" variant={filter === f.key ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilter(f.key)}>
              {f.label}{f.key === "pending_approval" && pendingCount > 0 ? ` (${pendingCount})` : ""}
            </Button>
          ))}
        </div>

        {list.isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted animate-pulse" />)}</div>
        ) : list.isError ? (
          <p className="text-sm text-red-300">Couldn't load emails: {list.error.message}</p>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center border border-[#57544E]">
            <Mail className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{filter === "all" ? "No emails yet." : "Nothing here."}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block border border-[#57544E] overflow-x-auto">
              <table className="w-full text-sm" data-testid="sent-emails-table">
                <thead className="bg-[#363330] text-[11px] uppercase tracking-[0.1em] text-[#BABAAE]">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Subject</th>
                    <th className="text-left font-medium px-3 py-2">Sender</th>
                    <th className="text-left font-medium px-3 py-2">Date</th>
                    <th className="text-left font-medium px-3 py-2">Recipient group</th>
                    <th className="text-right font-medium px-3 py-2">Sent</th>
                    <th className="text-right font-medium px-3 py-2">Failed</th>
                    <th className="text-left font-medium px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#57544E]/60">
                  {rows.map((e) => (
                    <tr key={e.id} className="hover:bg-white/5 cursor-pointer" onClick={() => setDetailId(e.id)}>
                      <td className="px-3 py-2.5 max-w-[18rem]"><button type="button" className="text-left text-[#E0D3BD] hover:underline truncate block max-w-full" onClick={(ev) => { ev.stopPropagation(); setDetailId(e.id); }}>{e.subject}</button></td>
                      <td className="px-3 py-2.5 text-[#BABAAE] truncate max-w-[10rem]">{sender(e)}</td>
                      <td className="px-3 py-2.5 text-[#BABAAE] whitespace-nowrap">{fmtDateTime(dateFor(e))}</td>
                      <td className="px-3 py-2.5 text-[#BABAAE] truncate max-w-[14rem]">{e.audienceLabel ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{e.status === "sent" || e.status === "sending" ? e.sentCount ?? 0 : "—"}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${e.failedCount > 0 ? "text-red-300" : ""}`}>{e.status === "sent" ? e.failedCount : "—"}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="md:hidden space-y-2" data-testid="sent-emails-cards">
              {rows.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => setDetailId(e.id)} className="w-full text-left p-3 border border-[#57544E] hover:bg-white/5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-[#E0D3BD] break-words min-w-0">{e.subject}</span>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="text-xs text-[#BABAAE]">{sender(e)} · {fmtDateTime(dateFor(e))}</p>
                    <p className="text-xs text-[#BABAAE] flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{e.audienceLabel ?? "Recipients not chosen"}</p>
                    {(e.status === "sent" || e.status === "sending") && (
                      <p className="text-xs"><span className="text-emerald-300">{e.sentCount ?? 0} sent</span>{e.failedCount > 0 && <span className="text-red-300"> · {e.failedCount} failed</span>}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {detailId !== null && (
        <EmailDetailDialog
          id={detailId}
          access={a}
          currentUserId={user?.id}
          onClose={() => setDetailId(null)}
          onEdit={(id) => { setDetailId(null); setView({ mode: "compose", id }); }}
        />
      )}
      <GenerateDraftDialog open={generateOpen} onOpenChange={setGenerateOpen} onCreated={(id) => setView({ mode: "compose", id })} />
    </div>
  );
}
