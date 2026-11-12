import { Link } from 'wouter';
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
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

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

type EventKind = 'wedding' | 'corporate' | 'hunt_fish' | 'blocked' | 'member_event' | 'ops_event';

const EVENT_CONFIG: Record<EventKind, { label: string; dot: string; text: string }> = {
  // Same colours as the staff Ops Calendar (/portal/ops-calendar).
  wedding:    { label: 'Wedding',    dot: '#7D8AA3', text: 'text-[#7D8AA3]' },
  corporate:  { label: 'Corporate',  dot: '#8E9670', text: 'text-[#8E9670]' },
  hunt_fish:  { label: 'Hunt/Fish',  dot: '#D9B98C', text: 'text-[#D9B98C]' },
  blocked:    { label: 'Hold/Block', dot: '#8A847A', text: 'text-[#BABAAE]' },
  member_event: { label: 'Member Event', dot: '#BABAAE', text: 'text-[#BABAAE]' },
  ops_event:    { label: 'Ops Event',    dot: '#C2662A', text: 'text-[#C2662A]' },
};

// The admin calendar has two views, one per audience:
//   ops    — what staff see on the Ops Calendar: everything.
//   master — what members see on the Member Master Calendar: member events and
//            the blocks members are shown (same rule as the member page).
export type CalendarView = 'ops' | 'master';

const VIEW_KINDS: Record<CalendarView, EventKind[]> = {
  ops: ['ops_event', 'member_event', 'wedding', 'corporate', 'hunt_fish', 'blocked'],
  master: ['member_event', 'blocked'],
};

const VIEW_COPY: Record<CalendarView, { title: string; audience: string; other: { label: string; path: string } }> = {
  ops: {
    title: 'Ops Calendar',
    audience: 'Staff only — admins and Admin/Employee staff. Shows everything, including entries members never see.',
    other: { label: 'Member Master Calendar', path: '/ops/master-calendar' },
  },
  master: {
    title: 'Member Master Calendar',
    audience: 'What members see (if their skill group can view the Member Master Calendar).',
    other: { label: 'Ops Calendar', path: '/ops/calendar' },
  },
};

type FilterKey = EventKind | 'all';

const FILTER_LABELS: Record<EventKind, string> = {
  ops_event: 'Ops Events',
  member_event: 'Member Events',
  wedding: 'Weddings',
  corporate: 'Corporate',
  hunt_fish: 'Hunt/Fish',
  blocked: 'Blocks/Holds',
};

// ---------------------------------------------------------------------------
// Types matching tRPC response shape
// ---------------------------------------------------------------------------

interface CalEvent {
  /** Blocks: had a real title (hidden titled blocks are not shown to members). */
  hasTitle?: boolean;
  id: string | number;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  kind: EventKind;
  notes?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  hiddenFromMembers?: boolean;
}

// ---------------------------------------------------------------------------
// Create Event Modal
// ---------------------------------------------------------------------------

