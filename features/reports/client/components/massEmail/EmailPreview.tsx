/** Shows the exact email recipients get (rendered by the server), HTML or plain text. */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@shared/lib/trpc";

export default function EmailPreview({ bodyHtml, mode, height = 560 }: { bodyHtml: string; mode: "html" | "text"; height?: number }) {
  const preview = trpc.reports.newsletters.preview.useMutation();
  const [data, setData] = useState<{ html: string; text: string } | null>(null);
  useEffect(() => {
    let live = true;
    preview.mutateAsync({ bodyHtml }).then((d) => { if (live) setData(d); }).catch(() => {});
    return () => { live = false; };
  }, [bodyHtml]);
  if (preview.isError && !data) return <p className="text-sm text-red-300 p-4">Preview unavailable: {preview.error.message}</p>;
  if (!data) return <div className="flex items-center justify-center text-[#BABAAE] text-sm gap-2" style={{ height }}><Loader2 className="w-4 h-4 animate-spin" />Loading preview…</div>;
  return mode === "html" ? (
    // sandbox without scripts: the email can't run code or navigate the app.
    <iframe title="Email preview" sandbox="allow-popups" srcDoc={data.html} className="w-full bg-[#f4f1ea] border border-[#57544E]" style={{ height }} data-testid="email-preview-frame" />
  ) : (
    <pre className="whitespace-pre-wrap break-words text-sm text-[#E0D3BD] bg-[#2B2823] border border-[#57544E] p-4 overflow-auto font-mono" style={{ maxHeight: height }} data-testid="email-preview-text">{data.text}</pre>
  );
}
