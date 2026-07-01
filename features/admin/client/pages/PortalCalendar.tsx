import { Button } from '@shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import { trpc } from '@shared/lib/trpc';
import { useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const days: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ---------------------------------------------------------------------------
// Event type config
// ---------------------------------------------------------------------------

type EventKind = 'wedding' | 'corporate' | 'hunt_fish' | 'blocked';

const EVENT_CONFIG: Record<EventKind, { label: string; dot: string; text: string }> = {
  wedding:    { label: 'Wedding',    dot: '#be123c', text: 'text-[#be123c]' },
  corporate:  { label: 'Corporate',  dot: '#0369a1', text: 'text-[#0369a1]' },
  hunt_fish:  { label: 'Hunt/Fish',  dot: '#b45309', text: 'text-[#b45309]' },
  blocked:    { label: 'Hold/Block', dot: '#57544E', text: 'text-[#BABAAE]'  },
};

type FilterKey = EventKind | 'all';

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'wedding',   label: 'Weddings' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'hunt_fish', label: 'Hunt/Fish' },
  { key: 'blocked',   label: 'Blocks/Holds' },
];

// ---------------------------------------------------------------------------
// Types matching tRPC response shape
// ---------------------------------------------------------------------------

interface CalEvent {
  id: string | number;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  kind: EventKind;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Create Event Modal
// ---------------------------------------------------------------------------

interface CreateModalProps {
  open: boolean;
  defaultDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEventModal({ open, defaultDate, onClose, onSuccess }: CreateModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('member_event');
  const [startDate, setStartDate] = useState(defaultDate ?? '');
  const [endDate, setEndDate] = useState(defaultDate ?? '');
  const [notes, setNotes] = useState('');

  const blockMutation = trpc.portal.calendar.blockDates.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
      setTitle('');
      setType('member_event');
      setStartDate('');
      setEndDate('');
      setNotes('');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validReasons = ["maintenance", "private_use", "seasonal_closure", "buffer", "other"] as const;
    const reason = (validReasons as readonly string[]).includes(type) ? type as typeof validReasons[number] : "other";
    blockMutation.mutate({
      startDate,
      endDate,
      reason,
      reasonNotes: notes ? `${title} — ${notes}` : title,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans text-base font-medium tracking-[0.08em] uppercase text-[#E0D3BD]">
            New Event / Block
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Event or hold name"
              className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] placeholder:text-[#57544E] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus:ring-[#9B4D19]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#363330] border-[#57544E] rounded-none text-[#E0D3BD]">
                <SelectItem value="member_event">Member Event</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="private_hold">Private Hold</SelectItem>
                <SelectItem value="other">Other / Block</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19] [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19] [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional details"
              className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] placeholder:text-[#57544E] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19] resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#57544E] text-[#E0D3BD] hover:border-[#9B4D19] hover:text-[#9B4D19] rounded-none bg-transparent font-sans text-xs tracking-[0.1em] uppercase"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={blockMutation.isPending}
              className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] rounded-none font-sans text-xs tracking-[0.1em] uppercase"
            >
              {blockMutation.isPending ? 'Saving...' : 'Save Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Event Detail / Unblock Modal
// ---------------------------------------------------------------------------

interface DetailModalProps {
  event: CalEvent | null;
  onClose: () => void;
  onUnblocked: () => void;
}

function EventDetailModal({ event, onClose, onUnblocked }: DetailModalProps) {
  const [confirming, setConfirming] = useState(false);

  const unblockMutation = trpc.portal.calendar.unblockDates.useMutation({
    onSuccess: () => {
      onUnblocked();
      onClose();
      setConfirming(false);
    },
  });

  if (!event) return null;
  const cfg = EVENT_CONFIG[event.kind];

  return (
    <Dialog open={!!event} onOpenChange={(v) => { if (!v) { onClose(); setConfirming(false); } }}>
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
            <span>{event.startDate === event.endDate ? event.startDate : `${event.startDate} — ${event.endDate}`}</span>
          </div>
          {event.notes && (
            <div>
              <span className="font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE] block mb-0.5">Notes</span>
              <span>{event.notes}</span>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 gap-2">
          {!confirming ? (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-[#57544E] text-[#E0D3BD] hover:border-[#9B4D19] hover:text-[#9B4D19] rounded-none bg-transparent font-sans text-xs tracking-[0.1em] uppercase"
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirming(true)}
                className="border-[#57544E] text-[#BABAAE] hover:border-red-700 hover:text-red-400 rounded-none bg-transparent font-sans text-xs tracking-[0.1em] uppercase"
              >
                Remove / Unblock
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs text-[#BABAAE] mr-auto">Remove this entry?</span>
              <Button
                variant="outline"
                onClick={() => setConfirming(false)}
                className="border-[#57544E] text-[#E0D3BD] rounded-none bg-transparent font-sans text-xs tracking-[0.1em] uppercase"
              >
                Cancel
              </Button>
              <Button
                onClick={() => unblockMutation.mutate({ id: Number(event.id) })}
                disabled={unblockMutation.isPending}
                className="bg-red-900 hover:bg-red-800 text-[#E0D3BD] rounded-none font-sans text-xs tracking-[0.1em] uppercase"
              >
                {unblockMutation.isPending ? 'Removing...' : 'Confirm Remove'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PortalCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [filter, setFilter] = useState<FilterKey>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const startDate = toDateStr(new Date(year, month, 1));
  const endDate = toDateStr(new Date(year, month + 1, 0));

  const { data, refetch, isLoading } = trpc.portal.calendar.events.useQuery(
    { startDate, endDate },
    {},
  );

  // Normalise API data into flat CalEvent[]
  const allEvents: CalEvent[] = useMemo(() => {
    if (!data) return [];
    const result: CalEvent[] = [];

    (data.weddings ?? []).forEach((e: any) =>
      result.push({ id: e.id, title: e.title ?? 'Wedding', startDate: e.startDate, endDate: e.endDate ?? e.startDate, kind: 'wedding', notes: e.notes }),
    );
    (data.corporate ?? []).forEach((e: any) =>
      result.push({ id: e.id, title: e.title ?? 'Corporate', startDate: e.startDate, endDate: e.endDate ?? e.startDate, kind: 'corporate', notes: e.notes }),
    );
    (data.huntFish ?? []).forEach((e: any) =>
      result.push({ id: e.id, title: e.title ?? 'Hunt/Fish', startDate: e.startDate, endDate: e.endDate ?? e.startDate, kind: 'hunt_fish', notes: e.notes }),
    );
    (data.blocked ?? []).forEach((e: any) =>
      result.push({ id: e.id, title: e.reason ?? e.reasonNotes ?? 'Hold', startDate: e.startDate, endDate: e.endDate ?? e.startDate, kind: 'blocked', notes: e.reasonNotes }),
    );

    return result;
  }, [data]);

  const visibleEvents = useMemo(
    () => filter === 'all' ? allEvents : allEvents.filter((e) => e.kind === filter),
    [allEvents, filter],
  );

  // Build a map: dateStr → CalEvent[]
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    visibleEvents.forEach((ev) => {
      const start = new Date(ev.startDate + 'T00:00:00');
      const end = new Date(ev.endDate + 'T00:00:00');
      const cur = new Date(start);
      while (cur <= end) {
        const key = toDateStr(cur);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [visibleEvents]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const days = getMonthDays(year, month);
  const todayStr = toDateStr(today);

  // Upcoming events list for the month (chronological, no filter applied for list)
  const upcomingList = useMemo(() => {
    return [...visibleEvents].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [visibleEvents]);

  return (
    <div className="min-h-screen bg-background text-[#E0D3BD] p-6 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-sans text-[10px] tracking-[0.16em] uppercase text-[#BABAAE] mb-1">Operations</p>
          <h1 className="font-sans text-2xl font-medium tracking-tight text-[#E0D3BD]">Calendar</h1>
        </div>
        <Button
          onClick={() => { setCreateDefaultDate(undefined); setCreateOpen(true); }}
          className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] rounded-none font-sans text-xs tracking-[0.1em] uppercase px-5 py-2 h-auto"
        >
          + New Event
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={[
                'font-sans text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 border transition-colors',
                active
                  ? 'border-[#9B4D19] text-[#9B4D19] bg-[#9B4D19]/10'
                  : 'border-[#57544E] text-[#BABAAE] hover:border-[#9B4D19] hover:text-[#9B4D19]',
              ].join(' ')}
            >
              {chip.key !== 'all' && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                  style={{ backgroundColor: EVENT_CONFIG[chip.key as EventKind].dot }}
                />
              )}
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Calendar */}
      <div className="bg-[#363330] border border-[#57544E]">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#57544E]">
          <button
            onClick={prevMonth}
            className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD] transition-colors px-2 py-1"
          >
            &larr; Prev
          </button>
          <span className="font-sans text-sm font-medium tracking-[0.1em] uppercase text-[#E0D3BD]">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD] transition-colors px-2 py-1"
          >
            Next &rarr;
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
        {isLoading ? (
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
              const dateStr = toDateStr(day);
              const isToday = dateStr === todayStr;
              const dayEvents = eventsByDate.get(dateStr) ?? [];
              const shown = dayEvents.slice(0, 2);
              const overflow = dayEvents.length - shown.length;

              return (
                <div
                  key={dateStr}
                  className="min-h-[100px] border-b border-r border-[#57544E] p-2 hover:bg-[#423F3B]/50 transition-colors cursor-default group"
                  onClick={() => {
                    if (dayEvents.length === 0) {
                      setCreateDefaultDate(dateStr);
                      setCreateOpen(true);
                    }
                  }}
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between mb-1.5">
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
                    {dayEvents.length === 0 && (
                      <span className="opacity-0 group-hover:opacity-100 font-sans text-[9px] tracking-[0.1em] uppercase text-[#57544E] transition-opacity">
                        + add
                      </span>
                    )}
                  </div>

                  {/* Event dots */}
                  <div className="space-y-0.5">
                    {shown.map((ev, i) => {
                      const cfg = EVENT_CONFIG[ev.kind];
                      return (
                        <button
                          key={`${ev.id}-${i}`}
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                          className="flex items-center gap-1 w-full text-left hover:opacity-80 transition-opacity"
                        >
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cfg.dot }}
                          />
                          <span className="font-sans text-[10px] text-[#BABAAE] truncate leading-tight">
                            {ev.title}
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
      <div className="flex flex-wrap gap-5">
        {(Object.entries(EVENT_CONFIG) as [EventKind, typeof EVENT_CONFIG[EventKind]][]).map(([kind, cfg]) => (
          <div key={kind} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
            <span className="font-sans text-[10px] tracking-[0.1em] uppercase text-[#BABAAE]">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Upcoming events list */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="font-sans text-[10px] tracking-[0.16em] uppercase text-[#BABAAE]">
            {MONTH_NAMES[month]} Events
          </p>
          <div className="flex-1 h-px bg-[#57544E]" />
        </div>

        {upcomingList.length === 0 ? (
          <p className="font-sans text-sm text-[#57544E] italic">No events this month.</p>
        ) : (
          <div className="bg-[#363330] border border-[#57544E] divide-y divide-[#57544E]">
            {upcomingList.map((ev) => {
              const cfg = EVENT_CONFIG[ev.kind];
              return (
                <button
                  key={`list-${ev.id}`}
                  onClick={() => setSelectedEvent(ev)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#423F3B]/50 transition-colors text-left"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cfg.dot }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm text-[#E0D3BD] truncate">{ev.title}</p>
                    {ev.notes && (
                      <p className="font-sans text-xs text-[#BABAAE] truncate mt-0.5">{ev.notes}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-sans text-xs text-[#BABAAE]">
                      {ev.startDate === ev.endDate
                        ? ev.startDate
                        : `${ev.startDate} — ${ev.endDate}`}
                    </p>
                    <p className="font-sans text-[10px] tracking-[0.1em] uppercase text-[#57544E] mt-0.5">
                      {cfg.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateEventModal
        open={createOpen}
        defaultDate={createDefaultDate}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => refetch()}
      />
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onUnblocked={() => refetch()}
      />
    </div>
  );
}
