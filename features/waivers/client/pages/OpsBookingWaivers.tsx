/**
 * /ops/waivers/booking/:id            — booking waiver status + actions (ops)
 * /ops/waivers/booking/:id/check-in   — printable check-in list (no layout)
 */
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { trpc } from "@shared/lib/trpc";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Skeleton } from "@shared/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import { ArrowLeft, Download, Mail, Pencil, Printer, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { formatUsPhone } from "@shared/waiverParty";
import { WaiverStatusBadge, fmtDate, fmtDateTime, fmtYmd, ops, waiverStatusLabel, type SendResultLike } from "../components/waiverUi";
import { bookingStatusLabel } from "../components/DocuSignWaiversTab";

function useBookingId(): number {
  const [, a] = useRoute("/ops/waivers/booking/:id");
  const [, b] = useRoute("/ops/waivers/booking/:id/check-in");
  return Number(a?.id ?? b?.id ?? 0);
}

function showResult(r: SendResultLike, onEmailOnly?: () => void) {
  if (r.ok) { toast.success("Sent"); return; }
  if (r.queued) { toast.warning(`DocuSign is unavailable — queued and retrying automatically. (${r.error ?? ""})`); return; }
  toast.error(r.error ?? "DocuSign rejected the send", r.canEmailOnly && onEmailOnly ? { action: { label: "Send by email only", onClick: onEmailOnly }, duration: 15000 } : undefined);
}

