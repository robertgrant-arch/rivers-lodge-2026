/**
 * Ops → Waivers → "Master & Booking" (DocuSign).
 * Setup status, ops settings, bookings with "x of y signed", and every
 * Master / Booking waiver with type/status filters.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@shared/lib/trpc";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Switch } from "@shared/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/select";
import { Skeleton } from "@shared/ui/skeleton";
import { AlertTriangle, CheckCircle2, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { WaiverStatusBadge, fmtDate, fmtYmd, ops } from "./waiverUi";

export default function DocuSignWaiversTab() {
  return (
    <div className="space-y-6">
      <SetupCard />
      <SettingsCard />
      <BookingsCard />
      <AllWaiversCard />
    </div>
  );
}

function SetupCard() {
  const q = trpc.waivers.docusign.overview.useQuery();
  const o = q.data;
  if (q.isLoading || !o) return <Skeleton className="h-24 bg-[#363330]" />;
  const problems: string[] = [];
  if (!o.docusignConfigured) problems.push(`DocuSign env vars missing: ${o.missingEnv.join(", ")}`);
  if (!o.masterTemplate) problems.push("No active Master waiver template (Templates tab → Type: Master)");
  if (!o.bookingTemplate) problems.push("No active Booking waiver template (Templates tab → Type: Booking)");
  return (
    <div className={`${ops.card} p-5 space-y-3`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className={ops.label}>DocuSign waivers</p>
          <p className="text-[#E0D3BD] text-sm mt-1">
            {o.enabled ? "ON — bookings require the member's Master waiver and a signed booking waiver." : "OFF — nothing is sent and bookings aren't blocked (WAIVERS_DOCUSIGN_ENABLED)."}
          </p>
        </div>
        <div className="text-xs text-[#BABAAE] text-right space-y-0.5">
          <div>Account: {o.environment ?? "not configured"}</div>
          <div>Status updates: {o.connectConfigured ? "Connect webhook (HMAC)" : "polling every 15 min"}</div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        <div className="text-[#BABAAE]">Master template: <span className="text-[#E0D3BD]">{o.masterTemplate ? `${o.masterTemplate.title} (v${o.masterTemplate.version})` : "—"}</span></div>
        <div className="text-[#BABAAE]">Booking template: <span className="text-[#E0D3BD]">{o.bookingTemplate ? `${o.bookingTemplate.title} (v${o.bookingTemplate.version})` : "—"}</span></div>
      </div>
      {problems.length > 0 ? (
        <ul className="text-xs text-[#d9a38a] space-y-1">
          {problems.map((p) => <li key={p} className="flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />{p}</li>)}
        </ul>
      ) : (
        <p className="text-xs text-[#BABAAE] flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#6B7250]" />Ready.</p>
      )}
    </div>
  );
}

function SettingsCard() {
  const utils = trpc.useUtils();
  const q = trpc.waivers.docusign.overview.useQuery();
  const update = trpc.waivers.docusign.updateSettings.useMutation({
    onSuccess: () => { toast.success("Waiver settings saved"); utils.waivers.docusign.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const s = q.data?.settings;
  const [hours, setHours] = useState<string>("");
  if (!s) return null;
  return (
    <div className={`${ops.card} p-5 space-y-4`}>
      <p className={ops.label}>Settings</p>
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-[#E0D3BD]">Auto-send the Master waiver when a new member account is created</span>
        <Switch checked={s.autoSendMasterOnNewMember} onCheckedChange={(v) => update.mutate({ autoSendMasterOnNewMember: v })} />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-[#E0D3BD]">Master waiver renews every 12 months</span>
        <Switch checked={s.masterRenewsEvery12Months} onCheckedChange={(v) => update.mutate({ masterRenewsEvery12Months: v })} />
      </label>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-[#E0D3BD]">Hours the member has to sign the booking waiver before the hold is released</span>
        <div className="flex items-center gap-2">
          <Input type="number" min={1} max={168} className={`${ops.input} w-20 h-8`} placeholder={String(s.memberSignHoldHours)} value={hours} onChange={(e) => setHours(e.target.value)} />
          <Button size="sm" className={`${ops.primaryBtn} h-8`} disabled={!hours || update.isPending}
            onClick={() => { const n = Number(hours); if (!Number.isInteger(n) || n < 1 || n > 168) { toast.error("Enter 1–168 hours"); return; } update.mutate({ memberSignHoldHours: n }); setHours(""); }}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function BookingsCard() {
  const [includePast, setIncludePast] = useState(false);
  const q = trpc.waivers.docusign.bookingsWithWaivers.useQuery({ includePast });
  const rows = q.data ?? [];
  return (
    <div className={`${ops.card}`}>
      <div className="flex items-center justify-between p-4 border-b border-[#57544E]">
        <p className={ops.label}>Bookings</p>
        <label className="flex items-center gap-2 text-xs text-[#BABAAE]"><Switch checked={includePast} onCheckedChange={setIncludePast} />Include past</label>
      </div>
      {q.isLoading ? <Skeleton className="h-20 m-4 bg-[#2B2823]" /> : rows.length === 0 ? (
        <p className="p-6 text-sm text-[#BABAAE]">No bookings with DocuSign waivers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-[#BABAAE] border-b border-[#57544E]">
              <th className="px-4 py-2 font-normal">Booking</th><th className="px-4 py-2 font-normal">Member</th><th className="px-4 py-2 font-normal">Property</th>
              <th className="px-4 py-2 font-normal">Arrives</th><th className="px-4 py-2 font-normal">Status</th><th className="px-4 py-2 font-normal">Waivers</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#57544E]/50 hover:bg-[#2B2823]/60">
                  <td className="px-4 py-2"><Link href={`/ops/waivers/booking/${r.id}`}><span className="text-[#E0D3BD] underline-offset-2 hover:underline cursor-pointer font-mono">{r.bookingRef}</span></Link></td>
                  <td className="px-4 py-2 text-[#E0D3BD]">{r.memberName}</td>
                  <td className="px-4 py-2 text-[#BABAAE]">{r.propertyName}</td>
                  <td className="px-4 py-2 text-[#BABAAE]">{fmtYmd(r.startDate)}</td>
                  <td className="px-4 py-2 text-[#BABAAE]">{bookingStatusLabel(r.status)}</td>
                  <td className="px-4 py-2"><span className={r.signed === r.total ? "text-[#a7ad8c]" : "text-[#d9a38a]"}>Waivers: {r.signed} of {r.total} signed</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function bookingStatusLabel(s: string): string {
  return ({
    pending_waiver: "Pending waiver", expired_waiver: "Expired – waiver not signed", confirmed: "Confirmed",
    pending_approval: "Pending approval", cancelled: "Cancelled", checked_in: "Checked in", completed: "Completed",
    no_show: "No show", declined: "Declined",
  } as Record<string, string>)[s] ?? s;
}

function AllWaiversCard() {
  const [type, setType] = useState<"all" | "master" | "booking">("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const q = trpc.waivers.docusign.list.useQuery({ type, status, search: search || undefined });
  const download = trpc.waivers.docusign.downloadUrl.useMutation({
    onSuccess: (d) => window.open(d.url, "_blank", "noopener"),
    onError: (e) => toast.error(e.message),
  });
  const rows = q.data ?? [];
  return (
    <div className={ops.card}>
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[#57544E]">
        <p className={`${ops.label} mr-auto`}>All Master &amp; Booking waivers</p>
        <Select value={type} onValueChange={(v) => setType(v as any)}>
          <SelectTrigger className={`${ops.select} w-36 h-8`}><SelectValue /></SelectTrigger>
          <SelectContent className={ops.selectContent}>
            <SelectItem value="all">All types</SelectItem><SelectItem value="master">Master</SelectItem><SelectItem value="booking">Booking</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className={`${ops.select} w-36 h-8`}><SelectValue /></SelectTrigger>
          <SelectContent className={ops.selectContent}>
            {["all", "sent", "viewed", "signed", "declined", "expired", "failed", "queued", "voided"].map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#57544E]" />
          <Input className={`${ops.input} h-8 pl-8 w-56`} placeholder="Name, email or booking #" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      {q.isLoading ? <Skeleton className="h-24 m-4 bg-[#2B2823]" /> : rows.length === 0 ? (
        <p className="p-6 text-sm text-[#BABAAE]">Nothing matches.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-[#BABAAE] border-b border-[#57544E]">
              <th className="px-4 py-2 font-normal">Type</th><th className="px-4 py-2 font-normal">Signer</th><th className="px-4 py-2 font-normal">For</th>
              <th className="px-4 py-2 font-normal">Status</th><th className="px-4 py-2 font-normal">Sent</th><th className="px-4 py-2 font-normal">Signed</th><th className="px-4 py-2 font-normal" />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.type}-${r.id}`} className="border-b border-[#57544E]/50 align-top">
                  <td className="px-4 py-2 text-[#BABAAE]">{r.type === "master" ? `Master v${r.templateVersion ?? "?"}` : `Booking${r.role === "member" ? " · member" : ""}`}</td>
                  <td className="px-4 py-2"><div className="text-[#E0D3BD]">{r.name}</div><div className="text-xs text-[#BABAAE]">{r.email}</div></td>
                  <td className="px-4 py-2">
                    {r.type === "booking" && r.bookingId ? (
                      <Link href={`/ops/waivers/booking/${r.bookingId}`}><span className="text-[#E0D3BD] hover:underline cursor-pointer font-mono">{r.bookingRef}</span></Link>
                    ) : r.memberId ? (
                      <Link href={`/ops/membership/${r.memberId}`}><span className="text-[#E0D3BD] hover:underline cursor-pointer">Member file</span></Link>
                    ) : "—"}
                    {r.startDate && <div className="text-xs text-[#BABAAE]">{fmtYmd(r.startDate)}</div>}
                  </td>
                  <td className="px-4 py-2"><WaiverStatusBadge status={r.status} />{r.lastError && r.status !== "signed" && <div className="text-xs text-[#d9a38a] mt-1 max-w-xs">{r.lastError}</div>}</td>
                  <td className="px-4 py-2 text-[#BABAAE]">{fmtDate(r.sentAt)}</td>
                  <td className="px-4 py-2 text-[#BABAAE]">{fmtDate(r.signedAt)}</td>
                  <td className="px-4 py-2">
                    {r.hasPdf && (
                      <button className={`${ops.ghostBtn} flex items-center gap-1`} onClick={() => download.mutate({ kind: r.type === "master" ? "master" : "signer", id: r.id, doc: "signed" })}>
                        <Download className="w-3 h-3" />PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
