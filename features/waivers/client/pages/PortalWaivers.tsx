import { Button } from '@shared/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@shared/ui/select';
import { Skeleton } from '@shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { Textarea } from '@shared/ui/textarea';
import { trpc } from '@shared/lib/trpc';
import {
  Archive, CheckCircle2, Clock, Download, Eye, FileText, Mail, Plus,
  RefreshCw, Search, Send, Trash2, Upload, X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const WAIVER_TYPES = [
  { value: "general", label: "General Property" },
  { value: "hunt", label: "Hunting" },
  { value: "fish", label: "Fishing" },
  { value: "sporting_clays", label: "Sporting Clays" },
  { value: "event", label: "Event" },
];

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  draft:    { label: "Draft",    dot: "#57544E", text: "text-[#BABAAE]" },
  active:   { label: "Active",   dot: "#6B7250", text: "text-[#BABAAE]" },
  pending:  { label: "Pending",  dot: "#9B4D19", text: "text-[#BABAAE]" },
  sent:     { label: "Sent",     dot: "#576276", text: "text-[#BABAAE]" },
  viewed:   { label: "Viewed",   dot: "#9B4D19", text: "text-[#BABAAE]" },
  signed:   { label: "Signed",   dot: "#6B7250", text: "text-[#E0D3BD]" },
  expired:  { label: "Expired",  dot: "#57544E", text: "text-[#BABAAE]" },
  revoked:  { label: "Revoked",  dot: "#57544E", text: "text-[#BABAAE]" },
  archived: { label: "Archived", dot: "#57544E", text: "text-[#BABAAE]" },
};

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
function typeLabel(t: string | null | undefined) {
  return WAIVER_TYPES.find((x) => x.value === t)?.label ?? (t?.replace(/_/g, " ") ?? "—");
}

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      <span className={`text-sm ${m.text}`}>{m.label}</span>
    </span>
  );
}

const labelCls = "font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]";
const inputCls = "bg-[#2B2823] border-[#57544E] text-[#E0D3BD] placeholder:text-[#57544E] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]";
const selectCls = "bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus:ring-[#9B4D19] focus:ring-1";
const selectContentCls = "bg-[#363330] border-[#57544E] rounded-none text-[#E0D3BD]";
const primaryBtn = "bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none";
const ghostBtn = "font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD]";
const outlineBtn = "border-[#57544E] text-[#E0D3BD] hover:border-[#9B4D19] hover:text-[#9B4D19] rounded-none font-sans text-xs tracking-[0.08em] uppercase h-8 px-3";

// ═══════════════════════════════════════════════════════════════════════════════

