/**
 * HuntFishAvailabilityCalendar
 * Public-facing availability calendar widget for Hunt and Fish pages.
 *
 * Shows a 3-month rolling calendar with color-coded slot availability:
 *   - Green  = open spots available
 *   - Amber  = limited (≥75% booked)
 *   - Red    = full
 *   - Gray   = blocked / no slots
 *
 * Clicking a slot opens a booking modal:
 *   - Logged-in members → trip request form
 *   - Non-members / guests → membership inquiry CTA
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Users, CalendarDays, Clock, Leaf, Lock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityFilter =
  | "duck" | "deer" | "turkey" | "dove" | "quail" | "hog"
  | "bass" | "catfish" | "crappie"
  | "general_hunt" | "general_fish" | "hunt_and_fish";

type AvailabilityStatus = "open" | "limited" | "full";

interface SlotSummary {
  id: number;
  activity: string;
  label: string;
  slotDate: string | Date;
  slotEndDate?: string | Date | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  totalCapacity: number;
  bookedCount: number;
  availableSpots: number;
  availabilityStatus: AvailabilityStatus;
  season: string;
  pricePerPerson?: string | null;
  regulatoryNotes?: string | null;
}

interface Props {
  /** Filter to a specific activity type (e.g. "duck" for the Hunt page) */
  activityFilter?: ActivityFilter;
  /** Display label for the section header */
  sectionTitle?: string;
  /** Accent color class for the section (Tailwind) */
  accentColor?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function parseDate(val: string | Date): Date {
  if (val instanceof Date) return val;
  // Drizzle returns "YYYY-MM-DD" strings for date columns
  const [y, m, day] = val.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function statusColor(status: AvailabilityStatus): string {
  if (status === "open") return "bg-emerald-500";
  if (status === "limited") return "bg-amber-400";
  return "bg-red-500";
}

function statusLabel(status: AvailabilityStatus): string {
  if (status === "open") return "Open";
  if (status === "limited") return "Limited";
  return "Full";
}

function statusBadgeVariant(status: AvailabilityStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "open") return "default";
  if (status === "limited") return "secondary";
  return "destructive";
}

