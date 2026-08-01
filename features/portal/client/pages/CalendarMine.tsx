import { useState, useMemo } from "react";
import { useAuth } from "@features/auth/public";
import { trpc } from "@shared/lib/trpc";
import PublicLayout from "@/components/PublicLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/ui/dialog";
import { X } from "lucide-react";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TIME_SLOT_LABELS: Record<string, string> = {
  AM: "AM",
  PM: "PM",
  ALL_DAY: "All Day",
  OVERNIGHT: "Overnight",
};

interface BookingForDay {
  id: number;
  propertyName: string;
  shortName: string;
  timeSlot: string;
  startDate: string;
  endDate: string;
  status: string;
  activity: string;
}

function getMiniLabel(bookings: BookingForDay[], dateStr: string): string | null {
  if (bookings.length === 0) return null;

  // Show most inclusive label
  const hasAllDay = bookings.some(b => b.timeSlot === "ALL_DAY");
  const hasOvernight = bookings.some(b => b.timeSlot === "OVERNIGHT");

  if (hasAllDay) {
    const b = bookings.find(b => b.timeSlot === "ALL_DAY");
    return `${b?.shortName || b?.propertyName} - All Day`;
  }

  if (hasOvernight) {
    const b = bookings.find(b => b.timeSlot === "OVERNIGHT");
    if (!b) return null;

    const [startY, startM, startD] = b.startDate.split('-').map(Number);
    const [endY, endM, endD] = b.endDate.split('-').map(Number);
    const [currY, currM, currD] = dateStr.split('-').map(Number);

    const start = new Date(startY, startM - 1, startD);
    const end = new Date(endY, endM - 1, endD);
    const curr = new Date(currY, currM - 1, currD);

    if (curr.getTime() === start.getTime()) {
      return `${b.shortName || b.propertyName} - Check-in`;
    } else if (curr.getTime() === end.getTime()) {
      return `${b.shortName || b.propertyName} - Check-out`;
    } else {
      return `${b.shortName || b.propertyName} - Full Day`;
    }
  }

  const hasAM = bookings.some(b => b.timeSlot === "AM");
  const hasPM = bookings.some(b => b.timeSlot === "PM");

  if (hasAM && hasPM) {
    const b = bookings[0];
    return `${b.shortName || b.propertyName} - AM & PM`;
  }

  if (hasAM) {
    const b = bookings.find(b => b.timeSlot === "AM");
    return `${b?.shortName || b?.propertyName} - AM`;
  }

  if (hasPM) {
    const b = bookings.find(b => b.timeSlot === "PM");
    return `${b?.shortName || b?.propertyName} - PM`;
  }

  return null;
}

function BookingDetail({ booking }: { booking: BookingForDay }) {
  const slotLabel = TIME_SLOT_LABELS[booking.timeSlot] || booking.timeSlot;
  let description = `${booking.propertyName} - ${slotLabel}`;

  return (
    <div className="space-y-2">
      <p className="text-white font-medium">{description}</p>
      <p className="text-white/60 text-sm">
        {booking.startDate}{booking.endDate !== booking.startDate ? ` – ${booking.endDate}` : ""}
      </p>
      <p className="text-white/50 text-xs">Status: {booking.status}</p>
    </div>
  );
}

