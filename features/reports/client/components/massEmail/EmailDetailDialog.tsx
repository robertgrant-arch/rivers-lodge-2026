/** View a past or pending email: details, delivery results, preview; duplicate / approve / cancel. */
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, X, Ban, Pencil, Trash2, Loader2 } from "lucide-react";
import { trpc } from "@shared/lib/trpc";
import { Button } from "@shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import EmailPreview from "./EmailPreview";
import type { EmailAccess } from "./EmailComposer";
import { STATUS_CONFIG, fmtDateTime, type EmailStatus } from "./types";

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as EmailStatus] ?? STATUS_CONFIG.draft;
  return <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium border whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
}

export default function EmailDetailDialog({ id, access, currentUserId, onClose, onEdit }: {
  id: number; access: EmailAccess; currentUserId?: string; onClose: () => void; onEdit: (id: number) => void;
}) {
  const utils = trpc.useUtils();
  const q = trpc.reports.newsletters.get.useQuery({ id }, { refetchInterval: (query) => (query.state.data?.status === "sending" ? 3000 : false) });
  const [showRecipients, setShowRecipients] = useState(false);
  const [view, setView] = useState<"html" | "text">("html");
  const recipients = trpc.reports.newsletters.recipients.useQuery({ id }, { enabled: showRecipients });
  const done = (msg: string) => { toast.success(msg); utils.reports.newsletters.list.invalidate(); utils.reports.newsletters.get.invalidate({ id }); };
  const fail = (e: { message: string }) => toast.error(e.message);
  const duplicate = trpc.reports.newsletters.duplicate.useMutation({ onSuccess: (r) => { done("Copied to a new draft"); onEdit(r.id); }, onError: fail });
  const approve = trpc.reports.newsletters.approve.useMutation({ onSuccess: (r) => done(r.status === "scheduled" ? "Approved — scheduled" : `Approved — sending to ${r.queued}`), onError: fail });
  const reject = trpc.reports.newsletters.reject.useMutation({ onSuccess: () => done("Sent back to the author as a draft"), onError: fail });
  const cancel = trpc.reports.newsletters.cancel.useMutation({ onSuccess: () => done("Cancelled — it's a draft again"), onError: fail });
  const del = trpc.reports.newsletters.delete.useMutation({ onSuccess: () => { done("Draft deleted"); onClose(); }, onError: fail });

  const d = q.data;
  const mine = !!d && (access.isAdmin || d.createdBy === currentUserId);
  const editable = !!d && ["draft", "cancelled", "approved"].includes(d.status);
  const busy = duplicate.isPending || approve.isPending || reject.isPending || cancel.isPending || del.isPending;
  const from = d?.senderName ? `${d.senderName} at Rivers Lodge <${access.fromAddress}>` : "—";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto" data-testid="email-detail">
        <DialogHeader>
          <DialogTitle className="pr-6 break-words">{d?.subject ?? "Email"}</DialogTitle>
        </DialogHeader>
        {!d ? (
          <div className="py-10 flex justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-[#8a857b]">Status</dt><dd><StatusBadge status={d.status} /></dd>
              <dt className="text-[#8a857b]">From</dt><dd className="break-all">{from}</dd>
              <dt className="text-[#8a857b]">Reply-To</dt><dd className="break-all">{d.replyTo ?? "—"}</dd>
              <dt className="text-[#8a857b]">Recipients</dt><dd>{d.audienceLabel ?? "Not chosen yet"}</dd>
              <dt className="text-[#8a857b]">Created</dt><dd>{fmtDateTime(d.createdAt)}{d.creatorEmail ? ` by ${d.creatorEmail}` : ""}</dd>
              {d.approvedAt && <><dt className="text-[#8a857b]">Approved</dt><dd>{fmtDateTime(d.approvedAt)}{d.approverEmail ? ` by ${d.approverEmail}` : ""}</dd></>}
              {d.status === "scheduled" && <><dt className="text-[#8a857b]">Scheduled for</dt><dd>{fmtDateTime(d.scheduledFor)}</dd></>}
              {d.status === "pending_approval" && <><dt className="text-[#8a857b]">Requested</dt><dd>{d.requestedSendMode === "schedule" ? `Schedule for ${fmtDateTime(d.scheduledFor)}` : "Send as soon as approved"}</dd></>}
              {(d.status === "sent" || d.status === "sending") && <>
                <dt className="text-[#8a857b]">{d.status === "sent" ? "Sent" : "Started"}</dt><dd>{fmtDateTime(d.sentAt ?? d.sendStartedAt)}</dd>
                <dt className="text-[#8a857b]">Delivery</dt>
                <dd>
                  {d.counts.sent + d.counts.bounced + d.counts.complained} sent · {d.counts.failed} failed
                  {d.counts.queued > 0 && ` · ${d.counts.queued} waiting`}
                  {d.counts.bounced > 0 && ` · ${d.counts.bounced} bounced`}
                  {d.counts.complained > 0 && ` · ${d.counts.complained} marked as spam`}
                </dd>
              </>}
            </dl>

            <div className="flex flex-wrap gap-2">
              {d.status === "pending_approval" && access.isAdmin && <>
                <Button size="sm" className="gap-1.5 bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD]" disabled={busy} onClick={() => { if (window.confirm(d.requestedSendMode === "schedule" ? "Approve and schedule this email?" : "Approve and send this email now?")) approve.mutate({ id }); }}><Check className="w-4 h-4" />Approve</Button>
                <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => reject.mutate({ id })}><X className="w-4 h-4" />Send back</Button>
              </>}
              {mine && (d.status === "pending_approval" || d.status === "scheduled") && (
                <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => cancel.mutate({ id })}><Ban className="w-4 h-4" />Cancel {d.status === "scheduled" ? "schedule" : "request"}</Button>
              )}
              {mine && editable && <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEdit(id)}><Pencil className="w-4 h-4" />Edit</Button>}
              <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => duplicate.mutate({ id })}><Copy className="w-4 h-4" />Duplicate</Button>
              {mine && editable && <Button size="sm" variant="ghost" className="gap-1.5 text-red-300 hover:text-red-200" disabled={busy} onClick={() => { if (window.confirm("Delete this draft?")) del.mutate({ id }); }}><Trash2 className="w-4 h-4" />Delete</Button>}
            </div>

            <div className="space-y-2">
              <div className="inline-flex border border-[#57544E]">
                {(["html", "text"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setView(k)} className={`px-3 h-7 text-xs uppercase tracking-[0.08em] ${view === k ? "bg-[#9B4D19]/25 text-[#E0D3BD]" : "text-[#BABAAE]"}`}>{k === "html" ? "Email" : "Plain text"}</button>
                ))}
              </div>
              <EmailPreview bodyHtml={d.finalContent ?? d.draftContent ?? ""} mode={view} height={460} />
            </div>

            {(d.status === "sent" || d.status === "sending") && (
              <div>
                <Button size="sm" variant="ghost" onClick={() => setShowRecipients((v) => !v)}>{showRecipients ? "Hide" : "Show"} recipients</Button>
                {showRecipients && (
                  <div className="mt-2 border border-[#57544E] max-h-72 overflow-y-auto text-sm">
                    {recipients.isLoading ? <p className="p-3 text-muted-foreground">Loading…</p> : (
                      <table className="w-full">
                        <tbody className="divide-y divide-[#57544E]/60">
                          {(recipients.data ?? []).map((r) => (
                            <tr key={r.email}>
                              <td className="px-3 py-1.5 break-all">{r.name ? <>{r.name} <span className="text-[#8a857b]">{r.email}</span></> : r.email}</td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap" title={r.error ?? undefined}>
                                <span className={r.status === "sent" ? "text-emerald-300" : r.status === "queued" ? "text-[#BABAAE]" : "text-red-300"}>{r.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
