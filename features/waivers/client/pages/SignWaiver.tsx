import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from '@shared/lib/trpc';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

function fmt(d: string | Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
}

export default function SignWaiver() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [signatoryName, setSignatoryName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);

  const waiverQuery = trpc.portal.waivers.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const signMutation = trpc.portal.waivers.sign.useMutation({
    onSuccess: () => { setSigned(true); toast.success("Waiver signed successfully"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSign = () => {
    if (!signatoryName.trim()) { toast.error("Please enter your full legal name"); return; }
    if (!agreed) { toast.error("Please confirm your consent to sign"); return; }
    signMutation.mutate({
      token,
      signatoryName: signatoryName.trim(),
      signatureData: signatoryName.trim(),
      consentAccepted: true,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined,
    });
  };

  // ── Loading ──
  if (waiverQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#2B2823] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#BABAAE]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="font-sans text-sm tracking-[0.06em]">Loading waiver…</p>
        </div>
      </div>
    );
  }

  // ── Error / Not found / already-signed / expired / revoked ──
  if (waiverQuery.error) {
    const msg = waiverQuery.error.message.toLowerCase();
    const isSigned = msg.includes("already signed");
    return (
      <div className="min-h-screen bg-[#2B2823] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#363330] border border-[#57544E] p-8 text-center space-y-4">
          {isSigned ? (
            <>
              <CheckCircle className="w-12 h-12 text-[#6B7250] mx-auto" />
              <h2 className="font-sans text-xl font-medium text-[#E0D3BD]">Already Signed</h2>
              <p className="text-sm text-[#BABAAE]">This waiver has already been signed. No further action is needed.</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-[#9B4D19] mx-auto" />
              <h2 className="font-sans text-xl font-medium text-[#E0D3BD]">Unable to Open Waiver</h2>
              <p className="text-sm text-[#BABAAE]">{waiverQuery.error.message}</p>
              <p className="text-xs text-[#BABAAE]/70">
                <a href="mailto:info@theriverslodge.com" className="underline underline-offset-4 hover:text-[#E0D3BD]">info@theriverslodge.com</a>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Success ──
  if (signed) {
    return (
      <div className="min-h-screen bg-[#2B2823] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#363330] border border-[#57544E] p-8 text-center space-y-4">
          <CheckCircle className="w-14 h-14 text-[#6B7250] mx-auto" />
          <h2 className="font-sans text-2xl font-medium text-[#E0D3BD]">Waiver Signed</h2>
          <p className="text-sm text-[#BABAAE]">
            Thank you, <strong className="text-[#E0D3BD]">{signatoryName}</strong>. Your waiver has been recorded and is now a permanent, read-only record. A confirmation is on file with the Rivers Lodge team.
          </p>
          <a href="/" className="inline-block font-sans text-xs tracking-[0.08em] uppercase text-[#BABAAE] underline underline-offset-4 hover:text-[#E0D3BD]">
            Return to Rivers Lodge &amp; Hunt Club
          </a>
        </div>
      </div>
    );
  }

  const data = waiverQuery.data!;
  const { waiver, title, body, consentText } = data;

  return (
    <div className="min-h-screen bg-[#2B2823] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-5 h-5 text-[#9B4D19]" />
            <span className="font-sans text-xs font-semibold tracking-[0.16em] uppercase text-[#9B4D19]">
              Rivers Lodge &amp; Hunt Club
            </span>
          </div>
          <h1 className="font-sans text-2xl font-medium tracking-tight text-[#E0D3BD]">{title}</h1>
          {waiver.signatoryName && (
            <p className="text-sm text-[#BABAAE]">Prepared for <strong className="text-[#E0D3BD]">{waiver.signatoryName}</strong></p>
          )}
          {waiver.expiresAt && (
            <p className="font-sans text-xs tracking-[0.06em] text-[#BABAAE]/70">Please complete by {fmt(waiver.expiresAt)}</p>
          )}
        </div>

        {waiver.customMessage && (
          <div className="bg-[#363330] border border-[#57544E] border-l-2 border-l-[#9B4D19] p-4">
            <p className="text-sm text-[#BABAAE] italic">{waiver.customMessage}</p>
          </div>
        )}

        {/* Waiver body */}
        <div className="bg-[#363330] border border-[#57544E]">
          <div className="px-5 py-3 border-b border-[#57544E]">
            <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">Waiver Terms</p>
          </div>
          <div className="px-5 py-5 max-h-[45vh] overflow-y-auto">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#E0D3BD]/90">{body}</div>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-[#363330] border border-[#57544E]">
          <div className="px-5 py-3 border-b border-[#57544E]">
            <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">Electronic Signature</p>
          </div>
          <div className="px-5 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="sig-name" className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">
                Full Legal Name <span className="text-[#9B4D19]">*</span>
              </Label>
              <Input
                id="sig-name"
                placeholder="Type your full legal name"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] placeholder:text-[#57544E] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]"
              />
              {signatoryName.trim() && (
                <p className="pt-1 text-2xl text-[#E0D3BD]" style={{ fontFamily: "'Crimson Text', Georgia, serif", fontStyle: "italic" }}>
                  {signatoryName}
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#9B4D19]"
              />
              <span className="text-sm text-[#BABAAE] group-hover:text-[#E0D3BD] transition-colors">{consentText}</span>
            </label>

            <Button
              onClick={handleSign}
              disabled={signMutation.isPending || !signatoryName.trim() || !agreed}
              className="w-full bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.12em] uppercase rounded-none h-11"
            >
              {signMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing…</>) : "Sign Waiver"}
            </Button>

            <p className="text-xs text-[#BABAAE]/70 text-center">
              Your signature is recorded with a secure timestamp and audit metadata. Questions?{" "}
              <a href="mailto:info@theriverslodge.com" className="underline underline-offset-4 hover:text-[#E0D3BD]">info@theriverslodge.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
