/**
 * Member-facing DocuSign waiver UI (member portal, stone palette):
 *  - MasterWaiverGate: "Sign your master waiver to book" + SIGN WAIVER
 *  - BookingWaiverLink / BookingWaiverDialog: read-only current Booking waiver
 *  - BookingWaiversPanel: per-person status, Resend, Edit guest, Add/Remove guest
 */
import { useState } from "react";
import { trpc } from "@shared/lib/trpc";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import { AlertTriangle, CheckCircle2, FileSignature, Loader2, Mail, Pencil, Plus, Send, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { formatUsPhone, isValidEmail, normalizeUsPhone } from "@shared/waiverParty";
import { WaiverStatusBadge, fmtDateTime, fmtYmd, type SendResultLike } from "./waiverUi";

const input = "bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500";

// ─── Master waiver gate ──────────────────────────────────────────────────────

/**
 * Renders nothing when the member may book. Otherwise blocks with the
 * SIGN WAIVER flow and polls until DocuSign reports completion.
 * `onStatus` lets the parent know whether booking is unlocked.
 */
export function MasterWaiverGate({ children }: { children: React.ReactNode }) {
  const q = trpc.waivers.docusign.myMasterStatus.useQuery(undefined, {
    refetchInterval: (query) => {
      const d: any = query.state.data;
      return d && d.isMember && d.enabled && !d.valid && d.state === "pending" ? 10_000 : false;
    },
  });
  const send = trpc.waivers.docusign.sendMyMasterWaiver.useMutation({ onSettled: () => q.refetch() });
  const [phone, setPhone] = useState<string | null>(null);
  const [result, setResult] = useState<SendResultLike | null>(null);

  if (q.isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>;
  const d: any = q.data;
  if (!d || !d.isMember || !d.enabled || d.valid) return <>{children}</>;

  if (d.state === "no_template") {
    return (
      <div className="p-4 rounded-lg border border-amber-800/50 bg-amber-900/20 text-sm text-amber-200">
        Online booking is paused while the lodge publishes its Master waiver. Please contact the lodge to book.
      </div>
    );
  }

  const mobile = phone ?? d.contact?.phone ?? "";
  const doSend = (emailOnly = false) => {
    if (!emailOnly && mobile && !normalizeUsPhone(mobile)) { toast.error("Enter a valid US mobile number, or send by email only."); return; }
    send.mutate({ emailOnly, phone: emailOnly ? undefined : mobile || undefined }, { onSuccess: (r) => setResult(r) });
  };
  const pending = d.state === "pending";
  const reason = d.state === "outdated" ? "The Master waiver has been updated — please sign the new version."
    : d.state === "resign_required" ? "The lodge has asked you to sign the Master waiver again."
    : d.state === "expired" ? "Your Master waiver has expired (it renews every 12 months)."
    : d.state === "declined" ? "You declined the Master waiver. You'll need to sign it to book."
    : "Every member needs a signed Master waiver on file before booking.";

  return (
    <div className="space-y-4 p-5 rounded-lg border border-amber-700/60 bg-stone-800">
      <div className="flex items-start gap-3">
        <FileSignature className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-stone-100">Sign your master waiver to book</p>
          <p className="text-sm text-stone-400 mt-1">{reason}</p>
        </div>
      </div>
      {pending ? (
        <div className="text-sm text-stone-300 space-y-2">
          <p className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-amber-500" />We sent it to <span className="text-stone-100">{d.contact?.email}</span>{d.current?.deliveryMethod === "email_sms" && d.contact?.phone ? <> and texted <span className="text-stone-100">{formatUsPhone(d.contact.phone)}</span></> : null}. Booking unlocks automatically once you've signed.</p>
          <button className="text-xs text-amber-500 hover:text-amber-400" disabled={send.isPending} onClick={() => doSend()}>Didn't get it? Send again</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-stone-400">Mobile for the text message (US)</Label>
            <Input className={input} placeholder="(816) 555-0100" value={mobile} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold tracking-wide w-full" disabled={send.isPending} onClick={() => doSend()}>
            {send.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}SIGN WAIVER
          </Button>
          <p className="text-xs text-stone-500">DocuSign will email and text you a link to sign on your phone or computer.</p>
        </div>
      )}
      {result && !result.ok && (
        <div className="p-3 rounded border border-red-800/60 bg-red-950/30 text-sm text-red-200 space-y-2">
          <p className="flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{result.queued ? `DocuSign is temporarily unavailable. We'll keep trying and send it shortly. (${result.error ?? ""})` : `DocuSign couldn't send it: ${result.error}`}</p>
          {result.canEmailOnly && <Button size="sm" variant="outline" className="border-stone-600 text-stone-200" onClick={() => doSend(true)}><Mail className="w-3.5 h-3.5 mr-1.5" />Send by email only</Button>}
        </div>
      )}
    </div>
  );
}

// ─── Read-only Booking waiver ────────────────────────────────────────────────

export function BookingWaiverDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const q = trpc.waivers.docusign.currentBookingWaiver.useQuery(undefined, { enabled: open });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-stone-100">{q.data?.title ?? "Rivers Lodge Release & Liability Waiver"}{q.data ? ` (v${q.data.version})` : ""}</DialogTitle></DialogHeader>
        {q.isLoading ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : q.data ? (
          <div className="text-sm text-stone-300 whitespace-pre-wrap leading-relaxed">{q.data.body}</div>
        ) : (
          <p className="text-sm text-stone-400">The booking waiver hasn't been published yet.</p>
        )}
        <DialogFooter><Button variant="outline" className="border-stone-600 text-stone-200" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Booking waivers panel (member portal booking detail) ────────────────────

function resultToast(r: SendResultLike, emailOnly?: () => void) {
  if (r.ok) { toast.success("Waiver sent"); return; }
  if (r.queued) { toast.warning(`DocuSign is temporarily unavailable — we'll keep trying. (${r.error ?? ""})`); return; }
  toast.error(`DocuSign couldn't send it: ${r.error ?? "unknown error"}`, r.canEmailOnly && emailOnly ? { action: { label: "Send by email only", onClick: emailOnly }, duration: 15000 } : undefined);
}

export function BookingWaiversPanel({ bookingId, canEdit }: { bookingId: number; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const q = trpc.waivers.docusign.bookingWaivers.useQuery({ bookingId });
  const invalidate = () => { utils.waivers.docusign.bookingWaivers.invalidate({ bookingId }); utils.propertyBooking.bookings.myBookings.invalidate(); };
  const resend = trpc.waivers.docusign.resendSigner.useMutation({ onSettled: invalidate, onError: (e) => toast.error(e.message) });
  const edit = trpc.waivers.docusign.editSigner.useMutation({ onSettled: invalidate, onError: (e) => toast.error(e.message) });
  const add = trpc.waivers.docusign.addGuest.useMutation({ onSettled: invalidate, onError: (e) => toast.error(e.message) });
  const remove = trpc.waivers.docusign.removeGuest.useMutation({ onSuccess: () => toast.success("Guest removed"), onSettled: invalidate, onError: (e) => toast.error(e.message) });
  const removeMinor = trpc.waivers.docusign.removeMinor.useMutation({ onSuccess: () => toast.success("Minor removed"), onSettled: invalidate, onError: (e) => toast.error(e.message) });
  const [editing, setEditing] = useState<{ signerId: number; fullName: string; email: string; phone: string; role: string } | null>(null);
  const [adding, setAdding] = useState<null | { type: "adult" | "minor"; fullName: string; email: string; phone: string; dateOfBirth: string; guardianAdultId: number | null }>(null);

  if (q.isLoading) return <div className="py-3"><Loader2 className="w-4 h-4 animate-spin text-amber-500" /></div>;
  const v = q.data;
  // While DocuSign waivers are off there is nothing to track per person.
  if (!v || !v.enabled || v.people.length === 0) return null;

  const doResend = (signerId: number, emailOnly = false) => resend.mutate({ bookingId, signerId, emailOnly }, { onSuccess: (r) => resultToast(r, () => doResend(signerId, true)) });
  const failedEnv = v.envelopes.find((e) => e.status === "failed");

  return (
    <div className="mt-3 pt-3 border-t border-stone-700 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-stone-300 uppercase tracking-wide">Waivers: {v.signedCount} of {v.totalAdults} signed</p>
        {canEdit && v.enabled && (
          <div className="flex gap-3">
            <button className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1" onClick={() => setAdding({ type: "adult", fullName: "", email: "", phone: "", dateOfBirth: "", guardianAdultId: null })}><UserPlus className="w-3 h-3" />Add guest</button>
          </div>
        )}
      </div>
      {failedEnv && (
        <div className="p-2 rounded border border-red-800/60 bg-red-950/30 text-xs text-red-200 flex flex-wrap items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />DocuSign couldn't send the waiver: {failedEnv.lastError}
          {!failedEnv.emailOnly && v.people[0]?.signerId && <Button size="sm" variant="outline" className="h-6 border-stone-600 text-stone-200 text-xs" onClick={() => doResend(v.people.find((p) => p.role === "member")?.signerId ?? v.people[0].signerId!, true)}><Mail className="w-3 h-3 mr-1" />Send by email only</Button>}
        </div>
      )}
      <ul className="space-y-1.5">
        {v.people.map((p) => {
          const open = p.signerId && p.status !== "signed" && !["expired", "voided", "removed"].includes(p.status);
          return (
            <li key={p.partyAdultId} className="text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-stone-100">{p.fullName}{p.role === "member" ? " (you)" : ""}</span>
                <WaiverStatusBadge status={p.status} light />
                {p.status === "signed" && p.signedAt && <span className="text-xs text-stone-500">{fmtDateTime(p.signedAt)}</span>}
                {canEdit && v.enabled && open && (
                  <span className="flex gap-3 ml-auto">
                    <button className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1" disabled={resend.isPending} onClick={() => doResend(p.signerId!)}><Send className="w-3 h-3" />Resend</button>
                    <button className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1" onClick={() => setEditing({ signerId: p.signerId!, fullName: p.fullName, email: p.email, phone: p.phone ?? "", role: p.role })}><Pencil className="w-3 h-3" />Edit</button>
                  </span>
                )}
                {canEdit && v.enabled && p.role === "guest" && (
                  <button className={`text-xs text-red-400 hover:text-red-300 flex items-center gap-1 ${open ? "" : "ml-auto"}`} onClick={() => { if (confirm(`Remove ${p.fullName}${p.minors.length ? " and the minors they're responsible for" : ""} from this booking?`)) remove.mutate({ bookingId, partyAdultId: p.partyAdultId }); }}><Trash2 className="w-3 h-3" />Remove</button>
                )}
              </div>
              {p.lastError && p.status !== "signed" && <p className="text-xs text-red-300 mt-0.5">{p.lastError}</p>}
              {p.minors.length > 0 && (
                <ul className="ml-4 mt-0.5 text-xs text-stone-400 space-y-0.5">
                  {p.minors.map((m) => {
                    const covered = v.minors.find((x) => x.id === m.id)?.covered;
                    return (
                      <li key={m.id} className="flex items-center gap-2">
                        Minor: {m.fullName} ({fmtYmd(m.dateOfBirth)}) — {covered ? <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />covered</span> : "covered once signed"}
                        {canEdit && v.enabled && <button className="text-red-400 hover:text-red-300" title="Remove minor" onClick={() => { if (confirm(`Remove ${m.fullName}?`)) removeMinor.mutate({ bookingId, minorId: m.id }); }}><Trash2 className="w-3 h-3" /></button>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {v.people.some((p) => p.role === "guest" && p.status !== "signed") && (
        <p className="text-xs text-stone-500">Every adult must sign before entering the property.</p>
      )}

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-md">
            <DialogHeader><DialogTitle className="text-stone-100">Edit {editing.role === "member" ? "your details" : "guest"}</DialogTitle></DialogHeader>
            <p className="text-xs text-stone-400">We'll correct the DocuSign request and resend it.</p>
            <div className="space-y-3">
              <div><Label className="text-xs text-stone-400">Full name</Label><Input className={input} value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} /></div>
              <div><Label className="text-xs text-stone-400">Email</Label><Input className={input} disabled={editing.role === "member"} value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div><Label className="text-xs text-stone-400">Mobile (US)</Label><Input className={input} value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-stone-600 text-stone-200" onClick={() => setEditing(null)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-500 text-stone-950" disabled={edit.isPending} onClick={() => {
                if (!isValidEmail(editing.email)) { toast.error("Enter a valid email"); return; }
                if (!normalizeUsPhone(editing.phone)) { toast.error("Enter a valid US mobile number"); return; }
                edit.mutate({ bookingId, signerId: editing.signerId, fullName: editing.fullName, email: editing.role === "member" ? undefined : editing.email, phone: editing.phone }, {
                  onSuccess: (r) => { resultToast(r); if (r.ok || r.queued) setEditing(null); },
                });
              }}>Save &amp; resend</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {adding && (
        <Dialog open onOpenChange={(o) => !o && setAdding(null)}>
          <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-md">
            <DialogHeader><DialogTitle className="text-stone-100">Add a guest</DialogTitle></DialogHeader>
            <div className="flex gap-2">
              {(["adult", "minor"] as const).map((t) => (
                <Button key={t} size="sm" variant={adding.type === t ? "default" : "outline"} className={adding.type === t ? "bg-amber-600 text-stone-950" : "border-stone-600 text-stone-200"} onClick={() => setAdding({ ...adding, type: t })}>{t === "adult" ? "Adult" : "Minor"}</Button>
              ))}
            </div>
            <div className="space-y-3">
              <div><Label className="text-xs text-stone-400">Full name</Label><Input className={input} value={adding.fullName} onChange={(e) => setAdding({ ...adding, fullName: e.target.value })} /></div>
              {adding.type === "adult" ? (<>
                <div><Label className="text-xs text-stone-400">Email</Label><Input className={input} value={adding.email} onChange={(e) => setAdding({ ...adding, email: e.target.value })} /></div>
                <div><Label className="text-xs text-stone-400">Mobile (US)</Label><Input className={input} value={adding.phone} onChange={(e) => setAdding({ ...adding, phone: e.target.value })} /></div>
                <p className="text-xs text-stone-500">They'll get a booking waiver by email and text right away.</p>
              </>) : (<>
                <div><Label className="text-xs text-stone-400">Date of birth</Label><Input type="date" className={input} value={adding.dateOfBirth} onChange={(e) => setAdding({ ...adding, dateOfBirth: e.target.value })} /></div>
                <div>
                  <Label className="text-xs text-stone-400">Parent/guardian in this party</Label>
                  <select className={`w-full h-9 rounded-md px-2 ${input}`} value={adding.guardianAdultId ?? ""} onChange={(e) => setAdding({ ...adding, guardianAdultId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Choose…</option>
                    {v.people.map((p) => <option key={p.partyAdultId} value={p.partyAdultId}>{p.fullName}{p.role === "member" ? " (you)" : ""}</option>)}
                  </select>
                </div>
                <p className="text-xs text-stone-500">Their guardian will get an updated waiver that lists them.</p>
              </>)}
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-stone-600 text-stone-200" onClick={() => setAdding(null)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-500 text-stone-950" disabled={add.isPending} onClick={() => {
                if (!adding.fullName.trim()) { toast.error("Full name is required"); return; }
                if (adding.type === "adult") {
                  if (!isValidEmail(adding.email)) { toast.error("Enter a valid email"); return; }
                  if (!normalizeUsPhone(adding.phone)) { toast.error("Enter a valid US mobile number"); return; }
                  add.mutate({ bookingId, guest: { type: "adult", fullName: adding.fullName, email: adding.email, phone: adding.phone } }, { onSuccess: (r) => { resultToast(r); setAdding(null); } });
                } else {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(adding.dateOfBirth)) { toast.error("Date of birth is required"); return; }
                  if (!adding.guardianAdultId) { toast.error("Choose the parent/guardian"); return; }
                  add.mutate({ bookingId, guest: { type: "minor", fullName: adding.fullName, dateOfBirth: adding.dateOfBirth, guardianAdultId: adding.guardianAdultId } }, { onSuccess: (r) => { resultToast(r); setAdding(null); } });
                }
              }}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
