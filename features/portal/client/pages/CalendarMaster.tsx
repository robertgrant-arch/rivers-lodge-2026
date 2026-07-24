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

  // CRITICAL FIX: Move useMemo BEFORE early returns to avoid React hooks violation (#310)
  // This ensures the number of hooks is stable across all render paths
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

  return (
    <PublicLayout>
      <section className="bg-background py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="eyebrow text-white/40 mb-2">Portal</p>
              <h1 className="font-serif text-4xl text-white">Master Calendar</h1>
            </div>
            {previewSkillGroup && (
              <div className="text-right">
                <p className="text-xs font-sans text-white/40 tracking-[0.12em] uppercase mb-1">Previewing</p>
                <p className="text-lg font-serif text-white">{previewSkillGroup.name}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <MiniCalendar
                dateMap={dateMap}
                onEventClick={(event) => setSelectedEvent(event)}
              />
            </div>

            <div className="lg:col-span-3 space-y-4">
              {dateMap.size === 0 ? (
                <div className="text-white/40 text-center py-12 font-sans">
                  <p>No events or blocks scheduled</p>
                </div>
              ) : (
                Array.from(dateMap.entries())
                  .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                  .map(([date, entry]) => (
                    <div key={date} className="bg-surface border border-white/10 p-4 rounded-sm">
                      <p className="font-sans text-xs tracking-[0.12em] uppercase text-white/40 mb-2">{date}</p>
                      {entry.isBlocked && (
                        <p className="font-serif text-base text-red-300 mb-2">
                          {entry.blockLabel || 'Unavailable'}
                        </p>
                      )}
                      {entry.events.map((evt) => (
                        <div
                          key={`${evt.id}-${evt.startDate}`}
                          className="cursor-pointer hover:opacity-75 transition-opacity mb-3 last:mb-0"
                          onClick={() => setSelectedEvent(evt)}
                        >
                          <p className="font-serif text-base text-white hover:underline">{evt.title}</p>
                          {evt.type && <p className="text-xs font-sans text-white/50 capitalize">{evt.type.replace('_', ' ')}</p>}
                          {!evt.allDay && (evt.startTime || evt.endTime) && (
                            <p className="text-xs font-sans text-white/40 mt-1">
                              {evt.startTime && evt.endTime
                                ? `${evt.startTime} — ${evt.endTime}`
                                : evt.startTime
                                ? `From ${evt.startTime}`
                                : `Until ${evt.endTime}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </section>

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </PublicLayout>
  );
}