// ─── Month Grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  year,
  month,
  slotsByDate,
  onDayClick,
}: {
  year: number;
  month: number; // 0-indexed
  slotsByDate: Map<string, SlotSummary[]>;
  onDayClick: (date: string, slots: SlotSummary[]) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateStr(new Date());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <p className="text-sm font-semibold text-center mb-2 text-foreground">
        {MONTH_NAMES[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-px text-center">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground pb-1">{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const slots = slotsByDate.get(dateStr) ?? [];
          const isPast = dateStr < today;
          const hasSlots = slots.length > 0;

          // Determine the "best" status for this day (open > limited > full)
          let dayStatus: AvailabilityStatus | null = null;
          if (hasSlots) {
            if (slots.some((s) => s.availabilityStatus === "open")) dayStatus = "open";
            else if (slots.some((s) => s.availabilityStatus === "limited")) dayStatus = "limited";
            else dayStatus = "full";
          }

          return (
            <button
              key={dateStr}
              disabled={isPast || !hasSlots}
              onClick={() => hasSlots && !isPast && onDayClick(dateStr, slots)}
              className={[
                "relative flex flex-col items-center justify-center rounded-md text-xs h-8 w-full transition-all",
                isPast ? "opacity-30 cursor-default" : "",
                hasSlots && !isPast ? "cursor-pointer hover:scale-110 hover:z-10" : "cursor-default",
                dateStr === today ? "ring-1 ring-primary ring-offset-1" : "",
              ].join(" ")}
            >
              <span className={`font-medium ${hasSlots && !isPast ? "text-foreground" : "text-muted-foreground"}`}>
                {day}
              </span>
              {dayStatus && !isPast && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${statusColor(dayStatus)}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Trip Request Modal ───────────────────────────────────────────────────────

function TripRequestModal({
  slot,
  open,
  onClose,
}: {
  slot: SlotSummary | null;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [partySize, setPartySize] = useState(1);
  const [guestNames, setGuestNames] = useState("");
  const [hasMinors, setHasMinors] = useState(false);
  const [huntLicense, setHuntLicense] = useState(false);
  const [fishLicense, setFishLicense] = useState(false);
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  const submitMutation = trpc.trips.requests.submit.useMutation({
    onSuccess: () => {
      toast.success("Trip request submitted! We'll confirm within 24 hours.");
      utils.trips.requests.myRequests.invalidate();
      onClose();
      // Reset form
      setPartySize(1);
      setGuestNames("");
      setHasMinors(false);
      setHuntLicense(false);
      setFishLicense(false);
      setNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!slot) return null;

  const isHunt = ["duck","deer","turkey","dove","quail","hog","general_hunt"].includes(slot.activity);
  const isFish = ["bass","catfish","crappie","general_fish"].includes(slot.activity);
  const isBoth = slot.activity === "hunt_and_fish";

  const handleSubmit = () => {
    if (!user) return;
    const names = guestNames.trim()
      ? guestNames.split(",").map((n) => n.trim()).filter(Boolean)
      : undefined;
    submitMutation.mutate({
      slotId: slot.id,
      partySize,
      guestNames: names,
      hasMinors,
      huntingLicenseConfirmed: isHunt || isBoth ? huntLicense : false,
      fishingLicenseConfirmed: isFish || isBoth ? fishLicense : false,
      memberNotes: notes || undefined,
    });
  };

  const slotDate = parseDate(slot.slotDate);
  const slotEndDate = slot.slotEndDate ? parseDate(slot.slotEndDate) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{slot.label}</DialogTitle>
          <DialogDescription className="text-sm">
            {slotDate.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {slotEndDate && ` – ${slotEndDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
            {slot.checkInTime && ` · Check-in ${slot.checkInTime}`}
          </DialogDescription>
        </DialogHeader>

        {/* Availability badge */}
        <div className="flex items-center gap-3 py-2 border-y border-border">
          <Badge variant={statusBadgeVariant(slot.availabilityStatus)}>
            {statusLabel(slot.availabilityStatus)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {slot.availableSpots} of {slot.totalCapacity} spot{slot.totalCapacity !== 1 ? "s" : ""} remaining
          </span>
          {slot.pricePerPerson && (
            <span className="ml-auto text-sm font-semibold">${slot.pricePerPerson}/person</span>
          )}
        </div>

        {!user ? (
          /* Non-member / logged-out path */
          <div className="py-4 text-center space-y-3">
            <Lock className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Members can request this trip directly. Apply for membership or log in to continue.
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild size="sm">
                <Link href="/membership">Apply for Membership</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={getLoginUrl()}>Log In</a>
              </Button>
            </div>
          </div>
        ) : (
          /* Member path */
          <div className="space-y-4 py-2">
            {/* Party size */}
            <div className="flex items-center gap-3">
              <Label className="w-28 text-sm flex-shrink-0 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Party Size
              </Label>
              <Input
                type="number"
                min={1}
                max={Math.min(slot.availableSpots, 20)}
                value={partySize}
                onChange={(e) => setPartySize(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8 w-20 text-sm"
              />
              <span className="text-xs text-muted-foreground">max {slot.availableSpots}</span>
            </div>

            {/* Guest names */}
            <div>
              <Label className="text-sm mb-1 block">Guest Names (optional)</Label>
              <Input
                placeholder="John Smith, Jane Doe…"
                value={guestNames}
                onChange={(e) => setGuestNames(e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated. Required for waivers at check-in.</p>
            </div>

            {/* License confirmations */}
            {(isHunt || isBoth) && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="hunt-license"
                  checked={huntLicense}
                  onCheckedChange={(v) => setHuntLicense(!!v)}
                  className="mt-0.5"
                />
                <label htmlFor="hunt-license" className="text-sm cursor-pointer leading-snug">
                  I confirm all party members will have valid hunting licenses and required stamps
                </label>
              </div>
            )}
            {(isFish || isBoth) && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="fish-license"
                  checked={fishLicense}
                  onCheckedChange={(v) => setFishLicense(!!v)}
                  className="mt-0.5"
                />
                <label htmlFor="fish-license" className="text-sm cursor-pointer leading-snug">
                  I confirm all party members will have valid fishing licenses
                </label>
              </div>
            )}

            {/* Minors */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-minors"
                checked={hasMinors}
                onCheckedChange={(v) => setHasMinors(!!v)}
              />
              <label htmlFor="has-minors" className="text-sm cursor-pointer">
                Party includes minors (under 18)
              </label>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm mb-1 block">Special Requests / Notes</Label>
              <Textarea
                placeholder="Dietary needs, accessibility, preferred guide, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm resize-none h-20"
              />
            </div>

            {slot.regulatoryNotes && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
                <Leaf className="w-3 h-3 inline mr-1" />
                {slot.regulatoryNotes}
              </div>
            )}
          </div>
        )}

        {user && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              disabled={submitMutation.isPending || slot.availableSpots < partySize}
              onClick={handleSubmit}
            >
              {submitMutation.isPending ? "Submitting…" : "Request Trip"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HuntFishAvailabilityCalendar({
  activityFilter,
  sectionTitle = "Availability Calendar",
  accentColor = "text-emerald-600",
}: Props) {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [selectedSlots, setSelectedSlots] = useState<SlotSummary[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<SlotSummary | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Show 3 months at a time
  const months = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() + monthOffset + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, [monthOffset, today]);

  const startDate = toDateStr(new Date(months[0].year, months[0].month, 1));
  const endDate = toDateStr(new Date(months[2].year, months[2].month + 1, 0));

  const slotsQuery = trpc.trips.slots.publicAvailability.useQuery(
    { activity: activityFilter, startDate, endDate },
    { staleTime: 5 * 60 * 1000 }
  );

  // Build a map: "YYYY-MM-DD" → SlotSummary[]
  const slotsByDate = useMemo(() => {
    const map = new Map<string, SlotSummary[]>();
    for (const slot of slotsQuery.data ?? []) {
      const key = typeof slot.slotDate === "string"
        ? slot.slotDate
        : toDateStr(slot.slotDate as Date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot as SlotSummary);
    }
    return map;
  }, [slotsQuery.data]);

  const handleDayClick = (date: string, slots: SlotSummary[]) => {
    setSelectedDate(date);
    setSelectedSlots(slots);
  };

  const handleSlotSelect = (slot: SlotSummary) => {
    setActiveSlot(slot);
    setModalOpen(true);
  };

  return (
    <section className="py-16 bg-background border-t border-border">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-serif font-bold ${accentColor}`}>{sectionTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Click any highlighted date to see available trips and request a spot.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonthOffset((o) => o - 1)}
              disabled={monthOffset <= 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonthOffset((o) => o + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mb-6 text-xs text-muted-foreground">
          {(["open","limited","full"] as AvailabilityStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${statusColor(s)}`} />
              {statusLabel(s)}
            </span>
          ))}
        </div>

        {slotsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-24 mx-auto" />
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, j) => (
                    <div key={j} className="h-8 bg-muted rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {months.map(({ year, month }) => (
              <MonthGrid
                key={`${year}-${month}`}
                year={year}
                month={month}
                slotsByDate={slotsByDate}
                onDayClick={handleDayClick}
              />
            ))}
          </div>
        )}

        {/* Slot detail panel */}
        {selectedDate && selectedSlots && selectedSlots.length > 0 && (
          <div className="mt-8 border border-border rounded-xl p-5 bg-card">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {parseDate(selectedDate).toLocaleDateString(undefined, {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
              <span className="text-muted-foreground font-normal">
                — {selectedSlots.length} trip{selectedSlots.length !== 1 ? "s" : ""} available
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedSlots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => handleSlotSelect(slot)}
                  className="text-left border border-border rounded-lg p-4 hover:border-primary hover:bg-accent transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {slot.label}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {slot.checkInTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {slot.checkInTime}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {slot.availableSpots} spot{slot.availableSpots !== 1 ? "s" : ""} left
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={statusBadgeVariant(slot.availabilityStatus)}
                      className="flex-shrink-0 text-xs"
                    >
                      {statusLabel(slot.availabilityStatus)}
                    </Badge>
                  </div>
                  {slot.pricePerPerson && (
                    <p className="text-xs font-semibold mt-2">${slot.pricePerPerson}/person</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!slotsQuery.isLoading && (slotsQuery.data?.length ?? 0) === 0 && (
          <div className="mt-8 text-center py-12 border border-dashed border-border rounded-xl">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium text-muted-foreground">No trips scheduled for this period</p>
            <p className="text-xs text-muted-foreground mt-1">
              Check back soon or{" "}
              <Link href="/contact" className="underline hover:text-foreground">contact us</Link>{" "}
              to request a custom trip.
            </p>
          </div>
        )}
      </div>

      {/* Trip request modal */}
      <TripRequestModal
        slot={activeSlot}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setActiveSlot(null); }}
      />
    </section>
  );
}
