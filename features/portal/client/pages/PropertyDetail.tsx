/**
 * PropertyDetail — Member Portal
 * ================================
 * Full property page with availability calendar, booking rules,
 * and the self-booking form.
 */

import { useState, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { trpc } from '@shared/lib/trpc';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@shared/ui/select';
import {
  ArrowLeft, Users, MapPin, TreePine, Waves, Zap, Wifi, Truck,
  Thermometer, Calendar, CheckCircle2, XCircle, AlertCircle,
  Loader2, ChevronLeft, ChevronRight, Clock, Info,
} from "lucide-react";
import { toast } from "sonner";
import WaiverSigningForm from "@features/portal/client/components/WaiverSigningForm";
// idempotencyKey uses native crypto.randomUUID (produces a valid UUID v4)

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-600 hover:bg-emerald-500 cursor-pointer",
  full: "bg-red-700 cursor-not-allowed opacity-60",
  blocked: "bg-stone-700 cursor-not-allowed opacity-50",
  // closed = out of season: visually distinct from blocked
  closed: "bg-stone-950 cursor-not-allowed opacity-30 line-through decoration-stone-600",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Available",
  full: "Fully booked",
  blocked: "Blocked",
  closed: "Out of season",
};

const ACTIVITY_OPTIONS = [
  { value: "deer", label: "Deer Hunting" },
  { value: "duck", label: "Duck Hunting" },
  { value: "turkey", label: "Turkey Hunting" },
  { value: "quail", label: "Quail Hunting" },
  { value: "dove", label: "Dove Hunting" },
  { value: "hog", label: "Hog Hunting" },
  { value: "bass", label: "Bass Fishing" },
  { value: "catfish", label: "Catfish Fishing" },
  { value: "crappie", label: "Crappie Fishing" },
  { value: "mixed_hunt", label: "Mixed Hunt" },
  { value: "mixed_fish", label: "Mixed Fish" },
  { value: "hunt_and_fish", label: "Hunt & Fish" },
  { value: "scouting", label: "Scouting" },
];

/** Normalise a date value (Date object, ISO string, or YYYY-MM-DD string) to a YYYY-MM-DD string */
function toDateStr(d: string | Date | unknown): string {
  if (d instanceof Date) return d.toISOString().split("T")[0];
  if (typeof d === "string") return d.split("T")[0]; // handles ISO strings too
  return String(d).split("T")[0];
}
function formatDate(d: string | Date | unknown) {
  const s = toDateStr(d);
  const [y, m, day] = s.split("-");
  return `${MONTHS[parseInt(m) - 1]} ${parseInt(day)}, ${y}`;
}

