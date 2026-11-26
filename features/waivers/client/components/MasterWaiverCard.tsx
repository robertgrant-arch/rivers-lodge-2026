/**
 * Ops member file: Master waiver status, signed date, signed PDF + certificate,
 * and Send / Resend / Require re-sign.
 */
import { trpc } from "@shared/lib/trpc";
import { Button } from "@shared/ui/button";
import { Skeleton } from "@shared/ui/skeleton";
import { Download, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { WaiverStatusBadge, fmtDate, fmtDateTime, ops, type SendResultLike } from "./waiverUi";

export function MasterWaiverCard({ memberId }: { memberId: number }) {
  const utils = trpc.useUtils();
  const q = trpc.waivers.docusign.memberMaster.useQuery({ memberId }, { enabled: memberId > 0 });
  const invalidate = () => utils.waivers.docusign.memberMaster.invalidate({ memberId });
  const handle = (r: SendResultLike, retryEmailOnly?: () => void) => {
    if (r.ok) toast.success("Master waiver sent");
    else if (r.queued) toast.warning(`DocuSign is unavailable — queued and retrying. (${r.error ?? ""})`);
    else toast.error(r.error ?? "Couldn't send", r.canEmailOnly && retryEmailOnly ? { action: { label: "Send by email only", onClick: retryEmailOnly }, duration: 15000 } : undefined);
  };
  const send = trpc.waivers.docusign.sendMaster.useMutation({ onSettled: invalidate, onError: (e) => toast.error(e.message) });
  const resign = trpc.waivers.docusign.requireResign.useMutation({ onSettled: invalidate, onError: (e) => toast.error(e.message) });
  const download = trpc.waivers.docusign.downloadUrl.useMutation({ onSuccess: (d) => window.open(d.url, "_blank", "noopener"), onError: (e) => toast.error(e.message) });

  const doSend = (emailOnly = false) => send.mutate({ memberId, emailOnly }, { onSuccess: (r) => handle(r, () => doSend(true)) });

  if (q.isLoading) return <Skeleton className="h-24 bg-[#363330]" />;
  const s = q.data;
  if (!s) return null;
  const state = s.valid ? "valid" : s.state;
  return (
    <div className={`${ops.card} p-5 space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <p className={ops.label}>Master waiver (DocuSign)</p>
        {!s.enabled && <span className="text-[11px] text-[#BABAAE]">Feature off</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <WaiverStatusBadge status={state} />
        {s.signed?.signedAt && <span className="text-sm text-[#BABAAE]">Signed {fmtDate(s.signed.signedAt)} · v{s.signed.templateVersion}{s.template && s.signed.templateVersion !== s.template.version ? ` (current is v${s.template.version})` : ""}</span>}
        {s.signed?.invalidatedAt && <span className="text-xs text-[#d9a38a]">Re-sign required since {fmtDate(s.signed.invalidatedAt)}</span>}
      </div>
      {s.current && !s.valid && s.current.status !== "signed" && (
        <p className="text-xs text-[#BABAAE]">
          Latest request: {s.current.status}{s.current.sentAt ? ` · sent ${fmtDateTime(s.current.sentAt)}` : ""}{s.current.deliveryMethod === "email" ? " · email only" : " · email + SMS"}
          {s.current.lastError && <span className="block text-[#d9a38a] mt-1">{s.current.lastError}</span>}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {s.signed?.hasPdf && <Button variant="outline" className={ops.outlineBtn} onClick={() => download.mutate({ kind: "master", id: s.signed!.id, doc: "signed" })}><Download className="w-3.5 h-3.5 mr-1.5" />Signed PDF</Button>}
        {s.signed?.hasCertificate && <Button variant="outline" className={ops.outlineBtn} onClick={() => download.mutate({ kind: "master", id: s.signed!.id, doc: "certificate" })}><Download className="w-3.5 h-3.5 mr-1.5" />Certificate</Button>}
        {s.enabled && !s.valid && (
          <Button className={`${ops.primaryBtn} h-8`} disabled={send.isPending} onClick={() => doSend()}>
            <Send className="w-3.5 h-3.5 mr-1.5" />{s.current && ["sent", "viewed", "queued", "failed", "declined"].includes(s.current.status) ? "Resend" : "Send Master waiver"}
          </Button>
        )}
        {s.valid && (
          <Button variant="outline" className={ops.outlineBtn} disabled={resign.isPending}
            onClick={() => { if (confirm("Require this member to sign the Master waiver again? They won't be able to book until they do.")) resign.mutate({ memberId }, { onSuccess: (r) => (r.ok ? toast.success("Re-sign required — new Master waiver sent") : handle(r)) }); }}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Require re-sign
          </Button>
        )}
      </div>
    </div>
  );
}