export default function PortalWaivers() {
  const [tab, setTab] = useState("waivers");
  return (
    <div className="min-h-screen bg-background px-6 py-10 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE] mb-1">Administration</p>
        <h1 className="font-sans text-2xl font-medium tracking-tight text-[#E0D3BD]">Waivers</h1>
        <p className="font-sans text-sm text-[#BABAAE] mt-1">Manage waiver templates, send waivers for e-signature, and track completion.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[#363330] border border-[#57544E] rounded-none h-10 p-0 gap-0">
          <TabsTrigger value="waivers" className="rounded-none h-full px-5 font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] data-[state=active]:bg-[#2B2823] data-[state=active]:text-[#E0D3BD] data-[state=active]:shadow-none border-r border-[#57544E]">Waivers</TabsTrigger>
          <TabsTrigger value="templates" className="rounded-none h-full px-5 font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] data-[state=active]:bg-[#2B2823] data-[state=active]:text-[#E0D3BD] data-[state=active]:shadow-none">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="waivers" className="mt-6"><WaiversTab /></TabsContent>
        <TabsContent value="templates" className="mt-6"><TemplatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Waivers tab ─────────────────────────────────────────────────────────────
function WaiversTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [showSend, setShowSend] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [revokeId, setRevokeId] = useState<number | null>(null);

  const templatesQuery = trpc.portal.waivers.templates.useQuery({});
  const templates = templatesQuery.data ?? [];
  const waiversQuery = trpc.portal.waivers.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    templateId: templateFilter === "all" ? undefined : Number(templateFilter),
    search: search.trim() || undefined,
  });
  const waivers = waiversQuery.data ?? [];

  const counts = {
    sent: waivers.filter((w) => ["sent", "viewed", "pending"].includes(w.status)).length,
    signed: waivers.filter((w) => w.status === "signed").length,
    expired: waivers.filter((w) => w.status === "expired").length,
    revoked: waivers.filter((w) => w.status === "revoked").length,
  };

  const resend = trpc.portal.waivers.resend.useMutation({
    onSuccess: (d) => { toast.success(d.emailSent ? "Waiver resent" : "Re-issued (email not delivered — copy link from details)"); utils.portal.waivers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const revoke = trpc.portal.waivers.revoke.useMutation({
    onSuccess: () => { toast.success("Waiver revoked"); setRevokeId(null); utils.portal.waivers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Outstanding", value: counts.sent, hint: "Sent / viewed" },
          { label: "Signed", value: counts.signed, hint: "Completed" },
          { label: "Expired", value: counts.expired, hint: "Past due" },
          { label: "Revoked", value: counts.revoked, hint: "Cancelled" },
        ].map((s) => (
          <div key={s.label} className="bg-[#363330] border border-[#57544E] p-5">
            <p className={labelCls}>{s.label}</p>
            <p className="font-sans text-3xl font-semibold text-[#E0D3BD] leading-none mt-2">{waiversQuery.isLoading ? "—" : s.value}</p>
            <p className="font-sans text-xs text-[#BABAAE] mt-2">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* Filters + send */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57544E]" />
          <Input placeholder="Search signer or email…" value={search} onChange={(e) => setSearch(e.target.value)} className={`pl-9 ${inputCls}`} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={`w-full md:w-44 ${selectCls}`}><SelectValue /></SelectTrigger>
          <SelectContent className={selectContentCls}>
            <SelectItem value="all">All statuses</SelectItem>
            {["sent", "viewed", "signed", "expired", "revoked"].map((s) => (
              <SelectItem key={s} value={s} className="focus:bg-[#423F3B] focus:text-[#E0D3BD] capitalize">{STATUS_META[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={templateFilter} onValueChange={setTemplateFilter}>
          <SelectTrigger className={`w-full md:w-52 ${selectCls}`}><SelectValue /></SelectTrigger>
          <SelectContent className={selectContentCls}>
            <SelectItem value="all">All templates</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={String(t.id)} className="focus:bg-[#423F3B] focus:text-[#E0D3BD]">{t.templateName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowSend(true)} className={`${primaryBtn} h-10 px-5`}>
          <Send className="w-3.5 h-3.5 mr-2" />Send Waiver
        </Button>
      </div>

      {/* Table */}
      <div className="bg-[#363330] border border-[#57544E]">
        <div className="grid grid-cols-[1.4fr_1fr_110px_110px_110px_150px] gap-x-4 px-5 py-3 border-b border-[#57544E]">
          {["Signer", "Activity", "Sent", "Signed", "Expires", "Status"].map((h) => (
            <span key={h} className={labelCls}>{h}</span>
          ))}
        </div>
        {waiversQuery.isLoading ? (
          <div className="divide-y divide-[#57544E]">
            {[1, 2, 3, 4].map((i) => <div key={i} className="px-5 py-4"><Skeleton className="h-5 w-full bg-[#423F3B]" /></div>)}
          </div>
        ) : waivers.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <FileText className="w-8 h-8 text-[#57544E] mx-auto mb-3" />
            <p className="text-sm text-[#BABAAE]">No waivers match your filters.</p>
            <p className="text-xs text-[#BABAAE]/60 mt-1">Send a waiver from a template to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#57544E]">
            {waivers.map((w) => (
              <button
                key={w.id}
                onClick={() => setDetailId(w.id)}
                className="w-full text-left grid grid-cols-[1.4fr_1fr_110px_110px_110px_150px] gap-x-4 items-center px-5 py-3.5 hover:bg-[#423F3B]/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#E0D3BD] truncate">{w.signatoryName}</p>
                  {w.signatoryEmail && <p className="text-xs text-[#BABAAE] truncate">{w.signatoryEmail}</p>}
                </div>
                <span className="text-sm text-[#BABAAE] truncate">{w.linkedBookingType ? w.linkedBookingType.replace(/_/g, " ") : (w.snapshotTitle ?? "—")}</span>
                <span className="text-sm text-[#BABAAE]">{fmt(w.sentAt)}</span>
                <span className="text-sm text-[#BABAAE]">{fmt(w.signedAt)}</span>
                <span className="text-sm text-[#BABAAE]">{fmt(w.expiresAt)}</span>
                <div className="flex items-center justify-between gap-2">
                  <StatusPill status={w.status} />
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {["sent", "viewed", "expired"].includes(w.status) && (
                      <button title="Resend" onClick={() => resend.mutate({ id: w.id })} className="p-1.5 text-[#BABAAE] hover:text-[#9B4D19] transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                    )}
                    {w.status !== "signed" && w.status !== "revoked" && (
                      <button title="Revoke" onClick={() => setRevokeId(w.id)} className="p-1.5 text-[#BABAAE] hover:text-[#E0D3BD] transition-colors"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showSend && <SendWaiverDialog templates={templates.filter((t) => t.active && !t.archived)} onClose={() => setShowSend(false)} onSent={() => { setShowSend(false); utils.portal.waivers.list.invalidate(); }} />}
      {detailId !== null && <WaiverDetailDialog id={detailId} onClose={() => setDetailId(null)} />}

      {/* Revoke confirm */}
      <Dialog open={revokeId !== null} onOpenChange={(v) => !v && setRevokeId(null)}>
        <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-md">
          <DialogHeader><DialogTitle className="font-sans font-medium">Revoke Waiver</DialogTitle></DialogHeader>
          <p className="text-sm text-[#BABAAE]">This cancels the signing request. The link will stop working and the recipient can no longer sign. This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className={ghostBtn} onClick={() => setRevokeId(null)}>Cancel</Button>
            <Button size="sm" disabled={revoke.isPending} onClick={() => revokeId && revoke.mutate({ id: revokeId })} className="bg-[#57544E] hover:bg-[#423F3B] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none">
              {revoke.isPending ? "Revoking…" : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Send waiver dialog ──────────────────────────────────────────────────────
function SendWaiverDialog({ templates, onClose, onSent }: { templates: any[]; onClose: () => void; onSent: () => void }) {
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ? String(templates[0].id) : "");
  const [recipients, setRecipients] = useState([{ signatoryName: "", signatoryEmail: "" }]);
  const [customMessage, setCustomMessage] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lastLinks, setLastLinks] = useState<{ email: string; signingUrl: string; emailSent: boolean }[] | null>(null);

  const send = trpc.portal.waivers.send.useMutation({
    onSuccess: (d) => {
      const undelivered = d.results.filter((r) => !r.emailSent);
      if (undelivered.length) { setLastLinks(d.results); toast.warning(`Created ${d.sent}. ${undelivered.length} email(s) not delivered — copy links below.`); }
      else { toast.success(`Sent ${d.sent} waiver${d.sent === 1 ? "" : "s"}`); onSent(); }
    },
    onError: (e) => toast.error(e.message),
  });

  const valid = templateId && recipients.every((r) => r.signatoryName.trim() && /.+@.+\..+/.test(r.signatoryEmail));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-sans font-medium">Send Waiver</DialogTitle></DialogHeader>

        {lastLinks ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-[#BABAAE]">Email delivery isn’t configured, so share these secure links manually:</p>
            {lastLinks.map((l) => (
              <div key={l.email} className="bg-[#2B2823] border border-[#57544E] p-3 space-y-1">
                <p className="text-xs text-[#E0D3BD]">{l.email}</p>
                <code className="block font-mono text-xs text-[#BABAAE] break-all select-all">{l.signingUrl}</code>
              </div>
            ))}
            <DialogFooter><Button size="sm" className={primaryBtn} onClick={onSent}>Done</Button></DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className={labelCls}>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className={selectCls}><SelectValue placeholder="Select a template" /></SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {templates.length === 0 ? <SelectItem value="none" disabled>No active templates</SelectItem> :
                    templates.map((t) => <SelectItem key={t.id} value={String(t.id)} className="focus:bg-[#423F3B] focus:text-[#E0D3BD]">{t.templateName} · v{t.version}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={labelCls}>Recipients</Label>
              {recipients.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Full name" value={r.signatoryName} onChange={(e) => setRecipients((rs) => rs.map((x, j) => j === i ? { ...x, signatoryName: e.target.value } : x))} className={inputCls} />
                  <Input placeholder="email@example.com" value={r.signatoryEmail} onChange={(e) => setRecipients((rs) => rs.map((x, j) => j === i ? { ...x, signatoryEmail: e.target.value } : x))} className={inputCls} />
                  {recipients.length > 1 && (
                    <button onClick={() => setRecipients((rs) => rs.filter((_, j) => j !== i))} className="shrink-0 px-2 text-[#BABAAE] hover:text-[#E0D3BD]"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" className={`${ghostBtn} px-0`} onClick={() => setRecipients((rs) => [...rs, { signatoryName: "", signatoryEmail: "" }])}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add recipient
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Custom message <span className="text-[#57544E] normal-case tracking-normal">(optional)</span></Label>
              <Textarea rows={3} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Add a short note included in the email…" className={inputCls} />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Due / expiration date <span className="text-[#57544E] normal-case tracking-normal">(optional)</span></Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" size="sm" className={ghostBtn} onClick={onClose}>Cancel</Button>
              <Button size="sm" disabled={!valid || send.isPending} className={primaryBtn}
                onClick={() => send.mutate({
                  templateId: Number(templateId),
                  recipients: recipients.map((r) => ({ signatoryName: r.signatoryName.trim(), signatoryEmail: r.signatoryEmail.trim() })),
                  customMessage: customMessage.trim() || undefined,
                  dueDate: dueDate || undefined,
                })}>
                {send.isPending ? "Sending…" : `Send ${recipients.length > 1 ? `(${recipients.length})` : ""}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Waiver detail dialog ────────────────────────────────────────────────────
function WaiverDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const detail = trpc.portal.waivers.get.useQuery({ id });
  const download = trpc.portal.waivers.downloadUrl.useMutation({
    onSuccess: (d) => { window.open(d.url, "_blank"); },
    onError: (e) => toast.error(e.message),
  });
  const w = detail.data?.waiver;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-sans font-medium">Waiver Record</DialogTitle></DialogHeader>
        {detail.isLoading || !w ? (
          <div className="space-y-2 py-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full bg-[#423F3B]" />)}</div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-[#E0D3BD]">{w.signatoryName}</p>
                <p className="text-sm text-[#BABAAE]">{w.signatoryEmail}</p>
              </div>
              <StatusPill status={w.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Template">{w.snapshotTitle ?? detail.data?.template?.templateName ?? "—"}</Field>
              <Field label="Version">v{w.templateVersion ?? "—"}</Field>
              <Field label="Related">{w.linkedBookingType ? `${w.linkedBookingType.replace(/_/g, " ")} #${w.linkedBookingId}` : "—"}</Field>
              <Field label="Delivery">{w.deliveryStatus ?? "—"}</Field>
            </div>

            <div className="border-t border-[#57544E] pt-4">
              <p className={`${labelCls} mb-3`}>Timeline</p>
              <div className="space-y-2 text-sm">
                <TimelineRow icon={<Mail className="w-3.5 h-3.5" />} label="Sent" value={fmtTime(w.sentAt)} sub={w.senderName} />
                <TimelineRow icon={<Eye className="w-3.5 h-3.5" />} label="Viewed" value={fmtTime(w.viewedAt)} />
                <TimelineRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Signed" value={fmtTime(w.signedAt)} sub={w.ipAddress ? `IP ${w.ipAddress}` : undefined} />
                <TimelineRow icon={<Clock className="w-3.5 h-3.5" />} label="Expires" value={fmtTime(w.expiresAt)} />
              </div>
            </div>

            {w.status === "signed" && (
              <div className="border-t border-[#57544E] pt-4 space-y-3">
                <p className={labelCls}>Signed Record <span className="normal-case tracking-normal text-[#57544E]">· read-only</span></p>
                {w.signatureName && <p className="text-xl text-[#E0D3BD]" style={{ fontFamily: "'Crimson Text', Georgia, serif", fontStyle: "italic" }}>{w.signatureName}</p>}
                {w.consentAccepted && <p className="text-xs text-[#BABAAE]">✓ Electronic signature consent recorded</p>}
                <Button size="sm" disabled={!w.signedPdfKey || download.isPending} className={`${primaryBtn} h-8`} onClick={() => download.mutate({ id })}>
                  <Download className="w-3.5 h-3.5 mr-2" />{w.signedPdfKey ? "Download Signed PDF" : "No PDF available"}
                </Button>
              </div>
            )}

            {detail.data?.audit && detail.data.audit.length > 0 && (
              <div className="border-t border-[#57544E] pt-4">
                <p className={`${labelCls} mb-3`}>Audit Trail</p>
                <div className="space-y-2">
                  {detail.data.audit.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2 text-xs text-[#BABAAE]">
                      <span className="text-[#57544E] shrink-0">{fmtTime(a.createdAt)}</span>
                      <span>{a.notes ?? `${a.actionType} → ${a.newValue ?? ""}`} <span className="text-[#57544E]">· {a.actingUserName}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`${labelCls} mb-0.5`}>{label}</p>
      <p className="text-[#E0D3BD] capitalize">{children}</p>
    </div>
  );
}
function TimelineRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#9B4D19]">{icon}</span>
      <span className="text-[#BABAAE] w-20">{label}</span>
      <span className="text-[#E0D3BD]">{value}</span>
      {sub && <span className="text-[#57544E] text-xs">· {sub}</span>}
    </div>
  );
}

// ─── Templates tab ───────────────────────────────────────────────────────────
function TemplatesTab() {
  const utils = trpc.useUtils();
  const [showEditor, setShowEditor] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const templatesQuery = trpc.portal.waivers.templates.useQuery({ includeArchived: true });
  const templates = templatesQuery.data ?? [];

  const setActive = trpc.portal.waivers.setTemplateActive.useMutation({
    onSuccess: () => { utils.portal.waivers.templates.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const archive = trpc.portal.waivers.archiveTemplate.useMutation({
    onSuccess: () => { toast.success("Template archived"); utils.portal.waivers.templates.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="font-sans text-sm text-[#BABAAE]">Templates define the waiver text. Editing the content creates a new version so signed records stay intact.</p>
        <Button className={`${primaryBtn} h-9 px-4`} onClick={() => { setEditId(null); setShowEditor(true); }}>
          <Plus className="w-3.5 h-3.5 mr-2" />New Template
        </Button>
      </div>

      {templatesQuery.isLoading ? (
        <div className="grid md:grid-cols-2 gap-3">{[1, 2].map((i) => <Skeleton key={i} className="h-28 bg-[#363330]" />)}</div>
      ) : templates.length === 0 ? (
        <div className="bg-[#363330] border border-[#57544E] p-12 text-center">
          <FileText className="w-8 h-8 text-[#57544E] mx-auto mb-3" />
          <p className="text-sm text-[#BABAAE]">No templates yet. Create one to start sending waivers.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} className={`bg-[#363330] border border-[#57544E] p-5 ${t.archived ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#E0D3BD] truncate">{t.templateName}</p>
                  <p className="text-xs text-[#BABAAE] mt-0.5">{typeLabel(t.templateType)} · v{t.version}{t.fileName ? " · has document" : ""}</p>
                </div>
                <StatusPill status={t.archived ? "archived" : t.active ? "active" : "draft"} />
              </div>
              {t.description && <p className="text-xs text-[#BABAAE] mt-2 line-clamp-2">{t.description}</p>}
              {!t.archived && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#57544E]/60">
                  <button className={ghostBtn} onClick={() => { setEditId(t.id); setShowEditor(true); }}>Edit</button>
                  <span className="text-[#57544E]">·</span>
                  <button className={ghostBtn} onClick={() => setActive.mutate({ id: t.id, active: !t.active })}>{t.active ? "Deactivate" : "Activate"}</button>
                  <span className="text-[#57544E]">·</span>
                  <button className={`${ghostBtn} flex items-center gap-1`} onClick={() => archive.mutate({ id: t.id })}><Archive className="w-3 h-3" />Archive</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showEditor && <TemplateEditor id={editId} onClose={() => setShowEditor(false)} onSaved={() => { setShowEditor(false); utils.portal.waivers.templates.invalidate(); }} />}
    </div>
  );
}

// ─── Template editor (create/edit + upload) ──────────────────────────────────
function TemplateEditor({ id, onClose, onSaved }: { id: number | null; onClose: () => void; onSaved: () => void }) {
  const existing = trpc.portal.waivers.templateGet.useQuery({ id: id! }, { enabled: id !== null });
  const t = existing.data?.template;
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ templateName: "", templateType: "general", description: "", bodyText: "", expiresInDays: "", fileKey: "" as string | null, fileName: "" as string | null });
  const [hydrated, setHydrated] = useState(false);
  if (id !== null && t && !hydrated) {
    setForm({
      templateName: t.templateName, templateType: t.templateType ?? "general", description: t.description ?? "",
      bodyText: t.bodyText, expiresInDays: t.expiresInDays ? String(t.expiresInDays) : "", fileKey: t.fileKey, fileName: t.fileName,
    });
    setHydrated(true);
  }

  const upload = trpc.portal.waivers.uploadDocument.useMutation({
    onSuccess: (d) => { setForm((f) => ({ ...f, fileKey: d.fileKey, fileName: d.fileName })); toast.success("Document uploaded"); },
    onError: (e) => toast.error(e.message),
  });
  const create = trpc.portal.waivers.createTemplate.useMutation({ onSuccess: () => { toast.success("Template created"); onSaved(); }, onError: (e) => toast.error(e.message) });
  const update = trpc.portal.waivers.updateTemplate.useMutation({ onSuccess: (d) => { toast.success(`Saved (v${d.version})`); onSaved(); }, onError: (e) => toast.error(e.message) });

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File exceeds the 10 MB limit"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      upload.mutate({ fileName: file.name, contentType: file.type || "application/octet-stream", dataBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!form.templateName.trim() || !form.bodyText.trim()) { toast.error("Name and waiver text are required"); return; }
    const payload = {
      templateName: form.templateName.trim(),
      templateType: form.templateType as any,
      description: form.description.trim() || undefined,
      bodyText: form.bodyText,
      fileKey: form.fileKey || undefined,
      fileName: form.fileName || undefined,
      expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : undefined,
    };
    if (id === null) create.mutate(payload);
    else update.mutate({ id, ...payload, description: form.description.trim() || null, fileKey: form.fileKey || null, fileName: form.fileName || null, expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : null });
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-sans font-medium">{id === null ? "New Waiver Template" : "Edit Template"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className={labelCls}>Template Name</Label>
            <Input value={form.templateName} onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={labelCls}>Category</Label>
              <Select value={form.templateType} onValueChange={(v) => setForm((f) => ({ ...f, templateType: v }))}>
                <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {WAIVER_TYPES.map((x) => <SelectItem key={x.value} value={x.value} className="focus:bg-[#423F3B] focus:text-[#E0D3BD]">{x.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Expires after (days)</Label>
              <Input type="number" min={1} placeholder="e.g. 30" value={form.expiresInDays} onChange={(e) => setForm((f) => ({ ...f, expiresInDays: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Internal notes <span className="text-[#57544E] normal-case tracking-normal">(optional)</span></Label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Waiver Text</Label>
            <Textarea rows={7} value={form.bodyText} onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))} placeholder="Full waiver text shown to the signer…" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Source Document <span className="text-[#57544E] normal-case tracking-normal">(optional — PDF/DOC/image, ≤10 MB)</span></Label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg" className="hidden" onChange={onPickFile} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className={outlineBtn} disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-2" />{upload.isPending ? "Uploading…" : "Upload"}
              </Button>
              {form.fileName && (
                <span className="flex items-center gap-1.5 text-xs text-[#BABAAE]"><FileText className="w-3.5 h-3.5" />{form.fileName}
                  <button onClick={() => setForm((f) => ({ ...f, fileKey: null, fileName: null }))} className="text-[#57544E] hover:text-[#E0D3BD]"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className={ghostBtn} onClick={onClose}>Cancel</Button>
          <Button size="sm" className={primaryBtn} disabled={busy} onClick={save}>{busy ? "Saving…" : id === null ? "Create Template" : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