interface CreateModalProps {
  open: boolean;
  defaultDate?: string;
  /** Pre-selected calendar: the calendar the admin is looking at. */
  defaultCalendar?: Exclude<CalendarChoice, ''>;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditModalProps {
  open: boolean;
  event: CalEvent | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Which calendar an event belongs on. "ops" = staff-only Ops Calendar, stored
// as hiddenFromMembers=true (members never receive it); "member" = Member
// Master Calendar. New events must pick one — there is no default.
type CalendarChoice = '' | 'member' | 'ops';

function CalendarChoiceField({ value, onChange, idPrefix }: { value: CalendarChoice; onChange: (v: CalendarChoice) => void; idPrefix: string }) {
  const options: { v: Exclude<CalendarChoice, ''>; label: string; hint: string }[] = [
    { v: 'member', label: 'Member Master Calendar', hint: 'Members whose skill group can view it, plus staff' },
    { v: 'ops', label: 'Ops Calendar (staff only)', hint: 'Admins and Admin/Employee staff — never members' },
  ];
  return (
    <fieldset className="space-y-2" data-testid="calendar-choice">
      <legend className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] mb-1.5">Calendar *</legend>
      {options.map((o) => (
        <label key={o.v} htmlFor={`${idPrefix}-${o.v}`} className={`flex items-start gap-2.5 p-2.5 border cursor-pointer ${value === o.v ? 'border-[#9B4D19] bg-[#9B4D19]/10' : 'border-[#57544E]'}`}>
          <input
            type="radio"
            id={`${idPrefix}-${o.v}`}
            name={`${idPrefix}-calendar`}
            value={o.v}
            checked={value === o.v}
            onChange={() => onChange(o.v)}
            className="mt-0.5"
          />
          <span>
            <span className="block font-sans text-xs text-[#E0D3BD]">{o.label}</span>
            <span className="block font-sans text-[11px] text-[#8A847A]">{o.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function CreateEventModal({ open, defaultDate, defaultCalendar, onClose, onSuccess }: CreateModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('member_event');
  const [startDate, setStartDate] = useState(defaultDate ?? '');
  const [endDate, setEndDate] = useState(defaultDate ?? '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [allDay, setAllDay] = useState(true);
  const [notes, setNotes] = useState('');
  const [isBlockDay, setIsBlockDay] = useState(false);
  const [calendarChoice, setCalendarChoice] = useState<CalendarChoice>(defaultCalendar ?? '');
  const [error, setError] = useState('');

  const saveEventMutation = trpc.portal.calendar.saveEvent.useMutation({
    onSuccess: (data) => {
      console.log('[PortalCalendar] saveEvent mutation succeeded:', data);
      toast.success('Event saved successfully');
      onSuccess();
      resetForm();
      onClose();
    },
    onError: (err) => {
      const message = err.message || 'Failed to save event';
      console.error('[PortalCalendar] saveEvent mutation failed:', message);
      setError(message);
      toast.error(`Save failed: ${message}`);
    },
  });

  const blockMutation = trpc.portal.calendar.blockDates.useMutation({
    onSuccess: (data) => {
      console.log('[PortalCalendar] blockDates mutation succeeded:', data);
      toast.success('Block saved successfully');
      onSuccess();
      resetForm();
      onClose();
    },
    onError: (err) => {
      const message = err.message || 'Failed to save block';
      console.error('[PortalCalendar] blockDates mutation failed:', message);
      setError(message);
      toast.error(`Save failed: ${message}`);
    },
  });

  function resetForm() {
    setTitle('');
    setType('member_event');
    setStartDate('');
    setEndDate('');
    setStartTime('09:00');
    setEndTime('17:00');
    setAllDay(true);
    setNotes('');
    setIsBlockDay(false);
    setCalendarChoice(defaultCalendar ?? '');
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate dates
    if (!startDate || !endDate) {
      setError('Start and end dates are required');
      return;
    }

    // Validate end date >= start date
    if (endDate < startDate) {
      setError('End date must be on or after start date');
      return;
    }

    // Validate title for non-Block Day events
    if (!isBlockDay && !title.trim()) {
      setError('Title is required (or select "Block Day" for a simple unavailability)');
      return;
    }

    if (!isBlockDay && !calendarChoice) {
      setError('Choose which calendar this goes on: Member Master Calendar or Ops Calendar');
      return;
    }

    if (isBlockDay) {
      // Route to blockDates mutation for Block Days
      blockMutation.mutate({
        startDate,
        endDate,
        startTime: allDay || !startTime ? null : startTime,
        endTime: allDay || !endTime ? null : endTime,
        allDay,
        reason: "other",
        reasonNotes: null,
      });
    } else {
      // Route to saveEvent mutation for regular events
      saveEventMutation.mutate({
        title: title.trim(),
        type,
        startDate,
        endDate,
        startTime: allDay || !startTime ? null : startTime,
        endTime: allDay || !endTime ? null : endTime,
        allDay,
        notes: notes?.trim() || null,
        hiddenFromMembers: calendarChoice === 'ops',
      });
    }
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
          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 px-3 py-2 rounded-none">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="blockday"
              checked={isBlockDay}
              onChange={(e) => setIsBlockDay(e.target.checked)}
              className="w-4 h-4 rounded border-[#57544E] bg-[#2B2823]"
            />
            <Label htmlFor="blockday" className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] cursor-pointer">
              Block Day (simple unavailability, no title/details needed)
            </Label>
          </div>

          {!isBlockDay && (
            <div className="space-y-1.5">
              <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event or hold name"
                className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] placeholder:text-[#57544E] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]"
              />
            </div>
          )}

          {!isBlockDay && (
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
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19] [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19] [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allday"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-[#57544E] bg-[#2B2823]"
            />
            <Label htmlFor="allday" className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] cursor-pointer">
              All day
            </Label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]"
                />
              </div>
            </div>
          )}

          {!isBlockDay && (
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
          )}

          {/* Block days are estate closures and show on both calendars. */}
          {!isBlockDay && (
            <CalendarChoiceField value={calendarChoice} onChange={setCalendarChoice} idPrefix="create" />
          )}

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
              disabled={blockMutation.isPending || saveEventMutation.isPending}
              className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] rounded-none font-sans text-xs tracking-[0.1em] uppercase"
            >
              {blockMutation.isPending || saveEventMutation.isPending ? 'Saving...' : 'Save Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit Event Modal
// ---------------------------------------------------------------------------

function EditEventModal({ open, event, onClose, onSuccess }: EditModalProps) {
  const [title, setTitle] = useState(event?.title || '');
  const [type, setType] = useState('member_event');
  const [startDate, setStartDate] = useState(event?.startDate || '');
  const [endDate, setEndDate] = useState(event?.endDate || '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [allDay, setAllDay] = useState(true);
  const [notes, setNotes] = useState(event?.notes || '');
  const [hiddenFromMembers, setHiddenFromMembers] = useState(false);
  const [error, setError] = useState('');

  // Update state when event changes
  useEffect(() => {
    if (event && open) {
      setTitle(event.title || '');
      setType(event.type || 'member_event');
      setStartDate(event.startDate);
      setEndDate(event.endDate);
      setStartTime(event.startTime || '09:00');
      setEndTime(event.endTime || '17:00');
      setAllDay(event.allDay ?? true);
      setNotes(event.notes || '');
      setHiddenFromMembers(event.hiddenFromMembers ?? false);
      setError('');
    }
  }, [event, open]);

  const updateEventMutation = trpc.portal.calendar.updateEvent.useMutation({
    onSuccess: () => {
      toast.success('Event updated successfully');
      onSuccess();
      onClose();
    },
    onError: (err) => {
      const message = err.message || 'Failed to update event';
      setError(message);
      toast.error(`Update failed: ${message}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('Start and end dates are required');
      return;
    }

    if (endDate < startDate) {
      setError('End date must be on or after start date');
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!event?.id) {
      setError('Event ID missing');
      return;
    }

    updateEventMutation.mutate({
      id: Number(event.id),
      title: title.trim(),
      type,
      startDate,
      endDate,
      startTime: allDay || !startTime ? null : startTime,
      endTime: allDay || !endTime ? null : endTime,
      allDay,
      notes: notes?.trim() || null,
      hiddenFromMembers,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans text-base font-medium tracking-[0.08em] uppercase text-[#E0D3BD]">
            Edit Event
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 px-3 py-2 rounded-none">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event name"
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
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19] [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19] [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allday_edit"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-[#57544E] bg-[#2B2823]"
            />
            <Label htmlFor="allday_edit" className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] cursor-pointer">
              All day
            </Label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]"
                />
              </div>
            </div>
          )}

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

          <CalendarChoiceField
            value={hiddenFromMembers ? 'ops' : 'member'}
            onChange={(v) => setHiddenFromMembers(v === 'ops')}
            idPrefix="edit"
          />

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
              disabled={updateEventMutation.isPending}
              className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] rounded-none font-sans text-xs tracking-[0.1em] uppercase"
            >
              {updateEventMutation.isPending ? 'Saving...' : 'Save Changes'}
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
  onEdit?: (event: CalEvent) => void;
}

function EventDetailModal({ event, onClose, onUnblocked, onEdit }: DetailModalProps) {
  const [confirming, setConfirming] = useState(false);

  const deleteEventMutation = trpc.portal.calendar.deleteEvent.useMutation({
    onSuccess: () => {
      toast.success('Event removed successfully');
      onUnblocked();
      onClose();
      setConfirming(false);
    },
    onError: (err) => {
      const message = err.message || 'Failed to remove event';
      toast.error(`Remove failed: ${message}`);
    },
  });

  const unblockMutation = trpc.portal.calendar.unblockDates.useMutation({
    onSuccess: () => {
      toast.success('Block removed successfully');
      onUnblocked();
      onClose();
      setConfirming(false);
    },
    onError: (err) => {
      const message = err.message || 'Failed to remove block';
      toast.error(`Remove failed: ${message}`);
    },
  });

  if (!event) return null;
  const cfg = EVENT_CONFIG[event.kind];
  const isEvent = event.kind === 'member_event' || event.kind === 'ops_event';

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
            {event.title || cfg.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1 text-sm text-[#BABAAE]">
          <div>
            <span className="font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE] block mb-0.5">Dates</span>
            <span>{event.startDate === event.endDate ? event.startDate : `${event.startDate} — ${event.endDate}`}</span>
          </div>
          {isEvent && (
            <div data-testid="event-calendar">
              <span className="font-sans text-[10px] tracking-[0.12em] uppercase text-[#BABAAE] block mb-0.5">Calendar</span>
              <span>{event.hiddenFromMembers ? 'Ops Calendar (staff only)' : 'Member Master Calendar'}</span>
            </div>
          )}
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
              {isEvent && onEdit && (
                <Button
                  variant="outline"
                  onClick={() => onEdit(event!)}
                  className="border-[#9B4D19] text-[#9B4D19] hover:bg-[#9B4D19]/10 rounded-none bg-transparent font-sans text-xs tracking-[0.1em] uppercase"
                >
                  Edit Event
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setConfirming(true)}
                className="border-[#57544E] text-[#BABAAE] hover:border-[#57544E] hover:text-[#E0D3BD] rounded-none bg-transparent font-sans text-xs tracking-[0.1em] uppercase"
              >
                {isEvent ? 'Remove Event' : 'Remove Block'}
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
                onClick={() => {
                  if (isEvent) {
                    deleteEventMutation.mutate({ id: Number(event.id) });
                  } else {
                    unblockMutation.mutate({ id: Number(event.id) });
                  }
                }}
                disabled={deleteEventMutation.isPending || unblockMutation.isPending}
                className="bg-[#57544E] hover:bg-[#423F3B] text-[#E0D3BD] rounded-none font-sans text-xs tracking-[0.1em] uppercase"
              >
                {deleteEventMutation.isPending || unblockMutation.isPending ? 'Removing...' : 'Confirm Remove'}
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

export default function PortalCalendar({ view = 'ops' }: { view?: CalendarView }) {
  const copy = VIEW_COPY[view];
  const viewKinds = VIEW_KINDS[view];
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [filter, setFilter] = useState<FilterKey>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const startDate = toDateStr(new Date(year, month, 1));
  const endDate = toDateStr(new Date(year, month + 1, 0));

  const { data, refetch, isLoading } = trpc.portal.calendar.events.useQuery(
    { startDate, endDate },
    { staleTime: 30_000 }, // Keep data fresh for 30 seconds, prevent aggressive refetch on window focus
  );

  // Normalise API data into flat CalEvent[]
  const allEvents: CalEvent[] = useMemo(() => {
    if (!data) return [];
    const result: CalEvent[] = [];

    // Bookings carry their own date fields (weddingDate, arrival/departure,
    // bookingDate) — there is no startDate on them. Reading startDate left it
    // undefined and crashed the page whenever a booking fell in the month.
    // Cancelled bookings are left off, as on the staff Ops Calendar.
    const add = (ev: CalEvent, status?: string) => { if (ev.startDate && status !== 'cancelled') result.push(ev); };
    (data.weddings ?? []).forEach((e: any) =>
      add({ id: e.id, title: e.title ?? 'Wedding', startDate: e.weddingDate, endDate: e.weddingDate, kind: 'wedding', notes: e.notes }, e.status),
    );
    (data.corporate ?? []).forEach((e: any) =>
      add({ id: e.id, title: e.title ?? 'Corporate', startDate: e.arrivalDate, endDate: e.departureDate ?? e.arrivalDate, kind: 'corporate', notes: e.notes }, e.status),
    );
    (data.huntFish ?? []).forEach((e: any) =>
      add({ id: e.id, title: e.title ?? 'Hunt/Fish', startDate: e.bookingDate, endDate: e.bookingDate, kind: 'hunt_fish', notes: e.notes }, e.status),
    );
    (data.blocked ?? []).forEach((e: any) =>
      result.push({ id: e.id, title: e.title ?? e.reasonNotes ?? (e.reason && e.reason !== 'other' ? e.reason : 'Hold'), startDate: e.startDate, endDate: e.endDate ?? e.startDate, kind: 'blocked', notes: e.reasonNotes, hasTitle: !!e.title, hiddenFromMembers: e.hiddenFromMembers ?? false }),
    );
    (data.events ?? []).forEach((e: any) =>
      result.push({
        id: e.id,
        title: e.title ?? 'Admin Event',
        startDate: e.startDate,
        endDate: e.endDate ?? e.startDate,
        kind: e.hiddenFromMembers ? 'ops_event' : 'member_event',
        notes: e.notes,
        type: e.type,
        startTime: e.startTime,
        endTime: e.endTime,
        allDay: e.allDay ?? true,
        hiddenFromMembers: e.hiddenFromMembers ?? false,
      }),
    );

    // Keep only what this calendar's audience sees.
    return result.filter((ev) => {
      if (!viewKinds.includes(ev.kind)) return false;
      if (view === 'master' && ev.kind === 'blocked' && ev.hiddenFromMembers && ev.hasTitle) return false;
      return true;
    });
  }, [data, view, viewKinds]);

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    ...viewKinds.map((k) => ({ key: k as FilterKey, label: FILTER_LABELS[k] })),
  ];

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
          <h1 className="font-sans text-2xl font-medium tracking-tight text-[#E0D3BD]" data-testid="calendar-title">{copy.title}</h1>
          <p className="font-sans text-xs text-[#BABAAE] mt-1 max-w-xl">{copy.audience}</p>
          <Link href={copy.other.path} className="inline-block mt-2 font-sans text-[10px] tracking-[0.12em] uppercase text-[#9B4D19] hover:underline">
            Switch to {copy.other.label} →
          </Link>
        </div>
        <div className="flex items-start gap-4">
          {view === 'master' && (
            <Link
              href="/ops/calendar-settings"
              className="inline-flex items-center border border-[#57544E] text-[#BABAAE] hover:border-[#9B4D19] hover:text-[#E0D3BD] rounded-none font-sans text-xs tracking-[0.1em] uppercase px-3 py-2 gap-2"
              title="Choose which skill groups can view the Member Master Calendar"
            >
              <Settings className="w-4 h-4" />
              Who can see it
            </Link>
          )}
          <Button
            onClick={() => { setCreateDefaultDate(undefined); setCreateOpen(true); }}
            className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] rounded-none font-sans text-xs tracking-[0.1em] uppercase px-5 py-2 h-auto"
          >
            + New Event
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => {
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
                  className="relative min-h-[100px] border-b border-r border-[#57544E] p-2 hover:bg-[#423F3B]/50 transition-colors cursor-default group"
                  onClick={() => {
                    if (dayEvents.length === 0) {
                      setCreateDefaultDate(dateStr);
                      setCreateOpen(true);
                    }
                  }}
                >
                  <div className="relative z-10">
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend (this calendar's kinds only) */}
      <div className="flex flex-wrap gap-5">
        {viewKinds.map((kind) => [kind, EVENT_CONFIG[kind]] as const).map(([kind, cfg]) => (
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
        defaultCalendar={view === 'master' ? 'member' : 'ops'}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => refetch()}
      />
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onUnblocked={() => refetch()}
        onEdit={(event) => {
          setEditingEvent(event);
          setEditOpen(true);
          setSelectedEvent(null);
        }}
      />
      <EditEventModal
        open={editOpen}
        event={editingEvent}
        onClose={() => {
          setEditOpen(false);
          setEditingEvent(null);
        }}
        onSuccess={() => {
          refetch();
          setEditOpen(false);
          setEditingEvent(null);
        }}
      />

    </div>
  );
}
