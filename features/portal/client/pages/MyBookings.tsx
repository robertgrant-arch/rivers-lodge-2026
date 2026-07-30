/**
 * MyBookings — Member Portal
 * ===========================
 * Shows all of the current member's property bookings with status,
 * dates, and the ability to cancel upcoming bookings.
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from '@shared/lib/trpc';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@shared/ui/dialog';
import { Textarea } from '@shared/ui/textarea';
import { Label } from '@shared/ui/label';
import {
  Calendar, MapPin, Users, TreePine, AlertCircle, Loader2,
  CheckCircle2, XCircle, Clock, FileText, Plus,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toDateStr(d: string | Date | null | undefined): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().split("T")[0];
  if (typeof d === "string" && d.includes("T")) return d.split("T")[0];
  return String(d);
}
function formatDate(d: string | Date | null | undefined) {
  const s = toDateStr(d);
  if (!s) return "";
  const [y, m, day] = s.split("-");
  return `${MONTHS[parseInt(m) - 1]} ${parseInt(day)}, ${y}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_approval: {
    label: "Pending Approval",
    color: "bg-amber-900/30 text-amber-300 border-amber-700",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-emerald-900/30 text-emerald-300 border-emerald-700",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  checked_in: {
    label: "Checked In",
    color: "bg-blue-900/30 text-blue-300 border-blue-700",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  completed: {
    label: "Completed",
    color: "bg-stone-700/30 text-stone-300 border-stone-600",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-900/30 text-red-300 border-red-800",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  no_show: {
    label: "No Show",
    color: "bg-red-900/30 text-red-300 border-red-800",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const ACTIVITY_LABELS: Record<string, string> = {
  deer: "Deer Hunting", duck: "Duck Hunting", turkey: "Turkey Hunting",
  quail: "Quail Hunting", dove: "Dove Hunting", hog: "Hog Hunting",
  bass: "Bass Fishing", catfish: "Catfish Fishing", crappie: "Crappie Fishing",
  mixed_hunt: "Mixed Hunt", mixed_fish: "Mixed Fish", hunt_and_fish: "Hunt & Fish",
  scouting: "Scouting",
};

const TIME_SLOT_LABELS: Record<string, string> = {
  AM: "AM",
  PM: "PM",
  ALL_DAY: "All Day",
  OVERNIGHT: "Overnight",
};

// ─── Cancel Dialog ────────────────────────────────────────────────────────────

function CancelDialog({
  open,
  onClose,
  booking,
}: {
  open: boolean;
  onClose: () => void;
  booking: any;
}) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();

  const cancel = trpc.propertyBooking.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled successfully.");
      utils.propertyBooking.bookings.myBookings.invalidate();
      onClose();
    },
    onError: (err) => {
      toast.error(`Cancel failed: ${err.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-stone-100">Cancel Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-stone-300">
            Are you sure you want to cancel your booking at{" "}
            <span className="font-medium text-stone-100">{booking?.propertyName}</span>?
          </p>
          <div className="bg-stone-800 rounded-lg p-3 text-sm text-stone-400 space-y-1">
            <div>{formatDate(booking?.startDate)} – {formatDate(booking?.endDate)}</div>
            <div className="font-mono text-xs text-stone-500">Ref: {booking?.bookingRef}</div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-stone-300 text-sm">Reason (optional)</Label>
            <Textarea
              placeholder="Let us know why you're cancelling…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500 resize-none"
            />
          </div>
          <p className="text-xs text-amber-300">
            Please review the cancellation policy. Cancellations within 48 hours of the booking
            start date may result in a forfeit of your booking slot for the season.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={cancel.isPending} className="text-stone-400">
            Keep Booking
          </Button>
          <Button
            onClick={() => cancel.mutate({ id: booking.id, reason: reason || undefined })}
            disabled={cancel.isPending}
            className="bg-red-800 hover:bg-red-700 text-white"
          >
            {cancel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({ booking, onCancel }: { booking: any; onCancel: () => void }) {
  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending_approval;
  const today = new Date().toISOString().split("T")[0];
  const startStr = booking.startDate instanceof Date ? booking.startDate.toISOString().split("T")[0] : String(booking.startDate ?? "");
  const isUpcoming = startStr >= today;
  const canCancel = isUpcoming && ["pending_approval", "confirmed"].includes(booking.status);

  return (
    <Card className="bg-stone-900 border-stone-700 hover:border-stone-600 transition-colors">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            {/* Property name + ref */}
            <div className="flex items-start gap-2">
              <TreePine className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <Link href={`/portal/properties/${booking.propertyId}`}>
                  <span className="font-semibold text-stone-100 hover:text-amber-400 transition-colors cursor-pointer">
                    {booking.property?.name ?? booking.propertyName ?? "Property"}
                  </span>
                </Link>
                <div className="text-xs text-stone-500 font-mono mt-0.5">{booking.bookingRef}</div>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-1.5 text-sm text-stone-300">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              {formatDate(booking.startDate)}
              {booking.startDate !== booking.endDate && (
                <> <span className="text-stone-500">–</span> {formatDate(booking.endDate)}</>
              )}
            </div>

            {/* Activity + time slot + party */}
            <div className="flex flex-wrap gap-3 text-xs text-stone-400">
              <span>{ACTIVITY_LABELS[booking.activity] ?? booking.activity}</span>
              {booking.timeSlot && (
                <span>·</span>
              )}
              {booking.timeSlot && (
                <span>{TIME_SLOT_LABELS[booking.timeSlot] ?? booking.timeSlot}</span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {booking.partySize} {booking.partySize === 1 ? "person" : "people"}
              </span>
            </div>

            {/* Harvest report reminder */}
            {booking.status === "completed" && !booking.harvestReportSubmitted && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded px-2 py-1">
                <FileText className="w-3.5 h-3.5" />
                Harvest report due — please submit within 7 days
              </div>
            )}
          </div>

          {/* Status + actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>
              {statusCfg.icon}
              {statusCfg.label}
            </span>
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-xs text-red-400 hover:text-red-300 h-6 px-2"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabType = "upcoming" | "past" | "all";

export default function MyBookings() {
  const [tab, setTab] = useState<TabType>("upcoming");
  const [cancelTarget, setCancelTarget] = useState<any>(null);

  const { data, isLoading, error } = trpc.propertyBooking.bookings.myBookings.useQuery(
    {},
    { staleTime: 60 * 1000 },
  );

  // Get today's date in local timezone (YYYY-MM-DD, date-only, no time)
  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;

  const filtered = (data ?? []).filter((b: any) => {
    // Get booking end date in local timezone (YYYY-MM-DD, date-only, no time)
    let bEnd: string;
    if (b.endDate instanceof Date) {
      // Extract local date from Date object
      const d = b.endDate;
      bEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else {
      // String: strip time component ("2026-07-29T09:00:00Z" -> "2026-07-29")
      bEnd = String(b.endDate ?? "").split("T")[0];
    }

    if (tab === "upcoming") return bEnd >= today;
    if (tab === "past") return bEnd < today;
    return true;
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">My Bookings</h1>
          <p className="text-stone-400 mt-1 text-sm">Your hunting property reservations.</p>
        </div>
        <Link href="/portal/properties">
          <Button size="sm" className="bg-amber-700 hover:bg-amber-600 text-white gap-1.5">
            <Plus className="w-4 h-4" />
            Book a Property
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-800 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-stone-700 text-stone-100"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">Failed to load bookings. Please try again.</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <Calendar className="w-12 h-12 text-stone-600 mx-auto" />
          <div>
            <p className="text-stone-300 font-medium">No bookings found</p>
            <p className="text-stone-500 text-sm mt-1">
              {tab === "upcoming"
                ? "You have no upcoming reservations."
                : "No past bookings to show."}
            </p>
          </div>
          <Link href="/portal/properties">
            <Button size="sm" className="bg-amber-700 hover:bg-amber-600 text-white">
              Browse Properties
            </Button>
          </Link>
        </div>
      )}

      {/* Booking list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((b: any) => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={() => setCancelTarget(b)}
            />
          ))}
        </div>
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelDialog
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          booking={cancelTarget}
        />
      )}
    </div>
  );
}
