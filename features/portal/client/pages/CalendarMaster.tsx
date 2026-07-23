import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@features/auth/public";
import { trpc } from "@shared/lib/trpc";
import PublicLayout from "@/components/PublicLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import { Button } from "@shared/ui/button";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface CalendarEvent {
  id: number;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  notes?: string;
  hiddenFromMembers?: boolean;
  kind: 'member_event' | 'blocked';
}

interface DateEntry {
  events: CalendarEvent[];
  blockLabel?: string;
  isBlocked: boolean;
}

function MiniCalendar({
  dateMap,
  onEventClick
}: {
  dateMap: Map<string, DateEntry>;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const getDateEntry = (day: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateMap.get(ds);
  };

  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="bg-[#2B2823] border border-white/8 p-6">
      <div className="flex items-center justify-between mb-5">
        <button onClick={prev} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors">‹</button>
        <span className="font-serif text-lg text-white">{MONTH_NAMES[month]} {year}</span>
        <button onClick={next} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="text-center text-[9px] tracking-[0.12em] uppercase font-sans text-white/30 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const entry = getDateEntry(day);
          const hasEvents = entry?.events && entry.events.length > 0;
          const isBlocked = entry?.isBlocked;
          const blockLabel = entry?.blockLabel;
          const today_flag = isToday(day);

          return (
            <div
              key={day}
              className={`aspect-square flex flex-col items-center justify-center text-xs font-sans rounded-sm transition-colors p-1 ${
                isBlocked
                  ? "bg-red-900/40 text-red-400"
                  : today_flag
                  ? "bg-white text-black font-semibold"
                  : hasEvents
                  ? "bg-white/10"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              <span className="font-medium text-[10px]">{day}</span>
              {blockLabel && (
                <span className="text-[7px] text-red-300 text-center leading-tight mt-0.5 line-clamp-2">
                  {blockLabel}
                </span>
              )}
              {hasEvents && (
                <div className="text-[7px] text-white/60 text-center leading-tight mt-0.5 line-clamp-1">
                  {entry.events[0].title}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-[10px] font-sans text-white/40">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-900/40 border border-red-800" />Unavailable</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white/20" />Events</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white" />Today</div>
      </div>
    </div>
  );
}

function EventDetailModal({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  if (!event) return null;

  return (
    <Dialog open={!!event} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-[#BABAAE]">
              {event.kind === 'member_event' ? 'Event' : 'Unavailable'}
            </span>
          </div>
          <DialogTitle className="font-sans text-base font-medium text-[#E0D3BD]">
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1 text-sm text-[#BABAAE]">
          <div>
            <span className="font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE] block mb-0.5">Dates</span>
            <span>
              {event.startDate === event.endDate
                ? event.startDate
                : `${event.startDate} — ${event.endDate}`}
            </span>
          </div>
          {!event.allDay && (event.startTime || event.endTime) && (
            <div>
              <span className="font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE] block mb-0.5">Time</span>
              <span>
                {event.startTime && event.endTime
                  ? `${event.startTime} — ${event.endTime}`
                  : event.startTime
                  ? `From ${event.startTime}`
                  : `Until ${event.endTime}`}
              </span>
            </div>
          )}
          {event.type && event.kind === 'member_event' && (
            <div>
              <span className="font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE] block mb-0.5">Type</span>
              <span className="capitalize">{event.type.replace('_', ' ')}</span>
            </div>
          )}
          {event.notes && (
            <div>
              <span className="font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE] block mb-0.5">Notes</span>
              <span>{event.notes}</span>
            </div>
          )}
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#57544E] text-[#E0D3BD] hover:border-[#9B4D19] hover:text-[#9B4D19] rounded-none bg-transparent font-sans text-xs tracking-[0.1em] uppercase"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarMaster() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { user, isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: true,
  });

  // Read preview skill group from URL param (client-side only, hydration-safe)
  const [urlParams, setUrlParams] = useState({ previewSkillGroupId: undefined as number | undefined });
  useEffect(() => {
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const id = searchParams.get('skillGroupId');
    if (id) {
      setUrlParams({ previewSkillGroupId: parseInt(id) });
    }
  }, []);

  const previewSkillGroupId = urlParams.previewSkillGroupId;

  const memberStatus = trpc.membership.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const skillGroupsQuery = trpc.membership.listSkillGroupsForPreview.useQuery();

  const today = new Date();
  const year = today.getFullYear();
  const calendarEvents = trpc.portal.calendar.events.useQuery({
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  });

  // Get preview skill group details for display
  const previewSkillGroup = previewSkillGroupId && skillGroupsQuery.data
    ? skillGroupsQuery.data.find((sg) => sg.id === previewSkillGroupId)
    : null;

  // Check if preview skill group can view master calendar
  const canViewMasterCalendarQuery = trpc.memberPortal.canViewMasterCalendar.useQuery(
    previewSkillGroupId ? { previewSkillGroupId } : undefined,
    { enabled: !previewSkillGroupId || !!previewSkillGroup }
  );

  const canViewMasterCalendar = !previewSkillGroup || canViewMasterCalendarQuery.data;

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/40 font-sans text-xs tracking-[0.14em] uppercase">Loading</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!isAuthenticated) return null;

  const member = memberStatus.data;
  const STAFF_ROLES = ["admin", "owner", "venue_sales", "events_manager", "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance"];
  const isStaff = !!user?.role && STAFF_ROLES.includes(user.role as string);
  const isMember = isStaff || (!!member && member.active);

  if (!isMember && !memberStatus.isLoading) {
    return (
      <PublicLayout>
        <section className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <div className="w-16 h-px bg-white/20 mx-auto mb-8" />
            <p className="eyebrow text-white/40 mb-4">Access Denied</p>
            <h1 className="font-serif text-4xl text-white mb-5">403 — Forbidden</h1>
            <p className="text-base font-sans text-white/50 leading-relaxed mb-8">
              You don't have permission to view the Master Calendar.
            </p>
            <a href="/portal" className="btn-primary inline-flex items-center justify-center px-8 py-3.5">
              Return to Portal
            </a>
          </div>
        </section>
      </PublicLayout>
    );
  }

  // Helper: safely parse YYYY-MM-DD string without timezone conversion
  const parseYYYYMMDD = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper: format Date as YYYY-MM-DD
  const formatYYYYMMDD = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Helper: iterate from start to end date (inclusive), yielding YYYY-MM-DD strings
  const dateRange = (startStr: string, endStr: string): string[] => {
    const dates: string[] = [];
    const start = parseYYYYMMDD(startStr);
    const end = parseYYYYMMDD(endStr);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(formatYYYYMMDD(d));
    }
    return dates;
  };

  // Build map of dates to calendar entries (events and blocks)
  const dateMap: Map<string, DateEntry> = useMemo(() => {
    const map = new Map<string, DateEntry>();
    const data = calendarEvents.data;
    if (!data) return map;

    // Add regular events (visible only)
    data.events?.forEach((e: any) => {
      if (e.hiddenFromMembers) return; // Skip hidden events
      const datesInRange = dateRange(e.startDate, e.endDate);
      datesInRange.forEach((dateStr) => {
        if (!map.has(dateStr)) {
          map.set(dateStr, { events: [], isBlocked: false });
        }
        const entry = map.get(dateStr)!;
        entry.events.push({
          id: e.id,
          title: e.title,
          type: e.type,
          startDate: e.startDate,
          endDate: e.endDate,
          startTime: e.startTime,
          endTime: e.endTime,
          allDay: e.allDay ?? true,
          notes: e.notes,
          hiddenFromMembers: e.hiddenFromMembers,
          kind: 'member_event',
        });
      });
    });

    // Add blocks (pure blocks = no title)
    data.blocked?.forEach((b: any) => {
      // Only show blocks that are not hidden (pure blocks always have no title and are always visible)
      if (b.hiddenFromMembers && b.title) return;

      const datesInRange = dateRange(b.startDate, b.endDate);
      datesInRange.forEach((dateStr, idx) => {
        if (!map.has(dateStr)) {
          map.set(dateStr, { events: [], isBlocked: true });
        }
        const entry = map.get(dateStr)!;
        entry.isBlocked = true;

        // For the first date, generate block label if partial-time
        if (idx === 0 && !b.allDay && (b.startTime || b.endTime)) {
          if (b.startTime && b.endTime) {
            entry.blockLabel = `Unavailable ${b.startTime}–${b.endTime}`;
          } else if (b.startTime) {
            entry.blockLabel = `Unavailable from ${b.startTime}`;
          } else if (b.endTime) {
            entry.blockLabel = `Unavailable until ${b.endTime}`;
          }
        }
      });
    });

    return map;
  }, [calendarEvents.data]);

  // If previewing but skill group cannot view master calendar, show error
  if (previewSkillGroup && !canViewMasterCalendar) {
    return (
      <PublicLayout>
        <section className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <div className="w-16 h-px bg-white/20 mx-auto mb-8" />
            <p className="eyebrow text-white/40 mb-4">Preview Restricted</p>
            <h1 className="font-serif text-4xl text-white mb-5">Access Denied</h1>
            <p className="text-base font-sans text-white/50 leading-relaxed mb-8">
              The <strong>{previewSkillGroup.name}</strong> skill group cannot view the Master Calendar.
            </p>
            <a href="/portal" className="btn-primary inline-flex items-center justify-center px-8 py-3.5">
              Return to Portal
            </a>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        {/* ── Preview Banner ────────────────────────────────────── */}
        {previewSkillGroup && (
          <div className="bg-amber-950/40 border-b-2 border-amber-600 px-6 py-3">
            <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <p className="text-sm font-sans text-amber-100 whitespace-nowrap">
                  🔍 <strong>Preview Mode:</strong>
                </p>
                <select
                  value={previewSkillGroupId || ""}
                  onChange={(e) => {
                    const newId = e.target.value;
                    if (newId) {
                      const params = new URLSearchParams(window.location.search);
                      params.set("skillGroupId", newId);
                      window.location.search = params.toString();
                    }
                  }}
                  className="px-2 py-1 bg-amber-900/30 border border-amber-600 text-amber-100 font-sans text-xs rounded hover:bg-amber-900/50 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {(skillGroupsQuery.data ?? []).map((sg) => (
                    <option key={sg.id} value={String(sg.id)}>
                      {sg.name}
                    </option>
                  ))}
                </select>
              </div>
              <a
                href="/portal"
                className="text-xs font-sans text-amber-300 hover:text-amber-200 underline transition-colors whitespace-nowrap"
              >
                Exit Preview
              </a>
            </div>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="bg-[#2B2823] border-b border-white/8 pt-24 pb-8">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-white/40 mb-2">Member Portal</p>
                <h1 className="font-serif text-3xl md:text-4xl text-white mb-3">Master Calendar</h1>
                <p className="text-sm font-sans text-white/40">Complete view of all estate bookings and events.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────── */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="font-serif text-3xl text-white mb-2">Master Calendar</h2>
              <p className="text-sm font-sans text-white/40 mb-6">View all estate events and availability across all activities.</p>
              <MiniCalendar dateMap={dateMap} onEventClick={setSelectedEvent} />
            </div>
            <div>
              <h3 className="font-serif text-xl text-white mb-5">Activity Status</h3>
              <div className="flex flex-col gap-3">
                {[
                  { season: "Whitetail Deer", open: false },
                  { season: "Waterfowl", open: false },
                  { season: "Turkey", open: true },
                  { season: "Fishing", open: true },
                  { season: "Sporting Clays", open: true },
                ].map((s) => (
                  <div key={s.season} className="flex items-center justify-between bg-[#2B2823] border border-white/8 px-4 py-3">
                    <div className="text-sm font-sans font-medium text-white">{s.season}</div>
                    <span className={`text-[9px] tracking-[0.12em] uppercase font-sans px-2 py-0.5 ${
                      s.open ? "text-green-400 bg-green-400/10" : "text-white/30 bg-white/5"
                    }`}>
                      {s.open ? "Open" : "Closed"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 border border-[var(--gold)]/20 bg-[var(--gold)]/5">
                <p className="text-[10px] tracking-[0.14em] uppercase font-sans text-[var(--gold)] mb-1">Member Portal</p>
                <p className="text-xs font-sans text-white/50 leading-relaxed mb-3">Return to the main portal to manage your bookings.</p>
                <a href="/portal" className="text-[10px] font-sans text-[var(--gold)] hover:underline tracking-[0.1em] uppercase">
                  Back to Portal →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Event Detail Modal ─────────────────────────────────── */}
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      </div>
    </PublicLayout>
  );
}
