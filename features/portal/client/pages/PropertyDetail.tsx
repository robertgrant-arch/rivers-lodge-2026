/**
 * PropertyDetail — Member Portal
 * ================================
 * Full property page with availability calendar, booking rules,
 * and the self-booking form.
 */

import { useState, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { trpc } from '@shared/lib/trpc';
import { useAuth } from '@features/auth/public';
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
  Loader2, ChevronLeft, ChevronRight, Clock, Info, Plus, Trash2,
  Map as MapIcon, FileText, Navigation, ExternalLink, KeyRound,
} from "lucide-react";
import { PROPERTY_ACTIVITIES, activityLabel, isHuntingActivity, isFishingActivity } from "@shared/propertyActivities";
import { BOOKING_RULES, MAX_CONSECUTIVE_DAYS, bookingDayCount, propertyCapacity } from "@shared/propertyRules";
import { toast } from "sonner";
import { MasterWaiverGate, BookingWaiverDialog } from "@features/waivers/client/public";
import { BOOKING_WAIVER_ACCEPTANCE_TEXT, BOOKING_WAIVER_LINK_TEXT, validateParty, type PartyInput } from "@shared/waiverParty";
import { usePortalLink } from "@features/portal/client/portalNav";
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

/**
 * Activities a member can pick when booking: the property's approved labels
 * (legacy stored values mapped by the server), or all seven if it has none.
 */
function bookingActivityOptions(property: any): Array<{ value: string; label: string }> {
  const keys: string[] = Array.isArray(property?.displayActivities) ? property.displayActivities : [];
  const list = keys.length > 0 ? keys : PROPERTY_ACTIVITIES.map((a) => a.value);
  return list.map((value) => ({ value, label: activityLabel(value) ?? value }));
}

/** Party-size limit: Max Capacity, or the previous per-activity maximum if not set. */
function partySizeLimit(property: any): number {
  return propertyCapacity(property) ?? Math.max(
    property?.maxDeerHunters ?? 0,
    property?.maxWaterfowlHunters ?? 0,
    property?.maxUplandHunters ?? 0,
    property?.maxGuests ?? 0,
    2,
  );
}

const isPdfUrl = (url: string) => /\.pdf($|\?)/i.test(url);