function addDays(date: string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

// ─── Availability Calendar ────────────────────────────────────────────────────

function AvailabilityCalendar({
  propertyId,
  selectedStart,
  selectedEnd,
  onSelectDate,
}: {
  propertyId: number;
  selectedStart: string | null;
  selectedEnd: string | null;
  onSelectDate: (date: string) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: availability, isLoading } = trpc.propertyBooking.properties.availability.useQuery(
    { propertyId, startDate: monthStart, endDate: monthEnd },
    { staleTime: 2 * 60 * 1000 },
  );

  const availMap = useMemo(() => {
    const m = new Map<string, any>();
    availability?.forEach((d: any) => m.set(d.date, d));
    return m;
  }, [availability]);

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const days: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push({ date: null, day: null });
  for (let d = 1; d <= lastDay; d++) {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date, day: d });
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const todayStr = today.toISOString().split("T")[0];

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-xl p-4 space-y-3">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-stone-100">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-stone-500 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {days.map((cell, i) => {
            if (!cell.date) return <div key={i} />;

            const avail = availMap.get(cell.date);
            const status = avail?.status ?? (cell.date < todayStr ? "closed" : "open");
            const isPast = cell.date < todayStr;
            const isSelected =
              cell.date === selectedStart ||
              cell.date === selectedEnd ||
              (selectedStart && selectedEnd && cell.date > selectedStart && cell.date < selectedEnd);
            const isStart = cell.date === selectedStart;
            const isEnd = cell.date === selectedEnd;

            // Slot-aware logic: determine if day is bookable (at least one slot available)
            const amStatus = avail?.amStatus ?? "open";
            const pmStatus = avail?.pmStatus ?? "open";
            const allDayStatus = avail?.allDayStatus ?? "open";
            const overnightStatus = avail?.overnightStatus ?? "open";
            const anySlotOpen = amStatus === "open" || pmStatus === "open" || allDayStatus === "open" || overnightStatus === "open";
            const canSelect = !isPast && status !== "blocked" && status !== "closed" && anySlotOpen;

            // Determine background: solid or half-shaded based on per-slot availability
            let bgClass = "bg-stone-700";
            if (!isPast) {
              if (allDayStatus === "full" || overnightStatus === "full") {
                // All Day or Overnight blocks entire day
                bgClass = "bg-red-700 opacity-60";
              } else if (amStatus === "full" && pmStatus === "full") {
                // Both half-day slots full = day full
                bgClass = "bg-red-700 opacity-60";
              } else if (amStatus === "full" && pmStatus === "open") {
                // AM full, PM open = half-shaded (bottom red, top green)
                bgClass = "bg-gradient-to-b from-emerald-600 to-red-700 opacity-80";
              } else if (amStatus === "open" && pmStatus === "full") {
                // AM open, PM full = half-shaded (top red, bottom green)
                bgClass = "bg-gradient-to-b from-red-700 to-emerald-600 opacity-80";
              } else if (status === "closed") {
                bgClass = "bg-stone-950 opacity-30 border border-stone-700";
              } else if (status === "blocked") {
                bgClass = "bg-stone-700 opacity-50";
              } else {
                // Both open or no booking data = available
                bgClass = "bg-emerald-600";
              }
            }

            return (
              <button
                key={cell.date}
                disabled={!canSelect}
                onClick={() => canSelect && onSelectDate(cell.date!)}
                title={
                  status === "closed" && !isPast
                    ? `${cell.date}: Out of season`
                    : status === "open"
                      ? `${cell.date}: ${STATUS_LABELS[status]}${
                          avail?.availableSpots != null
                            ? ` (${avail.availableSpots} spot${avail.availableSpots !== 1 ? "s" : ""})`
                            : ""
                        }${ avail?.seasonName ? ` — ${avail.seasonName}` : ""}`
                      : `${cell.date}: ${STATUS_LABELS[status] ?? status}`
                }
                className={`
                  relative aspect-square rounded-lg text-xs font-medium flex items-center justify-center
                  transition-all duration-100
                  ${isPast ? "text-stone-600 bg-transparent cursor-not-allowed" : ""}
                  ${!isPast && canSelect ? bgClass : ""}
                  ${!isPast && !canSelect ? "bg-stone-700 cursor-not-allowed opacity-50" : ""}
                  ${isSelected && !isStart && !isEnd ? "ring-1 ring-amber-500 bg-amber-900/40" : ""}
                  ${isStart || isEnd ? "ring-2 ring-amber-400 bg-amber-700 text-white" : ""}
                `}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1 border-t border-stone-800">
        {[
          { color: "bg-emerald-600", label: "Available" },
          { color: "bg-red-700 opacity-60", label: "Full" },
          { color: "bg-stone-700 opacity-50", label: "Blocked" },
          { color: "bg-stone-950 opacity-30 border border-stone-700", label: "Out of season" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1 text-xs text-stone-400">
            <span className={`w-3 h-3 rounded ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Booking Form Dialog ──────────────────────────────────────────────────────

function BookingDialog({
  open,
  onClose,
  property,
  startDate,
  endDate,
  slot,
}: {
  open: boolean;
  onClose: () => void;
  property: any;
  startDate: string;
  endDate: string;
  slot: "AM" | "PM" | "AllDay" | "Overnight";
}) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [partySize, setPartySize] = useState(1);
  const [activity, setActivity] = useState(
    Array.isArray(property?.activities) && property.activities.length > 0
      ? property.activities[0]
      : "deer"
  );
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [hasMinors, setHasMinors] = useState(false);
  const [huntingLicense, setHuntingLicense] = useState(false);
  const [fishingLicense, setFishingLicense] = useState(false);
  const [notes, setNotes] = useState("");
  const [showWaiverForm, setShowWaiverForm] = useState(false);
  const [waiverSignatures, setWaiverSignatures] = useState<any[]>([]);

  const totalDays = daysBetween(startDate, endDate);
  const isHunting = ["deer","duck","turkey","quail","dove","hog","mixed_hunt","hunt_and_fish","scouting"].includes(activity);
  const isFishing = ["bass","catfish","crappie","mixed_fish","hunt_and_fish"].includes(activity);

  const createBooking = trpc.propertyBooking.bookings.create.useMutation({
    onSuccess: (data) => {
      if (data.status === "confirmed") {
        toast.success(`Booking Confirmed! Ref: ${data.bookingRef}`);
      } else {
        toast.success(`Booking Submitted! Ref: ${data.bookingRef} — pending approval.`);
      }
      utils.propertyBooking.bookings.myBookings.invalidate();
      utils.propertyBooking.properties.availability.invalidate();
      onClose();
      navigate("/portal/my-bookings");
    },
    onError: (err) => {
      toast.error(`Booking failed: ${err.message}`);
    },
  });

  const handleInitialSubmit = () => {
    if (isHunting && !huntingLicense) {
      toast.error("Please confirm you have a valid hunting license.");
      return;
    }
    if (isFishing && !fishingLicense) {
      toast.error("Please confirm you have a valid fishing license.");
      return;
    }

    // Show waiver form before booking
    setShowWaiverForm(true);
  };

  const handleWaiverComplete = (signatures: any[]) => {
    setWaiverSignatures(signatures);

    // Map slot names: "AllDay" → "ALL_DAY", others uppercase
    const timeSlotMap: Record<string, "AM" | "PM" | "ALL_DAY" | "OVERNIGHT"> = {
      AM: "AM",
      PM: "PM",
      AllDay: "ALL_DAY",
      Overnight: "OVERNIGHT",
    };

    createBooking.mutate({
      propertyId: property.id,
      startDate,
      endDate,
      partySize,
      activity: activity as any,
      timeSlot: timeSlotMap[slot] || "ALL_DAY",
      guestNames: guestNames.filter(Boolean),
      hasMinors,
      huntingLicenseConfirmed: huntingLicense,
      fishingLicenseConfirmed: fishingLicense,
      memberNotes: notes || undefined,
      idempotencyKey: crypto.randomUUID(),
    });
  };

  if (showWaiverForm) {
    // Build party members list for waiver form
    const partyMembers = [
      { name: "You (Booker)", isMinor: false },
      ...guestNames.filter(Boolean).map((name) => ({ name, isMinor: hasMinors })),
    ];

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-stone-100">Waiver — {property?.name}</DialogTitle>
          </DialogHeader>
          <WaiverSigningForm
            propertyName={property?.name || "Property"}
            waiverTitle="Liability Release & Assumption of Risk"
            waiverBody="By signing this waiver, you acknowledge that you have read and understand the risks associated with your visit and activity at this property. You assume all risks and release the property owners, managers, and staff from any liability for injury, death, or property damage."
            partyMembers={partyMembers}
            onComplete={handleWaiverComplete}
            isLoading={createBooking.isPending}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-stone-100">Book {property?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Date summary */}
          <div className="bg-stone-800 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Check-in</span>
              <span className="font-medium text-stone-100">{formatDate(startDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Check-out</span>
              <span className="font-medium text-stone-100">{formatDate(endDate)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-stone-700 pt-1 mt-1">
              <span className="text-stone-400">Duration</span>
              <span className="font-medium text-amber-400">{totalDays} day{totalDays > 1 ? "s" : ""} ({slot === "AllDay" ? "All Day" : slot})</span>
            </div>
          </div>

          {/* Activity */}
          <div className="space-y-1.5">
            <Label className="text-stone-300 text-sm">Activity</Label>
            <Select value={activity} onValueChange={setActivity}>
              <SelectTrigger className="bg-stone-800 border-stone-700 text-stone-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-stone-800 border-stone-700">
                {ACTIVITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-stone-100">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Party size */}
          <div className="space-y-1.5">
            {(() => {
              const maxCapacity = Math.max(
                property?.maxDeerHunters ?? 0,
                property?.maxWaterfowlHunters ?? 0,
                property?.maxUplandHunters ?? 0,
                property?.maxGuests ?? 0,
                2
              );
              return (
                <>
                  <Label className="text-stone-300 text-sm">
                    Party Size (max {maxCapacity})
                  </Label>
                  <Select
                    value={String(partySize)}
                    onValueChange={(v) => {
                      const n = parseInt(v);
                      setPartySize(n);
                      setGuestNames(Array(Math.max(0, n - 1)).fill(""));
                    }}
                  >
                    <SelectTrigger className="bg-stone-800 border-stone-700 text-stone-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-800 border-stone-700">
                      {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)} className="text-stone-100">
                          {n} {n === 1 ? "person" : "people"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              );
            })()}
          </div>

          {/* Guest names */}
          {partySize > 1 && (
            <div className="space-y-2">
              <Label className="text-stone-300 text-sm">Guest Names</Label>
              {guestNames.map((name, i) => (
                <Input
                  key={i}
                  placeholder={`Guest ${i + 1} full name`}
                  value={name}
                  onChange={(e) => {
                    const updated = [...guestNames];
                    updated[i] = e.target.value;
                    setGuestNames(updated);
                  }}
                  className="bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500"
                />
              ))}
            </div>
          )}

          {/* Minors */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasMinors}
              onChange={(e) => setHasMinors(e.target.checked)}
              className="rounded border-stone-600 bg-stone-800"
            />
            <span className="text-sm text-stone-300">Party includes hunters under 18</span>
          </label>

          {/* License confirmations */}
          {isHunting && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={huntingLicense}
                onChange={(e) => setHuntingLicense(e.target.checked)}
                className="rounded border-stone-600 bg-stone-800 mt-0.5"
              />
              <span className="text-sm text-stone-300">
                I confirm that all members of my party hold valid hunting licenses for the applicable species.
              </span>
            </label>
          )}
          {isFishing && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fishingLicense}
                onChange={(e) => setFishingLicense(e.target.checked)}
                className="rounded border-stone-600 bg-stone-800 mt-0.5"
              />
              <span className="text-sm text-stone-300">
                I confirm that all members of my party hold valid fishing licenses.
              </span>
            </label>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-stone-300 text-sm">Notes for the Lodge (optional)</Label>
            <Textarea
              placeholder="Special requests, accessibility needs, arrival time…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500 resize-none"
            />
          </div>

          {/* Rules reminder */}
          <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              By booking you agree to the lodge's hunting rules, harvest reporting requirements,
              and cancellation policy. A harvest report is due within 7 days of your outing.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={createBooking.isPending}
            className="text-stone-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleInitialSubmit}
            disabled={createBooking.isPending}
            className="bg-amber-700 hover:bg-amber-600 text-white"
          >
            {createBooking.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking…</>
            ) : (
              "Continue to Waiver"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PropertyDetail() {
  const [, params] = useRoute("/portal/properties/:id");
  const propertyId = parseInt(params?.id ?? "0");

  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<"AM" | "PM" | "AllDay" | "Overnight">("AM");

  const { data, isLoading, error } = trpc.propertyBooking.properties.detail.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 },
  );

  const availableModes = useMemo(() => {
    if (!data) return ["AM", "PM", "AllDay"];
    const modes = ["AM", "PM", "AllDay"];
    if (data.property.overnightEnabled) {
      modes.push("Overnight");
    }
    return modes;
  }, [data]);

  const activeSlot = availableModes.includes(selectedSlot) ? selectedSlot : (availableModes[0] as "AM" | "PM" | "AllDay" | "Overnight");

  const handleDateSelect = (date: string) => {
    if (activeSlot === "Overnight") {
      // Two-click range selection for overnight stays
      if (!selectedStart || (selectedStart && selectedEnd)) {
        setSelectedStart(date);
        setSelectedEnd(null);
      } else {
        if (date < selectedStart) {
          setSelectedEnd(selectedStart);
          setSelectedStart(date);
        } else {
          setSelectedEnd(date);
        }
      }
    } else {
      // Single-click for AM/PM/AllDay: set both start and end to the same date
      setSelectedStart(date);
      setSelectedEnd(date);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">Property not found or unavailable.</span>
        </div>
        <Link href="/portal">
          <Button variant="ghost" className="mt-4 text-stone-400">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const { property, rules, seasons, amenities, images } = data;
  const coverImage = property.coverImageUrl ?? images?.[0]?.url;

  const canBook = selectedStart && selectedEnd;
  const selectedDays = canBook ? daysBetween(selectedStart!, selectedEnd!) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Link href="/portal">
        <button className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </Link>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-56 bg-stone-800">
        {coverImage ? (
          <img src={coverImage} alt={property.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TreePine className="w-16 h-16 text-stone-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <h1 className="text-2xl font-bold text-white">{property.name}</h1>
          {property.shortDescription && (
            <p className="text-stone-300 text-sm mt-0.5">{property.shortDescription}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-1 space-y-5">
          {/* Quick stats */}
          <Card className="bg-stone-900 border-stone-700">
            <CardContent className="pt-4 space-y-3">
              {(() => {
                const capacityItems = [
                  { label: "Deer", value: property.maxDeerHunters },
                  { label: "Waterfowl", value: property.maxWaterfowlHunters },
                  { label: "Upland", value: property.maxUplandHunters },
                  { label: "Guests", value: property.maxGuests },
                ].filter((item) => (item.value ?? 0) > 0);

                return capacityItems.length > 0 ? (
                  <div className="text-xs text-stone-400 space-y-1">
                    <div className="font-medium text-stone-300 mb-1">Capacity:</div>
                    {capacityItems.map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span>{item.label}</span>
                        <span className="text-stone-200">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
              {!property.maxDeerHunters && !property.maxWaterfowlHunters && !property.maxUplandHunters && !property.maxGuests && (
                <div className="flex items-center gap-2 text-sm text-stone-400">
                  <Users className="w-4 h-4 text-stone-500" />
                  Capacity not specified
                </div>
              )}
              {property.acreage && (
                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <MapPin className="w-4 h-4 text-stone-500" />
                  {parseFloat(property.acreage).toLocaleString()} acres
                </div>
              )}
              {property.locationNotes && (
                <div className="flex items-start gap-2 text-sm text-stone-300">
                  <MapPin className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                  {property.locationNotes}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Activities */}
          {Array.isArray(property.activities) && property.activities.length > 0 && (
            <Card className="bg-stone-900 border-stone-700">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm text-stone-300">Available Activities</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {property.activities.map((activity: string) => {
                  const activityConfig = ACTIVITY_OPTIONS.find((a) => a.value === activity);
                  return (
                    <div key={activity} className="text-sm text-stone-300">
                      {activityConfig?.label ?? activity}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Amenities */}
          {(property.hasHeatedBlind || property.hasAtvAccess || property.hasWaterAccess || property.hasElectricity || property.hasCellService) && (
            <Card className="bg-stone-900 border-stone-700">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm text-stone-300">Amenities</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {property.hasHeatedBlind && (
                  <div className="flex items-center gap-2 text-sm text-stone-300">
                    <Thermometer className="w-4 h-4 text-amber-500" /> Heated blind
                  </div>
                )}
                {property.hasAtvAccess && (
                  <div className="flex items-center gap-2 text-sm text-stone-300">
                    <Truck className="w-4 h-4 text-amber-500" /> ATV access
                  </div>
                )}
                {property.hasWaterAccess && (
                  <div className="flex items-center gap-2 text-sm text-stone-300">
                    <Waves className="w-4 h-4 text-amber-500" /> Water access
                  </div>
                )}
                {property.hasElectricity && (
                  <div className="flex items-center gap-2 text-sm text-stone-300">
                    <Zap className="w-4 h-4 text-amber-500" /> Electricity
                  </div>
                )}
                {property.hasCellService && (
                  <div className="flex items-center gap-2 text-sm text-stone-300">
                    <Wifi className="w-4 h-4 text-amber-500" /> Cell service
                  </div>
                )}
                {amenities?.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm text-stone-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {a.name}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Booking rules */}
          {rules && (
            <Card className="bg-stone-900 border-stone-700">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm text-stone-300">Booking Rules</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2 text-xs text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Book up to {rules.advanceBookingDays} days in advance
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Max {rules.maxConsecutiveDays} consecutive days
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Max {rules.maxDaysPerSeason} days per season
                </div>
                {rules.requiresApproval && (
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Info className="w-3.5 h-3.5" />
                    Bookings require staff approval
                  </div>
                )}
                {rules.harvestReportRequired && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Harvest report due within {rules.harvestReportDays} days
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Seasons */}
          {seasons && seasons.length > 0 && (
            <Card className="bg-stone-900 border-stone-700">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm text-stone-300">Active Seasons</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {seasons.map((s: any) => (
                  <div key={s.id} className="text-xs text-stone-400">
                    <span className="font-medium text-stone-200">{s.name}</span>
                    <span className="ml-2">{formatDate(s.startDate)} – {formatDate(s.endDate)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Calendar + booking */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {property.description && (
            <div className="prose prose-sm prose-invert max-w-none">
              <p className="text-stone-300 text-sm leading-relaxed">{property.description}</p>
            </div>
          )}

          <div>
            <h2 className="text-base font-semibold text-stone-100 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Select Dates
            </h2>

            {availableModes.length > 1 && (
              <div className="mb-4 flex gap-2">
                {availableModes.map((mode: string) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setSelectedSlot(mode as "AM" | "PM" | "AllDay" | "Overnight");
                      setSelectedStart(null);
                      setSelectedEnd(null);
                    }}
                    className={`
                      px-3 py-1 rounded-full text-sm font-medium transition-colors
                      ${selectedSlot === mode
                        ? "bg-amber-700 text-white"
                        : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                      }
                    `}
                  >
                    {mode === "AllDay" ? "All Day" : mode}
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-stone-400 mb-3">
              {activeSlot === "Overnight"
                ? "Click a start date, then click an end date to select your stay."
                : `Click a date to select your ${activeSlot === "AllDay" ? "All Day" : activeSlot} booking.`
              }
              {selectedStart && !selectedEnd && activeSlot === "Overnight" && (
                <span className="text-amber-400 ml-2">Now select your end date.</span>
              )}
            </p>

            <AvailabilityCalendar
              propertyId={propertyId}
              selectedStart={selectedStart}
              selectedEnd={selectedEnd}
              onSelectDate={handleDateSelect}
            />
          </div>

          {/* Selected range summary + book button */}
          {selectedStart && (
            <Card className="bg-stone-800 border-stone-700">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm text-stone-300">
                      {selectedEnd ? (
                        <>
                          <span className="font-medium text-stone-100">{formatDate(selectedStart)}</span>
                          <span className="text-stone-500 mx-2">→</span>
                          <span className="font-medium text-stone-100">{formatDate(selectedEnd)}</span>
                        </>
                      ) : activeSlot === "Overnight" ? (
                        <>
                          <span className="font-medium text-stone-100">{formatDate(selectedStart)}</span>
                          <span className="text-stone-400 ml-2">(select end date)</span>
                        </>
                      ) : (
                        <span className="font-medium text-stone-100">{formatDate(selectedStart)}</span>
                      )}
                    </p>
                    {canBook && (
                      <p className="text-xs text-amber-400">{selectedDays} day{selectedDays > 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedStart(null); setSelectedEnd(null); }}
                      className="text-stone-400"
                    >
                      Clear
                    </Button>
                    {canBook && (
                      <Button
                        size="sm"
                        onClick={() => setBookingOpen(true)}
                        className="bg-amber-700 hover:bg-amber-600 text-white"
                      >
                        Book {activeSlot === "AllDay" ? "All Day" : activeSlot}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Booking dialog */}
      {bookingOpen && canBook && (
        <BookingDialog
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          property={property}
          startDate={selectedStart!}
          endDate={selectedEnd!}
          slot={activeSlot}
        />
      )}
    </div>
  );
}
