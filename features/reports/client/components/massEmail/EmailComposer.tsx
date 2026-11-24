/**
 * Compose a mass email: subject, formatted body, recipients (live count),
 * preview, "Send test to me", and Send now / Schedule for later. Employees'
 * emails go to an admin for approval when that setting is on.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Pencil, FileText, Send, CalendarClock, Save, FlaskConical, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { trpc } from "@shared/lib/trpc";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@shared/ui/alert-dialog";
import RichEmailEditor from "./RichEmailEditor";
import RecipientPicker, { completeAudience, useAudienceCount } from "./RecipientPicker";
import EmailPreview from "./EmailPreview";
import type { EmailAudience } from "./types";

export type EmailAccess = {
  canUse: true; isAdmin: boolean; name: string; email: string; from: string; fromAddress: string;
  needsApproval: boolean; requireEmployeeApproval: boolean; deliveryConfigured: boolean;
};

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function EmailComposer({ id: initialId, access, onClose }: { id?: number; access: EmailAccess; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [id, setId] = useState<number | undefined>(initialId);
  const existing = trpc.reports.newsletters.get.useQuery({ id: initialId ?? 0 }, { enabled: !!initialId, refetchOnWindowFocus: false });
  const [loaded, setLoaded] = useState(!initialId);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [audience, setAudience] = useState<EmailAudience | null>(null);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduleAt, setScheduleAt] = useState(() => toLocalInput(new Date(Date.now() + 24 * 3600_000)));
  const [tab, setTab] = useState<"edit" | "preview" | "text">("edit");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const d = existing.data;
    if (!d || loaded) return;
    setSubject(d.subject === "(no subject)" ? "" : d.subject);
    setBodyHtml(d.finalContent ?? d.draftContent ?? "");
    setAudience((d.audience as EmailAudience | null) ?? null);
    if (d.requestedSendMode === "schedule" && d.scheduledFor) { setMode("schedule"); setScheduleAt(toLocalInput(new Date(d.scheduledFor))); }
    setLoaded(true);
  }, [existing.data, loaded]);

  const editable = !existing.data || ["draft", "cancelled", "approved"].includes(existing.data.status);
  const fullAudience = completeAudience(audience);
  const count = useAudienceCount(fullAudience);
  const recipients = count.data?.count ?? 0;

  const save = trpc.reports.newsletters.saveDraft.useMutation();
  const sendTest = trpc.reports.newsletters.sendTest.useMutation();
  const submit = trpc.reports.newsletters.submit.useMutation();

  const scheduledIso = () => { const d = new Date(scheduleAt); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

  const persist = async () => {
    const r = await save.mutateAsync({ id, subject, bodyHtml, audience: fullAudience, scheduledFor: mode === "schedule" ? scheduledIso() : null });
    setId(r.id);
    setDirty(false);
    utils.reports.newsletters.list.invalidate();
    return r.id;
  };

  const onSave = async () => {
    try { await persist(); toast.success("Draft saved"); } catch (e) { toast.error((e as Error).message); }
  };
  const onTest = async () => {
    try { const r = await sendTest.mutateAsync({ subject, bodyHtml }); toast.success(`Test email sent to ${r.sentTo}`); }
    catch (e) { toast.error((e as Error).message); }
  };

  const problems: string[] = [];
  if (!subject.trim()) problems.push("Add a subject.");
  if (!bodyHtml.trim()) problems.push("Write the email.");
  if (!fullAudience) problems.push("Choose recipients.");
  else if (count.isSuccess && recipients === 0) problems.push("No one would receive this email.");
  if (mode === "schedule") {
    const iso = scheduledIso();
    if (!iso || new Date(iso).getTime() < Date.now() + 60_000) problems.push("Pick a send time in the future.");
  }
  if (!access.deliveryConfigured) problems.push("Email sending isn't set up on the server yet.");

  const onConfirm = async () => {
    try {
      const savedId = await persist();
      const r = await submit.mutateAsync({ id: savedId, mode, scheduledFor: mode === "schedule" ? scheduledIso() : null });
      utils.reports.newsletters.list.invalidate();
      if (r.status === "pending_approval") toast.success("Sent to an admin for approval");
      else if (r.status === "scheduled") toast.success(`Scheduled for ${new Date(scheduledIso()!).toLocaleString()}`);
      else toast.success(`Sending to ${r.recipients} ${r.recipients === 1 ? "person" : "people"}…`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConfirmOpen(false);
    }
  };

  const busy = save.isPending || submit.isPending;
  const actionLabel = access.needsApproval ? "Submit for approval" : mode === "schedule" ? "Schedule" : "Send now";

  if (initialId && !loaded) {
    return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading email…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="email-composer">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => { if (!dirty || window.confirm("Leave without saving your changes?")) onClose(); }}>
          <ArrowLeft className="w-4 h-4" />Back
        </Button>
        <h1 className="text-xl font-semibold text-foreground">{id ? "Edit email" : "New email"}</h1>
      </div>

      {!access.deliveryConfigured && (
        <div className="flex gap-3 p-3 border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Email sending isn't set up on the server yet (RESEND_API_KEY). You can write and save drafts, but tests and sends are turned off until it's configured.</p>
        </div>
      )}
      {!editable && (
        <div className="p-3 border border-[#57544E] text-sm text-[#BABAAE]">This email has been submitted and can't be edited. Cancel it first, or duplicate it.</div>
      )}

      <div className="grid gap-1 text-sm text-[#BABAAE] sm:grid-cols-2">
        <p className="truncate"><span className="text-[#8a857b]">From:</span> <span className="text-[#E0D3BD]">{access.from}</span></p>
        <p className="truncate"><span className="text-[#8a857b]">Reply-To:</span> <span className="text-[#E0D3BD]">{access.email}</span></p>
      </div>

      <section className="space-y-2">
        <Label htmlFor="email-subject">Subject</Label>
        <Input id="email-subject" value={subject} maxLength={255} disabled={!editable} onChange={(e) => { setSubject(e.target.value); setDirty(true); }} placeholder="Subject line" />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label>Message</Label>
          <div className="inline-flex border border-[#57544E]" role="tablist" aria-label="Editor view">
            {([["edit", "Edit", Pencil], ["preview", "Preview", Eye], ["text", "Plain text", FileText]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`inline-flex items-center gap-1.5 px-3 h-8 text-xs uppercase tracking-[0.08em] ${tab === k ? "bg-[#9B4D19]/25 text-[#E0D3BD]" : "text-[#BABAAE] hover:text-[#E0D3BD]"}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>
        {tab === "edit" ? (
          <RichEmailEditor value={bodyHtml} disabled={!editable} onChange={(h) => { setBodyHtml(h); setDirty(true); }} />
        ) : (
          <EmailPreview bodyHtml={bodyHtml} mode={tab === "preview" ? "html" : "text"} />
        )}
        <p className="text-xs text-[#8a857b]">Every email automatically ends with an unsubscribe link and the Rivers Lodge mailing address. A plain-text version is created for you.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Recipients</h2>
        <RecipientPicker value={audience} disabled={!editable} onChange={(a) => { setAudience(a); setDirty(true); }} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">When to send</h2>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer"><input type="radio" name="send-mode" className="accent-[#9B4D19]" checked={mode === "now"} disabled={!editable} onChange={() => setMode("now")} />Send now</label>
          <label className="inline-flex items-center gap-2 cursor-pointer"><input type="radio" name="send-mode" className="accent-[#9B4D19]" checked={mode === "schedule"} disabled={!editable} onChange={() => setMode("schedule")} />Schedule for later</label>
          {mode === "schedule" && (
            <Input type="datetime-local" aria-label="Send time" value={scheduleAt} disabled={!editable} min={toLocalInput(new Date())} onChange={(e) => { setScheduleAt(e.target.value); setDirty(true); }} className="w-auto" />
          )}
        </div>
        {access.needsApproval && (
          <p className="text-xs text-[#BABAAE] flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#C2662A]" />An admin approves employee emails before they go out{mode === "schedule" ? "; it's sent at the time you pick once approved" : ""}.</p>
        )}
      </section>

      {editable && (
        <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-background/95 backdrop-blur border-t border-border flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-1.5" disabled={busy} onClick={onSave}>{save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save draft</Button>
          <Button variant="outline" className="gap-1.5" disabled={sendTest.isPending || !bodyHtml.trim() || !access.deliveryConfigured} onClick={onTest} title={`Sends one copy to ${access.email}`}>
            {sendTest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}Send test to me
          </Button>
          <div className="flex-1" />
          {problems.length > 0 && <span className="text-xs text-[#BABAAE] w-full sm:w-auto order-last sm:order-none">{problems[0]}</span>}
          <Button className="gap-1.5 bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD]" disabled={busy || problems.length > 0 || !count.isSuccess} onClick={() => setConfirmOpen(true)}>
            {mode === "schedule" ? <CalendarClock className="w-4 h-4" /> : <Send className="w-4 h-4" />}{actionLabel}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionLabel}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p><strong>“{subject}”</strong> to <strong>{recipients} {recipients === 1 ? "person" : "people"}</strong> ({count.data?.label}).</p>
                {(count.data?.excludedUnsubscribed ?? 0) > 0 && <p>{count.data?.excludedUnsubscribed} unsubscribed {count.data?.excludedUnsubscribed === 1 ? "person is" : "people are"} left out.</p>}
                <p>{access.needsApproval
                  ? `An admin will review it${mode === "schedule" ? ` and it will go out ${new Date(scheduleAt).toLocaleString()}` : " and send it"}.`
                  : mode === "schedule" ? `It will be sent ${new Date(scheduleAt).toLocaleString()}.` : "It starts sending right away and can't be stopped once sent."}</p>
                <p className="text-xs">From {access.from} · Reply-To {access.email}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void onConfirm(); }} className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD]">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