/** Normalise a date value (Date object, ISO string, or YYYY-MM-DD string) to a YYYY-MM-DD string */
function toDateStr(d: string | Date | unknown): string {
  if (d instanceof Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
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
  availMap,
  selectedSlot,
  viewYear,
  viewMonth,
  onViewYearChange,
  onViewMonthChange,
}: {
  propertyId: number;
  selectedStart: string | null;
  selectedEnd: string | null;
  onSelectDate: (date: string) => void;
  availMap: Map<string, any>;
  selectedSlot: "AM" | "PM" | "AllDay" | "Overnight";
  viewYear: number;
  viewMonth: number;
  onViewYearChange: (year: number) => void;
  onViewMonthChange: (month: number) => void;
}) {
  const today = new Date();

  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const days: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push({ date: null, day: null });
  for (let d = 1; d <= lastDay; d++) {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date, day: d });
  }

  const prevMonth = () => {
    if (viewMonth === 0) { onViewYearChange(viewYear - 1); onViewMonthChange(11); }
    else onViewMonthChange(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { onViewYearChange(viewYear + 1); onViewMonthChange(0); }
    else onViewMonthChange(viewMonth + 1);
  };

  const todayStr = toDateStr(today);

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
      {availMap.size === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {days.map((cell, i) => {
            if (!cell.date) return <div key={i} />;

            const lookupKey = String(cell.date).slice(0, 10);
            const avail = availMap.get(lookupKey);

            const status = avail?.status ?? (cell.date < todayStr ? "closed" : "open");
            const isPast = cell.date < todayStr;
            const isSelected =
              cell.date === selectedStart ||
              cell.date === selectedEnd ||
              (selectedStart && selectedEnd && cell.date > selectedStart && cell.date < selectedEnd);
            const isStart = cell.date === selectedStart;
            const isEnd = cell.date === selectedEnd;

            // Slot-aware logic: determine if day is bookable based on SELECTED slot only (FIX)
            const amStatus = avail?.amStatus ?? "open";
            const pmStatus = avail?.pmStatus ?? "open";
            const allDayStatus = avail?.allDayStatus ?? "open";
            const overnightStatus = avail?.overnightStatus ?? "open";

            // Derive activeStatus from selectedSlot
            const slotStatusMap: Record<string, string> = {
              AM: amStatus,
              PM: pmStatus,
              AllDay: allDayStatus,
              Overnight: overnightStatus,
            };
            const activeStatus = slotStatusMap[selectedSlot] ?? "open";

            // canSelect uses ONLY the selected slot's status
            const canSelect = !isPast && status !== "blocked" && status !== "closed" && activeStatus === "open";

            // Check if the entire day is fully booked (any full slot = entire day full)
            const isFullDay = !isPast && (
              status === "full" ||
              allDayStatus === "full" ||
              overnightStatus === "full" ||
              (amStatus === "full" && pmStatus === "full")
            );

            // Determine if this is a genuine split-state day (AM and PM differ, but no all-day/overnight bookings)
            // Only render split if both allDay and overnight are open
            const isMixedState = !isPast &&
              status !== "blocked" &&
              status !== "closed" &&
              allDayStatus === "open" &&
              overnightStatus === "open" &&
              amStatus !== pmStatus;

            // Determine background color/style based on availability state
            // Priority: (1) fully booked → solid red, (2) mixed AM/PM → split, (3) both open → green
            let bgClass = "bg-stone-700";
            let bgStyle: React.CSSProperties = {};

            if (status === "closed") {
              // Out of season — independent of slot
              bgClass = "bg-stone-950";
              bgStyle = { opacity: 0.3, borderWidth: "1px", borderColor: "rgb(55 65 81)" };
            } else if (status === "blocked") {
              // Blocked — independent of slot
              bgClass = "bg-stone-700";
              bgStyle = { opacity: 0.5 };
            } else if (isFullDay) {
              // ANY full status = entire day is SOLID RED (All Day, Overnight, or both AM+PM)
              bgClass = "bg-red-700";
              bgStyle = { opacity: 0.6 };
            } else if (isMixedState) {
              // Split state: AM and PM differ, and no all-day/overnight bookings
              // Render as a split cell with gradient showing both statuses
              if (amStatus === "full" && pmStatus === "open") {
                // AM Full / PM Open: red top, green bottom
                bgStyle = {
                  backgroundImage: "linear-gradient(to bottom, rgb(185 28 28) 0%, rgb(185 28 28) 50%, rgb(5 150 105) 50%, rgb(5 150 105) 100%)",
                  opacity: 0.7,
                };
              } else if (pmStatus === "full" && amStatus === "open") {
                // PM Full / AM Open: green top, red bottom
                bgStyle = {
                  backgroundImage: "linear-gradient(to bottom, rgb(5 150 105) 0%, rgb(5 150 105) 50%, rgb(185 28 28) 50%, rgb(185 28 28) 100%)",
                  opacity: 0.7,
                };
              }
            } else if (!isPast && amStatus === "open" && pmStatus === "open") {
              // Both AM and PM open (all-day and overnight also open) — solid green
              bgClass = "bg-emerald-600";
            }

            return (
              <button
                key={cell.date}
                disabled={!canSelect}
                onClick={() => canSelect && onSelectDate(cell.date!)}
                style={bgStyle}
                title={
                  status === "closed" && !isPast
                    ? `${cell.date}: Out of season`
                    : isFullDay
                      ? `${cell.date}: ${allDayStatus === "full" ? "All Day Full" : overnightStatus === "full" ? "Overnight Full" : "Full"}`
                      : isMixedState
                      ? `${cell.date}: ${amStatus === "full" ? "AM Full" : "AM Open"} / ${pmStatus === "full" ? "PM Full" : "PM Open"}`
                      : (amStatus === "open" && pmStatus === "open" && allDayStatus === "open" && overnightStatus === "open")
                      ? `${cell.date}: Available${
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
                  ${!isPast && bgClass ? bgClass : ""}
                  ${!isPast && !bgClass ? "bg-stone-700" : ""}
                  ${!isPast && !canSelect ? "cursor-not-allowed" : ""}
                  ${isSelected && !isStart && !isEnd ? "ring-1 ring-amber-500" : ""}
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
        <span className="flex items-center gap-1 text-xs text-stone-400">
          <span className="w-3 h-3 rounded bg-emerald-600" />
          Available
        </span>
        <span className="flex items-center gap-1 text-xs text-stone-400">
          <div className="w-3 h-3 rounded" style={{backgroundImage: "linear-gradient(to bottom, rgb(5 150 105) 0%, rgb(5 150 105) 50%, rgb(185 28 28) 50%, rgb(185 28 28) 100%)"}} />
          AM Full, PM Open
        </span>
        <span className="flex items-center gap-1 text-xs text-stone-400">
          <div className="w-3 h-3 rounded" style={{backgroundImage: "linear-gradient(to bottom, rgb(185 28 28) 0%, rgb(185 28 28) 50%, rgb(5 150 105) 50%, rgb(5 150 105) 100%)"}} />
          PM Full, AM Open
        </span>
        <span className="flex items-center gap-1 text-xs text-stone-400">
          <span className="w-3 h-3 rounded bg-red-700 opacity-60" />
          Full
        </span>
        <span className="flex items-center gap-1 text-xs text-stone-400">
          <span className="w-3 h-3 rounded bg-stone-700 opacity-50" />
          Blocked
        </span>
        <span className="flex items-center gap-1 text-xs text-stone-400">
          <span className="w-3 h-3 rounded bg-stone-950 opacity-30 border border-stone-700" />
          Out of season
        </span>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** One row of "Who's coming?" (the member is separate). */
type GuestRow =
  | { id: string; type: "adult"; fullName: string; email: string; phone: string }
  | { id: string; type: "minor"; fullName: string; dateOfBirth: string; guardian: string /* "member" | guest row id */ };

const newId = () => `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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
  const portalLink = usePortalLink();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { user } = useAuth({});
  const masterQ = trpc.waivers.docusign.myMasterStatus.useQuery(undefined, { enabled: open });
  const contact: any = (masterQ.data as any)?.contact ?? null;

  const activityOptions = bookingActivityOptions(property);
  const [activity, setActivity] = useState(activityOptions[0]?.value ?? "fishing");
  const [memberName, setMemberName] = useState<string | null>(null);
  const [memberPhone, setMemberPhone] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [huntingLicense, setHuntingLicense] = useState(false);
  const [fishingLicense, setFishingLicense] = useState(false);
  const [notes, setNotes] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [showWaiverText, setShowWaiverText] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const totalDays = daysBetween(startDate, endDate);
  const isHunting = isHuntingActivity(activity);
  const isFishing = isFishingActivity(activity);
  const maxCapacity = partySizeLimit(property);
  const partySize = 1 + guests.length;
  const memberEmail = contact?.email || user?.email || "";
  const mName = memberName ?? contact?.fullName ?? "";
  const mPhone = memberPhone ?? contact?.phone ?? "";
  const adultRows = guests.filter((g): g is Extract<GuestRow, { type: "adult" }> => g.type === "adult");

  const updateGuest = (id: string, patch: Partial<GuestRow>) =>
    setGuests((gs) => gs.map((g) => (g.id === id ? ({ ...g, ...patch } as GuestRow) : g)));
  const removeGuestRow = (id: string) =>
    setGuests((gs) => gs.filter((g) => g.id !== id).map((g) => (g.type === "minor" && g.guardian === id ? { ...g, guardian: "" } : g)));
  const addGuest = (type: "adult" | "minor") => {
    if (partySize >= maxCapacity) { toast.error(`This property allows a maximum of ${maxCapacity} ${maxCapacity === 1 ? "person" : "people"}.`); return; }
    setGuests((gs) => [...gs, type === "adult"
      ? { id: newId(), type: "adult", fullName: "", email: "", phone: "" }
      : { id: newId(), type: "minor", fullName: "", dateOfBirth: "", guardian: "member" }]);
  };

  /** Server/shared shape: guardian as "member" or index into guests. */
  const buildParty = (): PartyInput => ({
    member: { fullName: mName.trim(), email: memberEmail, phone: mPhone },
    guests: guests.map((g) => g.type === "adult"
      ? { type: "adult" as const, fullName: g.fullName, email: g.email, phone: g.phone }
      : { type: "minor" as const, fullName: g.fullName, dateOfBirth: g.dateOfBirth, guardian: g.guardian === "member" ? "member" as const : guests.findIndex((x) => x.id === g.guardian) }),
  });

  const createBooking = trpc.propertyBooking.bookings.create.useMutation({
    onSuccess: (data: any) => {
      if (data.status === "pending_waiver") {
        if (data.waiverSend && !data.waiverSend.ok && !data.waiverSend.queued) {
          toast.error(`Booking ${data.bookingRef} is held, but DocuSign couldn't send the waiver: ${data.waiverSend.error}. Open My Bookings to resend or send by email only.`, { duration: 15000 });
        } else {
          toast.success(`Booking ${data.bookingRef} is held. Check your email/texts and sign the waiver to confirm it.`, { duration: 10000 });
        }
      } else if (data.status === "confirmed") {
        toast.success(`Booking Confirmed! Ref: ${data.bookingRef}`);
      } else {
        toast.success(`Booking Submitted! Ref: ${data.bookingRef} — pending approval.`);
      }
      utils.propertyBooking.bookings.myBookings.invalidate();
      utils.propertyBooking.properties.availability.invalidate();
      onClose();
      navigate(portalLink("/portal/my-bookings"));
    },
    onError: (err) => {
      toast.error(`Booking failed: ${err.message}`);
      if (err.data?.code === "PRECONDITION_FAILED") masterQ.refetch();
    },
  });

  const handleSubmit = () => {
    const party = buildParty();
    const v = validateParty(party, { capacity: maxCapacity, checkInDate: startDate });
    // Map "guests.N.field" to row ids for display.
    const errors: Record<string, string> = {};
    for (const [k, msg] of Object.entries(v.errors)) {
      const m = /^guests\.(\d+)\.(\w+)$/.exec(k);
      errors[m ? `${guests[Number(m[1])]?.id}.${m[2]}` : k] = msg;
    }
    setValidationErrors(errors);
    if (!v.ok) { toast.error(Object.values(v.errors)[0] ?? "Please check your guest list."); return; }
    if (isHunting && !huntingLicense) { toast.error("Please confirm you have a valid hunting license."); return; }
    if (isFishing && !fishingLicense) { toast.error("Please confirm you have a valid fishing license."); return; }
    if (!accepted) { toast.error("Please read and accept the Rivers Lodge Release & Liability Waiver."); return; }

    const timeSlotMap: Record<string, "AM" | "PM" | "ALL_DAY" | "OVERNIGHT"> = { AM: "AM", PM: "PM", AllDay: "ALL_DAY", Overnight: "OVERNIGHT" };
    createBooking.mutate({
      propertyId: property.id,
      startDate,
      endDate,
      partySize: v.partySize,
      activity: activity as any,
      timeSlot: timeSlotMap[slot] || "ALL_DAY",
      guestNames: guests.map((g) => g.fullName.trim()).filter(Boolean),
      hasMinors: guests.some((g) => g.type === "minor"),
      huntingLicenseConfirmed: huntingLicense,
      fishingLicenseConfirmed: fishingLicense,
      memberNotes: notes || undefined,
      idempotencyKey: crypto.randomUUID(),
      party,
      waiverAcceptance: { accepted: true, text: BOOKING_WAIVER_ACCEPTANCE_TEXT },
    } as any);
  };

  const err = (k: string) => validationErrors[k] ? <p className="text-xs text-red-400 mt-1">{validationErrors[k]}</p> : null;
  const inputCls = (k: string) => `bg-stone-700 border-stone-600 text-stone-100 placeholder:text-stone-500 ${validationErrors[k] ? "border-red-500" : ""}`;
  const [before, after] = BOOKING_WAIVER_ACCEPTANCE_TEXT.split(BOOKING_WAIVER_LINK_TEXT);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-stone-100">Book {property?.name}</DialogTitle>
        </DialogHeader>

        <MasterWaiverGate>
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
                {activityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-stone-100">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Who's coming? */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label className="text-stone-300 text-sm font-semibold">Who's coming?</Label>
              <span className="text-xs text-stone-500">{partySize} of max {maxCapacity}</span>
            </div>

            {/* The member */}
            <div className="bg-stone-800 rounded-lg p-4 space-y-2 border border-stone-700">
              <div className="text-xs text-stone-400 font-medium">You · Adult</div>
              <div>
                <Label className="text-xs text-stone-400">Full name *</Label>
                <Input value={mName} onChange={(e) => setMemberName(e.target.value)} placeholder="Full name" className={inputCls("member.fullName")} />
                {err("member.fullName")}
              </div>
              <div>
                <Label className="text-xs text-stone-400">Email</Label>
                <Input value={memberEmail} disabled className="bg-stone-700 border-stone-600 text-stone-100 cursor-not-allowed opacity-60" />
                {err("member.email")}
              </div>
              <div>
                <Label className="text-xs text-stone-400">Mobile (US) *</Label>
                <Input type="tel" value={mPhone} onChange={(e) => setMemberPhone(e.target.value)} placeholder="(816) 555-0100" className={inputCls("member.phone")} />
                {err("member.phone")}
              </div>
            </div>

            {guests.map((g, idx) => (
              <div key={g.id} className="bg-stone-800 rounded-lg p-4 border border-stone-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
                    Guest {idx + 1} ·
                    <select
                      value={g.type}
                      onChange={(e) => {
                        const type = e.target.value as "adult" | "minor";
                        setGuests((gs) => gs.map((x): GuestRow => x.id !== g.id ? x : type === "adult"
                          ? { id: x.id, type: "adult", fullName: x.fullName, email: "", phone: "" }
                          : { id: x.id, type: "minor", fullName: x.fullName, dateOfBirth: "", guardian: "member" })
                          .map((x): GuestRow => (type === "minor" && x.type === "minor" && x.guardian === g.id ? { ...x, guardian: "" } : x)));
                      }}
                      className="bg-stone-700 border border-stone-600 rounded px-1.5 py-0.5 text-stone-100"
                    >
                      <option value="adult">Adult</option>
                      <option value="minor">Minor</option>
                    </select>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeGuestRow(g.id)} className="text-red-400 hover:text-red-300 p-1 h-auto">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs text-stone-400">Full name *</Label>
                  <Input value={g.fullName} onChange={(e) => updateGuest(g.id, { fullName: e.target.value })} placeholder="Full name" className={inputCls(`${g.id}.fullName`)} />
                  {err(`${g.id}.fullName`)}
                </div>
                {g.type === "adult" ? (
                  <>
                    <div>
                      <Label className="text-xs text-stone-400">Email *</Label>
                      <Input type="email" value={g.email} onChange={(e) => updateGuest(g.id, { email: e.target.value } as any)} placeholder="email@example.com" className={inputCls(`${g.id}.email`)} />
                      {err(`${g.id}.email`)}
                    </div>
                    <div>
                      <Label className="text-xs text-stone-400">Mobile (US) *</Label>
                      <Input type="tel" value={g.phone} onChange={(e) => updateGuest(g.id, { phone: e.target.value } as any)} placeholder="(816) 555-0100" className={inputCls(`${g.id}.phone`)} />
                      {err(`${g.id}.phone`)}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs text-stone-400">Date of birth *</Label>
                      <Input type="date" value={g.dateOfBirth} onChange={(e) => updateGuest(g.id, { dateOfBirth: e.target.value } as any)} className={inputCls(`${g.id}.dateOfBirth`)} />
                      {err(`${g.id}.dateOfBirth`)}
                    </div>
                    <div>
                      <Label className="text-xs text-stone-400">Parent/guardian in this party *</Label>
                      <select
                        value={g.guardian}
                        onChange={(e) => updateGuest(g.id, { guardian: e.target.value } as any)}
                        className={`w-full h-9 rounded-md px-2 border ${validationErrors[`${g.id}.guardian`] ? "border-red-500" : "border-stone-600"} bg-stone-700 text-stone-100`}
                      >
                        <option value="">Choose…</option>
                        <option value="member">{mName || "Me"} (you)</option>
                        {adultRows.map((a) => <option key={a.id} value={a.id}>{a.fullName || `Guest ${guests.indexOf(a) + 1}`}</option>)}
                      </select>
                      {err(`${g.id}.guardian`)}
                    </div>
                  </>
                )}
              </div>
            ))}

            {err("party")}
            <div className="flex gap-4">
              <Button size="sm" variant="ghost" onClick={() => addGuest("adult")} className="text-amber-500 hover:text-amber-400 text-xs p-0 h-auto">
                <Plus className="w-3 h-3 mr-1" /> Add adult
              </Button>
              <Button size="sm" variant="ghost" onClick={() => addGuest("minor")} className="text-amber-500 hover:text-amber-400 text-xs p-0 h-auto">
                <Plus className="w-3 h-3 mr-1" /> Add minor
              </Button>
            </div>
            <p className="text-xs text-stone-500">Every adult signs the waiver by email/text before arriving. Minors are covered on their parent or guardian's waiver.</p>
          </div>

          {/* License confirmations */}
          {isHunting && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={huntingLicense} onChange={(e) => setHuntingLicense(e.target.checked)} className="rounded border-stone-600 bg-stone-800 mt-0.5" />
              <span className="text-sm text-stone-300">I confirm that all members of my party hold valid hunting licenses for the applicable species.</span>
            </label>
          )}
          {isFishing && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={fishingLicense} onChange={(e) => setFishingLicense(e.target.checked)} className="rounded border-stone-600 bg-stone-800 mt-0.5" />
              <span className="text-sm text-stone-300">I confirm that all members of my party hold valid fishing licenses.</span>
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

          {/* Required waiver acceptance */}
          <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg border border-stone-700 bg-stone-800/60">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="rounded border-stone-600 bg-stone-800 mt-1" />
            <span className="text-sm text-stone-300 leading-relaxed">
              {before}
              <button type="button" onClick={(e) => { e.preventDefault(); setShowWaiverText(true); }} className="text-amber-400 underline underline-offset-2 hover:text-amber-300">{BOOKING_WAIVER_LINK_TEXT}</button>
              {after}
            </span>
          </label>

          {/* Rules reminder */}
          <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              By booking you agree to the lodge's cancellation policy. {BOOKING_RULES[0]}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={createBooking.isPending} className="text-stone-400">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createBooking.isPending || !accepted} className="bg-amber-700 hover:bg-amber-600 text-white">
            {createBooking.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking…</>) : "Book"}
          </Button>
        </DialogFooter>
        </MasterWaiverGate>
        <BookingWaiverDialog open={showWaiverText} onClose={() => setShowWaiverText(false)} />
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PropertyDetail() {
  const portalLink = usePortalLink();
  const [, params] = useRoute("/portal/properties/:id");
  const propertyId = parseInt(params?.id ?? "0");

  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<"AM" | "PM" | "AllDay" | "Overnight">("AM");
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const { data, isLoading, error } = trpc.propertyBooking.properties.detail.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 },
  );

  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: availability, isLoading: availLoading, error: availError } = trpc.propertyBooking.properties.availability.useQuery(
    { propertyId, startDate: monthStart, endDate: monthEnd },
    { staleTime: 2 * 60 * 1000, enabled: propertyId > 0 },
  );

  const availMap = useMemo(() => {
    const m = new Map<string, any>();
    if (availability && Array.isArray(availability)) {
      availability.forEach((d: any) => {
        const dateKey = String(d.date).slice(0, 10);
        m.set(dateKey, d);
      });
    }
    return m;
  }, [availability]);

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
        const [start, end] = date < selectedStart ? [date, selectedStart] : [selectedStart, date];
        // Booking rule: maximum consecutive days (also enforced by the server).
        if (bookingDayCount(start, end) > MAX_CONSECUTIVE_DAYS) {
          toast.error(`Bookings are limited to a maximum of ${MAX_CONSECUTIVE_DAYS} consecutive days.`);
          return;
        }
        setSelectedStart(start);
        setSelectedEnd(end);
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
        <Link href={portalLink("/portal")}>
          <Button variant="ghost" className="mt-4 text-stone-400">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const { property, rules, seasons, amenities, images } = data;
  // Never use a map as the hero image (maps are property_images with type 'map').
  const coverImage =
    property.coverImageUrl ??
    images?.find((img: any) => img.type === "cover")?.url ??
    images?.find((img: any) => img.type !== "map")?.url;

  const canBook = selectedStart && selectedEnd;
  const selectedDays = canBook ? daysBetween(selectedStart!, selectedEnd!) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Link href={portalLink("/portal")}>
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
                const capacity = propertyCapacity(property);
                return (
                  <div className="flex items-center gap-2 text-sm text-stone-300" data-testid="property-capacity">
                    <Users className="w-4 h-4 text-stone-500" />
                    {capacity !== null ? <>Capacity: <span className="text-stone-100 font-medium">{capacity}</span></> : "Capacity not specified"}
                  </div>
                );
              })()}
              {/* Gate code: the server only sends it to signed-in members who can view this property, and to staff */}
              {property.gateCode && (
                <div className="flex items-center gap-2 text-sm text-stone-300" data-testid="property-gate-code">
                  <KeyRound className="w-4 h-4 text-stone-500" />
                  Gate code: <span className="text-stone-100 font-medium font-mono tracking-wider">{property.gateCode}</span>
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
          {Array.isArray(property.displayActivities) && property.displayActivities.length > 0 && (
            <Card className="bg-stone-900 border-stone-700">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm text-stone-300">Available Activities</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {property.displayActivities.map((key: string) => (
                  <div key={key} className="text-sm text-stone-300">{activityLabel(key) ?? key}</div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Maps & Directions (hidden when the property has neither) */}
          {((property.maps?.length ?? 0) > 0 || property.directionsUrl) && (
            <Card className="bg-stone-900 border-stone-700" data-testid="maps-directions">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm text-stone-300">Maps &amp; Directions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {(property.maps?.length ?? 0) > 0 && (
                  <ul className="grid grid-cols-2 gap-2">
                    {property.maps.map((m: any, i: number) => {
                      const label = m.label || `Map ${i + 1}`;
                      return (
                        <li key={m.id ?? i}>
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block rounded-lg overflow-hidden border border-stone-700 hover:border-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                            aria-label={`Open ${label} full size`}
                          >
                            <div className="aspect-[4/3] bg-stone-800 flex items-center justify-center overflow-hidden">
                              {isPdfUrl(m.url) ? (
                                <div className="flex flex-col items-center gap-1 text-stone-400">
                                  <FileText className="w-8 h-8" />
                                  <span className="text-[10px] uppercase tracking-wider">PDF</span>
                                </div>
                              ) : (
                                <img src={m.url} alt={label} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs text-stone-300">
                              <span className="truncate">{label}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 text-stone-500" aria-hidden="true" />
                            </div>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {property.directionsUrl && (
                  <a
                    href={property.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-md bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium py-2.5 transition-colors"
                  >
                    <Navigation className="w-4 h-4" aria-hidden="true" />
                    Get Directions
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lodging Available */}
          {property.lodgingAvailable && (
            <Card className="bg-stone-900 border-stone-700">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm text-stone-300">Lodging</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Lodging available
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking rules — only the two approved rules */}
          <Card className="bg-stone-900 border-stone-700" data-testid="booking-rules">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm text-stone-300">Booking Rules</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 text-xs text-stone-400">
              {BOOKING_RULES.map((rule, i) => (
                <div key={rule} className="flex items-start gap-1.5">
                  {i === 0 ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" /> : <Calendar className="w-3.5 h-3.5 shrink-0 mt-px" />}
                  {rule}
                </div>
              ))}
            </CardContent>
          </Card>

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
              availMap={availMap}
              selectedSlot={activeSlot}
              viewYear={viewYear}
              viewMonth={viewMonth}
              onViewYearChange={setViewYear}
              onViewMonthChange={setViewMonth}
            />
          </div>

          {/* Selected range summary + book button */}
          {selectedStart && (
            <Card className="bg-stone-800 border-stone-700">
              <CardContent className="pt-4">
                {/* Check if selected slot is actually available for the selected date(s) */}
                {canBook && (() => {
                  // Validate that selected slot is available
                  let hasUnavailableSlot = false;
                  let d = new Date(selectedStart!);
                  const e = new Date(selectedEnd!);
                  const slotMap: Record<string, string> = { AM: "amStatus", PM: "pmStatus", AllDay: "allDayStatus", Overnight: "overnightStatus" };
                  const statusKey = slotMap[activeSlot];

                  while (d <= e) {
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    const avail = availMap.get(dateStr);
                    if (avail && (avail as any)[statusKey] === "full") {
                      hasUnavailableSlot = true;
                      break;
                    }
                    d.setDate(d.getDate() + 1);
                  }

                  return hasUnavailableSlot && (
                    <div className="mb-4 flex items-start gap-3 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">This slot is not available for the selected date(s).</p>
                        <p className="text-xs text-red-400 mt-1">Please select a different date or time slot.</p>
                      </div>
                    </div>
                  );
                })()}

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
                    {canBook && (() => {
                      let isBookable = true;
                      let d = new Date(selectedStart!);
                      const e = new Date(selectedEnd!);
                      const slotMap: Record<string, string> = { AM: "amStatus", PM: "pmStatus", AllDay: "allDayStatus", Overnight: "overnightStatus" };
                      const statusKey = slotMap[activeSlot];

                      while (d <= e) {
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                        const avail = availMap.get(dateStr);
                        if (avail && (avail as any)[statusKey] === "full") {
                          isBookable = false;
                          break;
                        }
                        d.setDate(d.getDate() + 1);
                      }

                      return (
                        <Button
                          size="sm"
                          onClick={() => setBookingOpen(true)}
                          disabled={!isBookable}
                          className="bg-amber-700 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Book {activeSlot === "AllDay" ? "All Day" : activeSlot}
                        </Button>
                      );
                    })()}
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