export default function OpsBookingWaivers() {
  const id = useBookingId();
  const utils = trpc.useUtils();
  const q = trpc.waivers.docusign.bookingDetail.useQuery({ bookingId: id }, { enabled: id > 0 });
  const [editing, setEditing] = useState<{ signerId: number; fullName: string; email: string; phone: string } | null>(null);
  const invalidate = () => utils.waivers.docusign.bookingDetail.invalidate({ bookingId: id });
  const resend = trpc.waivers.docusign.opsResendSigner.useMutation({ onSettled: invalidate, onError: (e) => toast.error(e.message) });
  const edit = trpc.waivers.docusign.opsEditSigner.useMutation({ onSettled: invalidate, onError: (e) => toast.error(e.message) });
  const sync = trpc.waivers.docusign.syncBooking.useMutation({
    onSuccess: (r) => { toast.success(`Refreshed ${r.synced} envelope${r.synced === 1 ? "" : "s"} from DocuSign`); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const download = trpc.waivers.docusign.downloadUrl.useMutation({ onSuccess: (d) => window.open(d.url, "_blank", "noopener"), onError: (e) => toast.error(e.message) });

  if (q.isLoading) return <div className="p-8"><Skeleton className="h-64 bg-[#363330]" /></div>;
  if (!q.data) return <div className="p-8 text-[#BABAAE]">Booking not found.</div>;
  const v = q.data;
  const b = v.booking;

  const doResend = (signerId: number, emailOnly = false) =>
    resend.mutate({ signerId, emailOnly }, { onSuccess: (r) => showResult(r, () => doResend(signerId, true)) });

  return (
    <div className="min-h-screen bg-background px-6 py-10 max-w-6xl mx-auto space-y-6">
      <Link href="/ops/waivers"><span className={`${ops.ghostBtn} inline-flex items-center gap-1 cursor-pointer`}><ArrowLeft className="w-3 h-3" />Waivers</span></Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={ops.label}>Booking waivers</p>
          <h1 className="font-sans text-2xl font-medium text-[#E0D3BD] font-mono">{b.bookingRef}</h1>
          <p className="text-sm text-[#BABAAE] mt-1">{b.propertyName} · {fmtYmd(b.startDate)}{b.endDate !== b.startDate ? ` – ${fmtYmd(b.endDate)}` : ""} · {bookingStatusLabel(b.status)}</p>
          <p className={`text-sm mt-2 ${v.signedCount === v.totalAdults ? "text-[#a7ad8c]" : "text-[#d9a38a]"}`}>Waivers: {v.signedCount} of {v.totalAdults} signed</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className={ops.outlineBtn} disabled={sync.isPending} onClick={() => sync.mutate({ bookingId: id })}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh from DocuSign</Button>
          <a href={`/ops/waivers/booking/${id}/check-in`} target="_blank" rel="noopener"><Button className={`${ops.primaryBtn} h-8`}><Printer className="w-3.5 h-3.5 mr-1.5" />Check-in list</Button></a>
        </div>
      </div>

      <div className={`${ops.card} p-4`}>
        <p className={ops.label}>Member's Master waiver</p>
        <div className="flex items-center gap-3 mt-2">
          <WaiverStatusBadge status={v.master.valid ? "valid" : v.master.state} />
          {v.master.signed?.signedAt && <span className="text-sm text-[#BABAAE]">signed {fmtDate(v.master.signed.signedAt)} (v{v.master.signed.templateVersion})</span>}
          <Link href={`/ops/membership/${b.memberId}`}><span className={`${ops.ghostBtn} cursor-pointer`}>Member file →</span></Link>
        </div>
      </div>

      <div className={ops.card}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-[#BABAAE] border-b border-[#57544E]">
              <th className="px-4 py-2 font-normal">Adult</th><th className="px-4 py-2 font-normal">Contact</th><th className="px-4 py-2 font-normal">Status</th>
              <th className="px-4 py-2 font-normal">Signed</th><th className="px-4 py-2 font-normal">Minors covered</th><th className="px-4 py-2 font-normal">Actions</th>
            </tr></thead>
            <tbody>
              {v.people.map((p) => (
                <tr key={p.partyAdultId} className="border-b border-[#57544E]/50 align-top">
                  <td className="px-4 py-2"><div className="text-[#E0D3BD]">{p.fullName}</div><div className="text-xs text-[#BABAAE]">{p.role === "member" ? "Member" : "Guest"}</div></td>
                  <td className="px-4 py-2 text-xs text-[#BABAAE]"><div>{p.email}</div><div>{formatUsPhone(p.phone)}{p.deliveryMethod === "email" ? " · email only" : ""}</div></td>
                  <td className="px-4 py-2">
                    <WaiverStatusBadge status={p.status} />
                    {p.declineReason && <div className="text-xs text-[#d9a38a] mt-1">“{p.declineReason}”</div>}
                    {p.lastError && p.status !== "signed" && <div className="text-xs text-[#d9a38a] mt-1 max-w-xs">{p.lastError}</div>}
                  </td>
                  <td className="px-4 py-2 text-[#BABAAE]">{fmtDateTime(p.signedAt)}</td>
                  <td className="px-4 py-2 text-xs text-[#BABAAE]">{p.minors.length ? p.minors.map((m) => `${m.fullName} (${fmtYmd(m.dateOfBirth)})`).join(", ") : "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {p.signerId && p.status !== "signed" && !["expired", "voided", "removed"].includes(p.status) && (<>
                        <button className={`${ops.ghostBtn} inline-flex items-center gap-1`} disabled={resend.isPending} onClick={() => doResend(p.signerId!)}><Send className="w-3 h-3" />Resend</button>
                        <button className={`${ops.ghostBtn} inline-flex items-center gap-1`} disabled={resend.isPending} onClick={() => doResend(p.signerId!, true)}><Mail className="w-3 h-3" />Email only</button>
                        <button className={`${ops.ghostBtn} inline-flex items-center gap-1`} onClick={() => setEditing({ signerId: p.signerId!, fullName: p.fullName, email: p.email, phone: p.phone ?? "" })}><Pencil className="w-3 h-3" />Edit</button>
                      </>)}
                      {p.hasSignedPdf && p.signerId && <button className={`${ops.ghostBtn} inline-flex items-center gap-1`} onClick={() => download.mutate({ kind: "signer", id: p.signerId!, doc: "signed" })}><Download className="w-3 h-3" />PDF</button>}
                      {p.hasCertificate && p.signerId && <button className={`${ops.ghostBtn} inline-flex items-center gap-1`} onClick={() => download.mutate({ kind: "signer", id: p.signerId!, doc: "certificate" })}><Download className="w-3 h-3" />Certificate</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {v.envelopes.some((e) => e.status === "queued" || e.status === "failed") && (
          <div className="p-4 border-t border-[#57544E] text-xs text-[#d9a38a] space-y-1">
            {v.envelopes.filter((e) => e.status === "queued" || e.status === "failed").map((e) => (
              <div key={e.id}>Envelope {e.id}: {e.status === "queued" ? `queued — retrying (attempt ${e.attempts}${e.nextAttemptAt ? `, next ${fmtDateTime(e.nextAttemptAt)}` : ""})` : "rejected by DocuSign"}{e.lastError ? ` — ${e.lastError}` : ""}</div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-md">
            <DialogHeader><DialogTitle className="font-sans font-medium">Edit signer</DialogTitle></DialogHeader>
            <p className="text-xs text-[#BABAAE]">Corrects the DocuSign recipient and resends their waiver.</p>
            {(["fullName", "email", "phone"] as const).map((k) => (
              <div key={k} className="space-y-1.5">
                <Label className={ops.label}>{k === "fullName" ? "Full name" : k === "email" ? "Email" : "Mobile (US)"}</Label>
                <Input className={ops.input} value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
              </div>
            ))}
            <DialogFooter>
              <Button variant="ghost" className={ops.ghostBtn} onClick={() => setEditing(null)}>Cancel</Button>
              <Button className={ops.primaryBtn} disabled={edit.isPending} onClick={() => edit.mutate(editing, { onSuccess: (r) => { showResult(r); if (r.ok) setEditing(null); } })}>Save &amp; resend</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/** Printable check-in list: who signed, minors covered by whom, member's Master waiver status. */
export function OpsBookingCheckInList() {
  const id = useBookingId();
  const q = trpc.waivers.docusign.bookingDetail.useQuery({ bookingId: id }, { enabled: id > 0 });
  useEffect(() => {
    if (q.data) setTimeout(() => window.print(), 300);
  }, [q.data]);
  if (q.error) return <div className="p-8 text-black bg-white min-h-screen">{q.error.message}</div>;
  if (!q.data) return <div className="p-8 text-black bg-white min-h-screen">Loading…</div>;
  const v = q.data;
  const b = v.booking;
  return (
    <div className="bg-white text-black min-h-screen p-8 max-w-4xl mx-auto font-sans text-sm">
      <div className="flex justify-between items-start border-b border-black pb-3 mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest">Rivers Lodge &amp; Hunt Club — Check-in list</div>
          <div className="text-xl font-semibold mt-1">{b.bookingRef} · {b.propertyName}</div>
          <div>{fmtYmd(b.startDate)}{b.endDate !== b.startDate ? ` – ${fmtYmd(b.endDate)}` : ""} · {bookingStatusLabel(b.status)}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold">Waivers: {v.signedCount} of {v.totalAdults} signed</div>
          <div>Member's Master waiver: {v.master.valid ? `on file (signed ${fmtDate(v.master.signed?.signedAt)})` : waiverStatusLabel(v.master.state)}</div>
          <button className="mt-2 border border-black px-3 py-1 text-xs print:hidden" onClick={() => window.print()}>Print</button>
        </div>
      </div>
      <h2 className="font-semibold mb-1">Adults</h2>
      <table className="w-full border-collapse mb-5">
        <thead><tr className="text-left border-b border-black">
          <th className="py-1 pr-2">✓</th><th className="py-1 pr-2">Name</th><th className="py-1 pr-2">Role</th><th className="py-1 pr-2">Booking waiver</th><th className="py-1 pr-2">Signed</th><th className="py-1">Arrived</th>
        </tr></thead>
        <tbody>
          {v.people.map((p) => (
            <tr key={p.partyAdultId} className="border-b border-gray-300">
              <td className="py-1.5 pr-2">{p.status === "signed" ? "✔" : "✘"}</td>
              <td className="py-1.5 pr-2">{p.fullName}</td>
              <td className="py-1.5 pr-2">{p.role === "member" ? "Member" : "Guest"}</td>
              <td className="py-1.5 pr-2">{p.status === "signed" ? "Signed" : `NOT SIGNED (${waiverStatusLabel(p.status)})`}</td>
              <td className="py-1.5 pr-2">{fmtDateTime(p.signedAt)}</td>
              <td className="py-1.5">☐</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="font-semibold mb-1">Minors</h2>
      {v.minors.length === 0 ? <p className="mb-5">None listed.</p> : (
        <table className="w-full border-collapse mb-5">
          <thead><tr className="text-left border-b border-black"><th className="py-1 pr-2">Name</th><th className="py-1 pr-2">Date of birth</th><th className="py-1 pr-2">Covered by</th><th className="py-1">Arrived</th></tr></thead>
          <tbody>
            {v.minors.map((m) => (
              <tr key={m.id} className="border-b border-gray-300">
                <td className="py-1.5 pr-2">{m.fullName}</td>
                <td className="py-1.5 pr-2">{fmtYmd(m.dateOfBirth)}</td>
                <td className="py-1.5 pr-2">{m.covered ? `${m.guardianName} (signed)` : `NOT COVERED — ${m.guardianName} hasn't signed a waiver listing this minor`}</td>
                <td className="py-1.5">☐</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-gray-600">Only listed guests may enter. Every adult must have signed before entering the property. Printed {fmtDateTime(Date.now())}.</p>
    </div>
  );
}
