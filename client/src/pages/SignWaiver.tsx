import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    onSuccess: () => {
      setSigned(true);
      toast.success("Waiver signed successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSign = () => {
    if (!signatoryName.trim()) {
      toast.error("Please enter your full legal name");
      return;
    }
    if (!agreed) {
      toast.error("Please confirm you have read and agree to the waiver");
      return;
    }
    signMutation.mutate({ token, signatoryName: signatoryName.trim() });
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (waiverQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0.008_80)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading waiver…</p>
        </div>
      </div>
    );
  }

  // ── Error / Not found ────────────────────────────────────────────────────────
  if (waiverQuery.error) {
    const isAlreadySigned = waiverQuery.error.message.toLowerCase().includes("already signed");
    return (
      <div className="min-h-screen bg-[oklch(0.97_0.008_80)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {isAlreadySigned ? (
              <>
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <h2 className="text-xl font-semibold">Already Signed</h2>
                <p className="text-muted-foreground text-sm">
                  This waiver has already been signed. No further action is needed.
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h2 className="text-xl font-semibold">Waiver Not Found</h2>
                <p className="text-muted-foreground text-sm">
                  This waiver link is invalid or has expired. Please contact Rivers Lodge &amp; Hunt Club for assistance.
                </p>
                <p className="text-xs text-muted-foreground">
                  <a href="mailto:info@theriverslodge.com" className="underline underline-offset-4">
                    info@theriverslodge.com
                  </a>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (signed) {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0.008_80)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <h2 className="text-2xl font-semibold">Waiver Signed</h2>
            <p className="text-muted-foreground text-sm">
              Thank you, <strong>{signatoryName}</strong>. Your waiver has been recorded successfully. You will receive a confirmation from the Rivers Lodge team.
            </p>
            <div className="pt-2">
              <a
                href="/"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
              >
                Return to Rivers Lodge &amp; Hunt Club
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { waiver, template } = waiverQuery.data!;
  const waiverTitle = template?.templateName ?? "Liability Waiver & Release";
  const waiverContent = template?.bodyText ?? `By signing this document, you acknowledge and agree to the terms and conditions set forth by Rivers Lodge & Hunt Club. You understand and accept all risks associated with the activities at the property, including but not limited to hunting, fishing, equestrian activities, and use of all facilities. You release Rivers Lodge & Hunt Club, its owners, employees, and agents from any liability for injury, loss, or damage arising from your participation in any activities on the property.`;

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.008_80)] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="w-6 h-6 text-[oklch(0.55_0.080_78)]" />
            <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground">
              Rivers Lodge &amp; Hunt Club
            </span>
          </div>
          <h1 className="text-3xl font-serif font-semibold text-foreground">{waiverTitle}</h1>
          {waiver.signatoryName && (
            <p className="text-muted-foreground text-sm">
              Prepared for: <strong>{waiver.signatoryName}</strong>
            </p>
          )}
        </div>

        {/* Waiver Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Waiver Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-foreground/80 leading-relaxed whitespace-pre-wrap text-sm">
              {waiverContent}
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Electronic Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              By entering your full legal name below and clicking "Sign Waiver," you are providing your electronic signature and agree that it is legally equivalent to a handwritten signature.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="sig-name">Full Legal Name <span className="text-destructive">*</span></Label>
              <Input
                id="sig-name"
                placeholder="Enter your full legal name"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="text-base"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border accent-[oklch(0.55_0.080_78)]"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                I have read and understand the waiver above, and I agree to its terms and conditions. I confirm that I am 18 years of age or older, or am the legal guardian of the minor named in this waiver.
              </span>
            </label>

            <Button
              onClick={handleSign}
              disabled={signMutation.isPending || !signatoryName.trim() || !agreed}
              className="w-full bg-[oklch(0.35_0.060_78)] hover:bg-[oklch(0.30_0.060_78)] text-white"
              size="lg"
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing…
                </>
              ) : (
                "Sign Waiver"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your signature will be recorded with a timestamp. For questions, contact{" "}
              <a href="mailto:info@theriverslodge.com" className="underline underline-offset-4">
                info@theriverslodge.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
