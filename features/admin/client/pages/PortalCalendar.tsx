import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
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
import { Separator } from '@shared/ui/separator';
import { trpc } from '@shared/lib/trpc';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Lock,
  Target,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type EventType = "wedding" | "corporate" | "hunt_fish" | "blocked";

const TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  wedding: { label: "Wedding", color: "text-pink-700", bg: "bg-pink-100 border-pink-200", icon: Heart },
  corporate: { label: "Corporate", color: "text-blue-700", bg: "bg-blue-100 border-blue-200", icon: Building2 },
  hunt_fish: { label: "Hunt/Fish", color: "text-amber-700", bg: "bg-amber-100 border-amber-200", icon: Target },
  blocked: { label: "Blocked", color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: Lock },
};

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function PortalCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockForm, setBlockForm] = useState({ startDate: "", endDate: "", reason: "other" as const, reasonNotes: "" });
  const [filterTypes, setFilterTypes] = useState<Set<EventType>>(new Set<EventType>(["wedding", "corporate", "hunt_fish", "blocked"]));

  const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const endDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${new Date(viewYear, viewMonth + 1, 0).getDate()}`;

  const eventsQuery = trpc.portal.calendar.events.useQuery({ startDate, endDate });
  const blockMutation = trpc.portal.calendar.blockDates.useMutation({
    onSuccess: () => {
      toast.success("Dates blocked successfully");
      setShowBlockDialog(false);
      setBlockForm({ startDate: "", endDate: "", reason: "other", reasonNotes: "" });
      eventsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const unblockMutation = trpc.portal.calendar.unblockDates.useMutation({
    onSuccess: () => { toast.success("Dates unblocked"); eventsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const days = getMonthDays(viewYear, viewMonth);
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Build a map of day -> events
  const eventsByDay = useMemo(() => {
    const map: Record<string, Array<{ type: EventType; label: string; id: number; status?: string }>> = {};
    const data = eventsQuery.data;
    if (!data) return map;

    const addEvent = (dateStr: string | null | undefined, type: EventType, label: string, id: number, status?: string) => {
      if (!dateStr) return;
      const key = String(dateStr).slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push({ type, label, id, status });
    };

    data.weddings.forEach(w => addEvent(w.weddingDate as any, "wedding", w.coupleName, w.id, w.status));
    data.corporate.forEach(c => {
      if (c.arrivalDate && c.departureDate) {
        const start = new Date(c.arrivalDate as any);
        const end = new Date(c.departureDate as any);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          addEvent(d.toISOString().slice(0, 10), "corporate", c.companyName, c.id, c.status);
        }
      }
    });
    data.huntFish.forEach(h => addEvent(h.bookingDate as any, "hunt_fish", h.clientName, h.id, h.status));
    data.blocked.forEach(b => {
      if (b.startDate && b.endDate) {
        const start = new Date(b.startDate as any);
        const end = new Date(b.endDate as any);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          addEvent(d.toISOString().slice(0, 10), "blocked", b.reasonNotes ?? b.reason ?? "Blocked", b.id);
        }
      }
    });
    return map;
  }, [eventsQuery.data]);

  const toggleFilter = (type: EventType) => {
    setFilterTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Master Calendar</h1>
          <p className="text-sm text-muted-foreground">All property events and availability</p>
        </div>
        <Button onClick={() => setShowBlockDialog(true)} variant="outline" size="sm">
          <Lock className="w-4 h-4 mr-2" />
          Block Dates
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(TYPE_CONFIG) as [EventType, typeof TYPE_CONFIG[EventType]][]).map(([type, cfg]) => (
          <button
            key={type}
            onClick={() => toggleFilter(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filterTypes.has(type) ? `${cfg.bg} ${cfg.color} border-current` : "bg-muted text-muted-foreground border-transparent opacity-50"
            }`}
          >
            <cfg.icon className="w-3 h-3" />
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <CardTitle className="text-lg font-semibold">{monthName}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dateStr = day ? toDateStr(viewYear, viewMonth, day) : null;
              const dayEvents = (dateStr ? eventsByDay[dateStr] ?? [] : []).filter(e => filterTypes.has(e.type));
              const isToday = dateStr === today.toISOString().slice(0, 10);
              const isBlocked = dayEvents.some(e => e.type === "blocked");

              return (
                <div
                  key={idx}
                  className={`min-h-[90px] p-1.5 border-b border-r border-border ${!day ? "bg-muted/20" : ""} ${isBlocked ? "bg-gray-50" : ""}`}
                >
                  {day && (
                    <>
                      <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev, i) => {
                          const cfg = TYPE_CONFIG[ev.type];
                          const href = ev.type === "wedding" ? `/ops/weddings/${ev.id}`
                            : ev.type === "corporate" ? `/ops/corporate/${ev.id}`
                            : ev.type === "hunt_fish" ? `/ops/hunt-fish/${ev.id}`
                            : null;
                          const content = (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate border ${cfg.bg} ${cfg.color}`}>
                              <cfg.icon className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{ev.label}</span>
                            </div>
                          );
                          return href ? (
                            <Link key={i} href={href}>{content}</Link>
                          ) : (
                            <div key={i} className="flex items-center justify-between group">
                              {content}
                              {ev.type === "blocked" && (
                                <button
                                  onClick={() => unblockMutation.mutate({ id: ev.id })}
                                  className="opacity-0 group-hover:opacity-100 ml-1 text-muted-foreground hover:text-destructive transition-all"
                                  title="Remove block"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(Object.entries(TYPE_CONFIG) as [EventType, typeof TYPE_CONFIG[EventType]][]).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${cfg.bg}`} />
            <span>{cfg.label}</span>
          </div>
        ))}
        <span className="ml-2">Hover blocked dates to remove them</span>
      </div>

      {/* Block Dates Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Dates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={blockForm.startDate} onChange={e => setBlockForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={blockForm.endDate} onChange={e => setBlockForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={blockForm.reason} onValueChange={(v) => setBlockForm(f => ({ ...f, reason: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="private_use">Private Use</SelectItem>
                  <SelectItem value="seasonal_closure">Seasonal Closure</SelectItem>
                  <SelectItem value="buffer">Buffer / Turnaround</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Additional details..."
                value={blockForm.reasonNotes}
                onChange={e => setBlockForm(f => ({ ...f, reasonNotes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!blockForm.startDate || !blockForm.endDate) {
                  toast.error("Please select start and end dates");
                  return;
                }
                blockMutation.mutate(blockForm);
              }}
              disabled={blockMutation.isPending}
            >
              {blockMutation.isPending ? "Blocking..." : "Block Dates"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
