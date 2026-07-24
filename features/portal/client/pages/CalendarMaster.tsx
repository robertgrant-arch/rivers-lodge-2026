import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@features/auth/public";
import { trpc } from "@shared/lib/trpc";
import PublicLayout from "@/components/PublicLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import { Button } from "@shared/ui/button";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

interface DayEntry {
  events: CalendarEvent[];
}

// Event type config with colors
const EVENT_CONFIG: Record<'member_event' | 'blocked', { label: string; dot: string; text: string }> = {
  member_event: { label: 'Member Event', dot: '#BABAAE', text: 'text-[#BABAAE]' },
  blocked:      { label: 'Blocked', dot: '#57544E', text: 'text-[#BABAAE]' },
};

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

// Helper: format time for display
const formatTime = (startTime?: string, endTime?: string): string => {
  if (!startTime && !endTime) return '';
  if (startTime && endTime) return `${startTime}–${endTime}`;
  if (startTime) return `from ${startTime}`;
  return `until ${endTime}`;
};

// Helper: get month days for calendar grid
const getMonthDays = (year: number, month: number): (Date | null)[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
};

function EventDetailModal({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  if (!event) return null;

  const cfg = EVENT_CONFIG[event.kind];
  const timeStr = !event.allDay ? formatTime(event.startTime, event.endTime) : '';

  return (
    <Dialog open={!!event} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: cfg.dot }}
            />
            <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-[#BABAAE]">
              {cfg.label}
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
          {timeStr && (
            <div>
              <span className="font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE] block mb-0.5">Time</span>
              <span>{timeStr}</span>
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
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

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

  // Build map of dates to events and blocks
  const eventsByDate: Map<string, CalendarEvent[]> = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const data = calendarEvents.data;
    if (!data) return map;

    // Add regular events (visible only)
    data.events?.forEach((e: any) => {
      if (e.hiddenFromMembers) return; // Skip hidden events
      const datesInRange = dateRange(e.startDate, e.endDate);
      datesInRange.forEach((dateStr) => {
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push({
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
      // Only show blocks that are not hidden
      if (b.hiddenFromMembers && b.title) return;

      const datesInRange = dateRange(b.startDate, b.endDate);
      datesInRange.forEach((dateStr) => {
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push({
          id: b.id,
          title: 'Blocked',
          type: '',
          startDate: b.startDate,
          endDate: b.endDate,
          startTime: b.startTime,
          endTime: b.endTime,
          allDay: b.allDay ?? true,
          notes: b.reasonNotes,
          hiddenFromMembers: b.hiddenFromMembers,
          kind: 'blocked',
        });
      });
    });

    return map;
  }, [calendarEvents.data]);

  const days = getMonthDays(year, month);
  const todayStr = formatYYYYMMDD(today);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

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

  if (previewSkillGroup && !canViewMasterCalendar) {
    return (
      <PublicLayout>
        <section className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <div className="w-16 h-px bg-white/20 mx-auto mb-8" />
            <p className="eyebrow text-white/40 mb-4">Access Denied</p>
            <h1 className="font-serif text-4xl text-white mb-5">403 — Forbidden</h1>
            <p className="text-base font-sans text-white/50 leading-relaxed mb-8">
              The skill group "{previewSkillGroup.name}" does not have permission to view the Master Calendar.
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
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

          {/* Calendar Container */}
          <div className="bg-[#363330] border border-[#57544E]">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#57544E]">
              <button
                onClick={prevMonth}
                className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD] transition-colors px-2 py-1"
              >
                ← Prev
              </button>
              <span className="font-sans text-sm font-medium tracking-[0.1em] uppercase text-[#E0D3BD]">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                onClick={nextMonth}
                className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD] transition-colors px-2 py-1"
              >
                Next →
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-[#57544E]">
              {DAY_NAMES.map((d) => (
                <div key={d} className="py-2 text-center font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE]">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid cells */}
            {calendarEvents.isLoading ? (
              <div className="flex items-center justify-center h-64 text-[#BABAAE] font-sans text-xs tracking-[0.1em] uppercase">
                Loading...
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="min-h-[100px] border-b border-r border-[#57544E] bg-[#2B2823]/40"
                      />
                    );
                  }

                  const dateStr = formatYYYYMMDD(day);
                  const isToday = dateStr === todayStr;
                  const dayEventsList = eventsByDate.get(dateStr) ?? [];
                  const shown = dayEventsList.slice(0, 2);
                  const overflow = dayEventsList.length - shown.length;

                  return (
                    <div
                      key={dateStr}
                      className="min-h-[100px] border-b border-r border-[#57544E] p-2 hover:bg-[#423F3B]/50 transition-colors"
                    >
                      {/* Date number */}
                      <div className="mb-1.5">
                        <span
                          className={[
                            'font-sans text-xs font-medium w-6 h-6 flex items-center justify-center',
                            isToday
                              ? 'rounded-full bg-[#9B4D19] text-[#E0D3BD]'
                              : 'text-[#BABAAE]',
                          ].join(' ')}
                        >
                          {day.getDate()}
                        </span>
                      </div>

                      {/* Event/Block chips */}
                      <div className="space-y-0.5">
                        {shown.map((ev, i) => {
                          const cfg = EVENT_CONFIG[ev.kind];
                          return (
                            <button
                              key={`${ev.id}-${i}`}
                              onClick={() => setSelectedEvent(ev)}
                              className="flex items-center gap-1 w-full text-left hover:opacity-80 transition-opacity"
                            >
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cfg.dot }}
                              />
                              <span className="font-sans text-[10px] text-[#BABAAE] truncate leading-tight">
                                {ev.title}
                                {ev.kind === 'member_event' && !ev.allDay && ev.startTime && ev.endTime && (
                                  <span className="text-[#57544E]"> {ev.startTime}–{ev.endTime}</span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                        {overflow > 0 && (
                          <span className="font-sans text-[10px] text-[#57544E] pl-2.5">
                            +{overflow} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-5 mt-8">
            {(Object.entries(EVENT_CONFIG) as Array<[keyof typeof EVENT_CONFIG, typeof EVENT_CONFIG[keyof typeof EVENT_CONFIG]]>).map(([kind, cfg]) => (
              <div key={kind} className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
                <span className="font-sans text-[10px] tracking-[0.1em] uppercase text-[#BABAAE]">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Event Detail Modal */}
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </PublicLayout>
  );
}
