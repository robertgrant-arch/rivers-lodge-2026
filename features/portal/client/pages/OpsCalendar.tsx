/**
 * /portal/ops-calendar — staff-only Ops Calendar (read-only).
 *
 * Shows everything registered in the calendar feed: Ops Calendar entries
 * (staff only), Member Master Calendar events, blocked dates, weddings,
 * corporate retreats, hunting groups and hunt/fish bookings — plus any event
 * type registered later. Unconfirmed bookings are drawn dashed (tentative).
 * Access is enforced by memberPortal.opsCalendar on the server (admins +
 * employees in the Admin/Employee skill group). Entries are added and edited
 * by admins in /ops/calendar; admins can open any booking's record from here.
 */
import { useMemo, useState } from "react";
import { useAuth } from "@features/auth/public";
import { trpc } from "@shared/lib/trpc";
import MemberPortalLayout from "@features/portal/client/components/MemberPortalLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import { formatTimeRange } from "@features/portal/client/utils/timeFormat";
import { parsePortalPreview, usePortalLink } from "@features/portal/client/portalNav";
import { useSearch } from "wouter";
import { itemsByDate, type CalendarItem } from "@shared/calendarFeed";

type Entry = CalendarItem;
type SourceMeta = { kind: string; label: string; color: string };

// Fixed labels/colours for the known kinds; any other registered source uses
// the label and colour it registered with.
const KIND: Record<string, { label: string; color: string }> = {
  ops_event:     { label: "Ops (staff only)", color: "#C2662A" },
  member_event:  { label: "Member event",     color: "#BABAAE" },
  blocked:       { label: "Blocked",          color: "#8A847A" },
  wedding:       { label: "Wedding",          color: "#7D8AA3" },
  corporate:     { label: "Corporate",        color: "#8E9670" },
  hunting_group: { label: "Hunting group",    color: "#6FA3A0" },
  hunt_fish:     { label: "Hunt / Fish",      color: "#D9B98C" },
};
const KNOWN_ORDER = ["ops_event", "member_event", "blocked", "wedding", "corporate", "hunting_group", "hunt_fish"];

function kindInfo(kind: string, sources?: SourceMeta[]) {
  if (KIND[kind]) return KIND[kind];
  const s = sources?.find((x) => x.kind === kind);
  return { label: s?.label ?? kind, color: s?.color ?? "#BABAAE" };
}

