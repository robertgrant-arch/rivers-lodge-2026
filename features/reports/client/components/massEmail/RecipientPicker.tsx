/**
 * Choose who receives a mass email, with a live recipient count (people who
 * unsubscribed are excluded and counted separately).
 */
import { useEffect, useMemo, useState } from "react";
import { Search, X, Users, Loader2, UserX } from "lucide-react";
import { trpc } from "@shared/lib/trpc";
import { Input } from "@shared/ui/input";
import { SKILL_GROUPS, type EmailAudience, type SkillGroupSlug } from "./types";

type Kind = EmailAudience["type"];

const OPTIONS: Array<{ type: Kind; label: string; hint: string }> = [
  { type: "all_members", label: "All active members", hint: "Every active member with a login." },
  { type: "skill_groups", label: "Members by skill group", hint: "Active members in any of the groups you tick." },
  { type: "customers", label: "Customers / wedding, corporate & hunting-group leads", hint: "Wedding, corporate and hunting-group bookings, sales leads and website inquiries." },
  { type: "individuals", label: "Hand-picked individuals", hint: "Search active members and customers by name or email." },
];

export function useAudienceCount(audience: EmailAudience | null) {
  const count = trpc.reports.newsletters.audienceCount.useMutation();
  const key = audience ? JSON.stringify(audience) : "";
  useEffect(() => {
    if (!audience) { count.reset(); return; }
    const t = setTimeout(() => count.mutate({ audience }), 250);
    return () => clearTimeout(t);
  }, [key]);
  return count;
}

/** null when the selection is incomplete (no group ticked / nobody picked). */
export function completeAudience(a: EmailAudience | null): EmailAudience | null {
  if (!a) return null;
  if (a.type === "skill_groups" && a.slugs.length === 0) return null;
  if (a.type === "individuals" && a.emails.length === 0) return null;
  return a;
}

export default function RecipientPicker({ value, onChange, disabled }: { value: EmailAudience | null; onChange: (a: EmailAudience) => void; disabled?: boolean }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const search = trpc.reports.newsletters.searchPeople.useQuery({ q: debounced }, { enabled: value?.type === "individuals" && debounced.length >= 2 });
  const full = completeAudience(value);
  const count = useAudienceCount(full);

  const slugs = value?.type === "skill_groups" ? value.slugs : [];
  const emails = value?.type === "individuals" ? value.emails : [];
  const picked = useMemo(() => new Set(emails.map((e) => e.toLowerCase())), [emails]);

  const choose = (type: Kind) => {
    if (type === value?.type) return;
    if (type === "skill_groups") onChange({ type, slugs: [] });
    else if (type === "individuals") onChange({ type, emails: [] });
    else onChange({ type } as EmailAudience);
  };
  const toggleSlug = (s: SkillGroupSlug) =>
    onChange({ type: "skill_groups", slugs: slugs.includes(s) ? slugs.filter((x) => x !== s) : [...slugs, s] });
  const addEmail = (e: string) => { if (!picked.has(e.toLowerCase())) onChange({ type: "individuals", emails: [...emails, e] }); setQ(""); };
  const removeEmail = (e: string) => onChange({ type: "individuals", emails: emails.filter((x) => x !== e) });

  return (
    <fieldset disabled={disabled} className="space-y-3" data-testid="recipient-picker">
      <legend className="sr-only">Recipients</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <label
            key={o.type}
            className={`flex gap-3 p-3 border cursor-pointer transition-colors ${
              value?.type === o.type ? "border-[#9B4D19] bg-[#9B4D19]/10" : "border-[#57544E] hover:border-[#8a857b]"
            }`}
          >
            <input type="radio" name="audience" className="mt-1 accent-[#9B4D19]" checked={value?.type === o.type} onChange={() => choose(o.type)} />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[#E0D3BD]">{o.label}</span>
              <span className="block text-xs text-[#BABAAE] mt-0.5">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {value?.type === "skill_groups" && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Skill groups">
          {SKILL_GROUPS.map((g) => (
            <label key={g.slug} className={`inline-flex items-center gap-2 px-3 py-1.5 border text-sm cursor-pointer ${slugs.includes(g.slug) ? "border-[#9B4D19] bg-[#9B4D19]/15 text-[#E0D3BD]" : "border-[#57544E] text-[#BABAAE]"}`}>
              <input type="checkbox" className="accent-[#9B4D19]" checked={slugs.includes(g.slug)} onChange={() => toggleSlug(g.slug)} />
              {g.label}
            </label>
          ))}
        </div>
      )}

      {value?.type === "individuals" && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a857b]" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" aria-label="Search people" />
          </div>
          {debounced.length >= 2 && (
            <div className="border border-[#57544E] max-h-56 overflow-y-auto divide-y divide-[#57544E]/60" role="listbox" aria-label="Search results">
              {search.isLoading ? (
                <p className="p-3 text-sm text-[#BABAAE] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Searching…</p>
              ) : (search.data ?? []).length === 0 ? (
                <p className="p-3 text-sm text-[#BABAAE]">No one found.</p>
              ) : (
                (search.data ?? []).map((p) => {
                  const already = picked.has(p.email.toLowerCase());
                  return (
                    <button
                      type="button"
                      key={p.email}
                      role="option"
                      aria-selected={already}
                      disabled={p.unsubscribed || already}
                      onClick={() => addEmail(p.email)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="min-w-0">
                        <span className="block text-[#E0D3BD] truncate">{p.name || p.email}</span>
                        {p.name && <span className="block text-xs text-[#BABAAE] truncate">{p.email}</span>}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.1em] text-[#8a857b] flex-shrink-0">
                        {p.unsubscribed ? "Unsubscribed" : already ? "Added" : p.kind}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
          {emails.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Selected people">
              {emails.map((e) => (
                <li key={e} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 text-xs border border-[#57544E] bg-[#363330] text-[#E0D3BD]">
                  {e}
                  <button type="button" aria-label={`Remove ${e}`} onClick={() => removeEmail(e)} className="p-0.5 hover:text-white"><X className="w-3 h-3" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" aria-live="polite" data-testid="recipient-count">
        {!full ? (
          <span className="text-[#BABAAE]">{value ? "Finish choosing recipients to see the count." : "Choose who should receive this email."}</span>
        ) : count.isPending || count.isIdle ? (
          <span className="text-[#BABAAE] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Counting recipients…</span>
        ) : count.isError ? (
          <span className="text-red-300">Couldn't count recipients: {count.error.message}</span>
        ) : (
          <>
            <span className="text-[#E0D3BD] flex items-center gap-2"><Users className="w-4 h-4 text-[#C2662A]" /><strong>{count.data?.count ?? 0}</strong> {count.data?.count === 1 ? "recipient" : "recipients"}</span>
            {(count.data?.excludedUnsubscribed ?? 0) > 0 && (
              <span className="text-[#BABAAE] flex items-center gap-1.5"><UserX className="w-4 h-4" />{count.data?.excludedUnsubscribed} unsubscribed — excluded</span>
            )}
          </>
        )}
      </div>
    </fieldset>
  );
}