function MiniCalendar({
  blockedDates,
  bookingsByDate,
  onBookingClick,
}: {
  blockedDates: string[];
  bookingsByDate: Map<string, BookingForDay[]>;
  onBookingClick: (booking: BookingForDay) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isBlocked = (day: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return blockedDates.includes(ds);
  };

  const getBookingsForDay = (day: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookingsByDate.get(ds) || [];
  };

  const isBooked = (day: number) => {
    return getBookingsForDay(day).length > 0;
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
          const bookings = day ? getBookingsForDay(day) : [];
          const miniLabel = day ? getMiniLabel(bookings, `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`) : null;
          const blocked = day ? isBlocked(day) : false;
          const booked = day ? isBooked(day) : false;
          const today_ = day ? isToday(day) : false;

          return (
            <div
              key={i}
              onClick={() => {
                if (booked && bookings.length > 0) {
                  onBookingClick(bookings[0]);
                }
              }}
              className={`aspect-square flex flex-col items-center justify-center text-[10px] font-sans rounded-sm transition-colors ${
                day === null
                  ? ""
                  : blocked
                  ? "bg-red-900/40 text-red-400 line-through cursor-not-allowed"
                  : booked
                  ? "bg-amber-900/40 text-amber-300 cursor-pointer hover:bg-amber-900/60"
                  : today_
                  ? "bg-white text-black font-semibold"
                  : "text-white/70 hover:bg-white/10 cursor-pointer"
              }`}
            >
              <span className="font-semibold">{day}</span>
              {miniLabel && (
                <span className="text-[8px] text-amber-300 truncate px-1 w-full text-center leading-tight mt-0.5">
                  {miniLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-[10px] font-sans text-white/40">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-900/40 border border-red-800" />Unavailable</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-900/40 border border-amber-800" />My Booking</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white" />Today</div>
      </div>
    </div>
  );
}

export default function CalendarMine() {
  const { user, isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [selectedBooking, setSelectedBooking] = useState<BookingForDay | null>(null);

  const memberStatus = trpc.membership.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const today = new Date();
  const year = today.getFullYear();
  const calendarEvents = trpc.portal.calendar.events.useQuery({
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  });
  const myBookings = trpc.propertyBooking.bookings.myBookings.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const bookingsByDate: Map<string, BookingForDay[]> = useMemo(() => {
    const map = new Map<string, BookingForDay[]>();
    const bookings = myBookings.data;
    if (!bookings) return map;

    const createLocalDate = (dateStr: string): Date => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    bookings.forEach((booking: any) => {
      const activeStatuses = ["pending_payment", "confirmed", "checked_in", "completed"];
      if (activeStatuses.includes(booking.status)) {
        let startStr = booking.startDate;
        let endStr = booking.endDate;

        if (startStr instanceof Date || typeof startStr === 'object') {
          startStr = startStr.toISOString ? startStr.toISOString().split('T')[0] : String(startStr).substring(0, 10);
        } else {
          startStr = String(startStr).substring(0, 10);
        }

        if (endStr instanceof Date || typeof endStr === 'object') {
          endStr = endStr.toISOString ? endStr.toISOString().split('T')[0] : String(endStr).substring(0, 10);
        } else {
          endStr = String(endStr).substring(0, 10);
        }

        const start = createLocalDate(startStr);
        const end = createLocalDate(endStr);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const bookingForDay: BookingForDay = {
            id: booking.id,
            propertyName: booking.property?.name || "Property",
            shortName: booking.property?.shortName || booking.property?.name || "Property",
            timeSlot: booking.timeSlot,
            startDate: startStr,
            endDate: endStr,
            status: booking.status,
            activity: booking.activity,
          };

          if (!map.has(dateStr)) {
            map.set(dateStr, []);
          }
          map.get(dateStr)!.push(bookingForDay);
        }
      }
    });

    return map;
  }, [myBookings.data]);

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
            <p className="eyebrow text-white/40 mb-4">Member Portal</p>
            <h1 className="font-serif text-4xl text-white mb-5">Membership required.</h1>
            <p className="text-base font-sans text-white/50 leading-relaxed mb-8">
              Your account is active but you don't have an active membership yet.
            </p>
            <a href="/membership#apply" className="btn-primary inline-flex items-center justify-center px-8 py-3.5">
              Apply for Membership
            </a>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const blockedDateStrings: string[] = (() => {
    const events = calendarEvents.data;
    if (!events) return [];

    const dates = new Set<string>();

    // Add weddings
    events.weddings?.forEach((w: any) => {
      const date = new Date(w.weddingDate);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      dates.add(dateStr);
    });

    // Add corporate events (range from arrival to departure)
    events.corporate?.forEach((c: any) => {
      const start = new Date(c.arrivalDate);
      const end = new Date(c.departureDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        dates.add(dateStr);
      }
    });

    // Add hunt/fish bookings
    events.huntFish?.forEach((h: any) => {
      const date = new Date(h.bookingDate);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      dates.add(dateStr);
    });

    // Add manually blocked dates (range from start to end)
    events.blocked?.forEach((b: any) => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        dates.add(dateStr);
      }
    });

    return Array.from(dates);
  })();

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="bg-[#2B2823] border-b border-white/8 pt-24 pb-8">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-white/40 mb-2">Member Portal</p>
                <h1 className="font-serif text-3xl md:text-4xl text-white mb-3">My Calendar</h1>
                <p className="text-sm font-sans text-white/40">Your personal bookings and estate availability.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────── */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="font-serif text-3xl text-white mb-2">My Calendar</h2>
              <p className="text-sm font-sans text-white/40 mb-6">Red dates indicate estate events or private closures. Amber dates show your confirmed bookings. Contact concierge for availability.</p>
              <MiniCalendar
                blockedDates={blockedDateStrings}
                bookingsByDate={bookingsByDate}
                onBookingClick={(booking) => setSelectedBooking(booking)}
              />
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
                <p className="text-[10px] tracking-[0.14em] uppercase font-sans text-[var(--gold)] mb-1">Plan Your Visit</p>
                <p className="text-xs font-sans text-white/50 leading-relaxed mb-3">Submit a stay request and our concierge will confirm availability within 24 hours.</p>
                <a href="/portal" className="text-[10px] font-sans text-[var(--gold)] hover:underline tracking-[0.1em] uppercase">
                  Back to Portal →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Booking Detail Modal ─────────────────────────────────── */}
        {selectedBooking && (
          <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
            <DialogContent className="bg-stone-900 border-stone-700 text-stone-100">
              <DialogHeader className="flex items-center justify-between">
                <DialogTitle className="text-stone-100">Booking Details</DialogTitle>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-stone-400 hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </DialogHeader>
              <BookingDetail booking={selectedBooking} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PublicLayout>
  );
}