function Dot({ color, tentative, size = 8 }: { color: string; tentative?: boolean; size?: number }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      data-tentative={tentative ? "true" : undefined}
      style={tentative
        ? { width: size, height: size, border: `1px dashed ${color}` }
        : { width: size, height: size, backgroundColor: color }}
    />
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function prettyStatus(s: string | null) {
  return s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;
}

function Chip({ e, onClick, compact, sources }: { e: Entry; onClick: () => void; compact?: boolean; sources?: SourceMeta[] }) {
  return (
    <button
      onClick={onClick}
      data-testid={`ops-entry-${e.id}`}
      data-tentative={e.tentative ? "true" : undefined}
      title={e.tentative ? `${e.title} (tentative)` : e.title}
      className={`flex items-center gap-1.5 w-full text-left hover:opacity-80 transition-opacity min-w-0 ${e.tentative ? "opacity-70" : ""}`}
    >
      <Dot color={kindInfo(e.kind, sources).color} tentative={e.tentative} />
      <span className={`font-sans ${compact ? "text-[10px]" : "text-sm"} ${e.tentative ? "text-[#BABAAE] italic" : "text-[#E0D3BD]"} truncate leading-tight`}>
        {e.title}
        {!e.allDay && e.startTime && (
          <span className="text-[#8A847A]"> {formatTimeRange(e.startTime ?? undefined, e.endTime ?? undefined)}</span>
        )}
      </span>
    </button>
  );
}

export default function OpsCalendar() {
  const portalLink = usePortalLink();
  const { user, isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Entry | null>(null);

  const lastDay = new Date(year, month + 1, 0).getDate();
  const range = { startDate: ymd(year, month, 1), endDate: ymd(year, month, lastDay) };
  // Admin preview: see exactly what the previewed skill group would see.
  const preview = parsePortalPreview(useSearch());
  const q = trpc.memberPortal.opsCalendar.useQuery(
    { ...range, ...(preview.isPreviewMode && preview.skillGroupId ? { previewSkillGroupId: preview.skillGroupId } : {}) },
    { enabled: isAuthenticated, retry: false },
  );
  const denied = q.error?.data?.code === "FORBIDDEN";
  const sources: SourceMeta[] = q.data?.sources ?? [];
  const legendKinds = useMemo(() => {
    const extra = sources.map((x) => x.kind).filter((k) => !KNOWN_ORDER.includes(k));
    return [...KNOWN_ORDER, ...extra];
  }, [sources]);
  const canOpenRecords = user?.role === "admin" && !preview.isPreviewMode;

  // Multi-day items land on every day they span (clipped to the month).
  const byDate = useMemo(
    () => itemsByDate((q.data?.items ?? []) as Entry[], range.startDate, range.endDate),
    [q.data, range.startDate, range.endDate],
  );

  const prev = () => (month === 0 ? (setMonth(11), setYear((y) => y - 1)) : setMonth((m) => m - 1));
  const next = () => (month === 11 ? (setMonth(0), setYear((y) => y + 1)) : setMonth((m) => m + 1));
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());
  const firstDow = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: lastDay }, (_, i) => i + 1)];
  const agendaDays = Array.from(byDate.keys()).sort();

  if (loading || !isAuthenticated) {
    return (
      <MemberPortalLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      </MemberPortalLayout>
    );
  }

  if (denied) {
    return (
      <MemberPortalLayout>
        <section className="min-h-[70vh] flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <p className="eyebrow text-white/40 mb-4">Staff Only</p>
            <h1 className="font-serif text-3xl text-white mb-5">Ops Calendar</h1>
            <p className="text-base font-sans text-white/50 leading-relaxed mb-8">This calendar is for Rivers Lodge staff.</p>
            <a href={portalLink("/portal")} className="btn-primary inline-flex items-center justify-center px-8 py-3.5">Return to Portal</a>
          </div>
        </section>
      </MemberPortalLayout>
    );
  }

  return (
    <MemberPortalLayout>
      <section className="bg-background py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="eyebrow text-white/40 mb-2">Staff Only</p>
              <h1 className="font-serif text-3xl md:text-4xl text-white">Ops Calendar</h1>
              <p className="text-sm font-sans text-white/40 mt-2">Everything on the estate calendar, including entries members don't see.</p>
            </div>
            {user?.role === "admin" && !preview.isPreviewMode && (
              <a href="/ops/calendar" className="text-[10px] font-sans text-[var(--gold)] hover:underline tracking-[0.12em] uppercase whitespace-nowrap">
                Add or edit entries →
              </a>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5" data-testid="ops-legend">
            {legendKinds.map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5 font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE]">
                <Dot color={kindInfo(k, sources).color} />
                {kindInfo(k, sources).label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 font-sans text-[10px] tracking-[0.12em] uppercase text-[#8A847A] italic">
              <Dot color="#BABAAE" tentative />
              Tentative (not confirmed)
            </span>
          </div>

          <div className="bg-[#363330] border border-[#57544E]">
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-[#57544E]">
              <button onClick={prev} className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD] px-2 py-1">← Prev</button>
              <span className="font-sans text-sm font-medium tracking-[0.1em] uppercase text-[#E0D3BD]">{MONTHS[month]} {year}</span>
              <button onClick={next} className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD] px-2 py-1">Next →</button>
            </div>

            {q.isLoading ? (
              <div className="flex items-center justify-center h-64 text-[#BABAAE] font-sans text-xs tracking-[0.1em] uppercase">Loading…</div>
            ) : q.error ? (
              <div className="flex items-center justify-center h-64 text-[#BABAAE] font-sans text-sm">The calendar couldn't be loaded. Please try again.</div>
            ) : (
              <>
                {/* Desktop: month grid */}
                <div className="hidden md:block" data-testid="ops-grid">
                  <div className="grid grid-cols-7 border-b border-[#57544E]">
                    {DAYS.map((d) => (
                      <div key={d} className="py-2 text-center font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE]">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {cells.map((day, i) => {
                      if (!day) return <div key={`e${i}`} className="min-h-[110px] border-b border-r border-[#57544E] bg-[#2B2823]/40" />;
                      const ds = ymd(year, month, day);
                      const list = byDate.get(ds) ?? [];
                      const shown = list.slice(0, 3);
                      return (
                        <div key={ds} className="min-h-[110px] border-b border-r border-[#57544E] p-2">
                          <span className={`font-sans text-xs font-medium w-6 h-6 mb-1 flex items-center justify-center ${ds === todayStr ? "rounded-full bg-[#9B4D19] text-[#E0D3BD]" : "text-[#BABAAE]"}`}>{day}</span>
                          <div className="space-y-0.5">
                            {shown.map((e) => <Chip key={e.id} e={e} compact sources={sources} onClick={() => setSelected(e)} />)}
                            {list.length > shown.length && (
                              <span className="font-sans text-[10px] text-[#8A847A] pl-3.5">+{list.length - shown.length} more</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile: day-by-day list */}
                <div className="md:hidden" data-testid="ops-agenda">
                  {agendaDays.length === 0 ? (
                    <p className="px-4 py-10 text-center font-sans text-sm text-[#BABAAE]">Nothing on the calendar this month.</p>
                  ) : (
                    <ul className="divide-y divide-[#57544E]">
                      {agendaDays.map((ds) => {
                        const d = new Date(`${ds}T12:00:00`);
                        return (
                          <li key={ds} className="px-4 py-3">
                            <p className={`font-sans text-[11px] tracking-[0.12em] uppercase mb-2 ${ds === todayStr ? "text-[var(--gold)]" : "text-[#BABAAE]"}`}>
                              {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </p>
                            <div className="space-y-2">
                              {byDate.get(ds)!.map((e) => <Chip key={e.id} e={e} sources={sources} onClick={() => setSelected(e)} />)}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
          {!q.isLoading && !q.error && (byDate.size === 0) && (
            <p className="hidden md:block mt-4 font-sans text-sm text-[#BABAAE]">Nothing on the calendar this month.</p>
          )}
        </div>
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-sm">
          {selected && (
            <>
              <DialogHeader>
                <span className="inline-flex items-center gap-2 font-sans text-[10px] tracking-[0.14em] uppercase text-[#BABAAE] mb-1">
                  <Dot color={kindInfo(selected.kind, sources).color} tentative={selected.tentative} />
                  {kindInfo(selected.kind, sources).label}{selected.tentative ? " · Tentative" : ""}
                </span>
                <DialogTitle className="font-sans text-base font-medium text-[#E0D3BD]">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-1 text-sm text-[#BABAAE]">
                <div>
                  <span className="font-sans text-[10px] tracking-[0.12em] uppercase block mb-0.5">Dates</span>
                  {selected.startDate === selected.endDate ? selected.startDate : `${selected.startDate} — ${selected.endDate}`}
                </div>
                {!selected.allDay && selected.startTime && (
                  <div>
                    <span className="font-sans text-[10px] tracking-[0.12em] uppercase block mb-0.5">Time</span>
                    {formatTimeRange(selected.startTime ?? undefined, selected.endTime ?? undefined)}
                  </div>
                )}
                {selected.status && (
                  <div>
                    <span className="font-sans text-[10px] tracking-[0.12em] uppercase block mb-0.5">Status</span>
                    {prettyStatus(selected.status)}
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <span className="font-sans text-[10px] tracking-[0.12em] uppercase block mb-0.5">Notes</span>
                    {selected.notes}
                  </div>
                )}
                {canOpenRecords && selected.href && (
                  <a
                    href={selected.href}
                    data-testid="ops-open-record"
                    className="inline-block pt-1 font-sans text-[10px] tracking-[0.12em] uppercase text-[var(--gold)] hover:underline"
                  >
                    Open record in Ops →
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MemberPortalLayout>
  );
}
