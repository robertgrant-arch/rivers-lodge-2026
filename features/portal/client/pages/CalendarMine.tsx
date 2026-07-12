import { useState } from "react";
import { useAuth } from "@features/auth/public";
import { trpc } from "@shared/lib/trpc";
import PublicLayout from "@/components/PublicLayout";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function MiniCalendar({ blockedDates }: { blockedDates: string[] }) {
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
        {cells.map((day, i) => (
          <div key={i} className={`aspect-square flex items-center justify-center text-xs font-sans rounded-sm transition-colors ${
            day === null ? "" :
            isBlocked(day) ? "bg-red-900/40 text-red-400 line-through cursor-not-allowed" :
            isToday(day) ? "bg-white text-black font-semibold" :
            "text-white/70 hover:bg-white/10 cursor-pointer"
          }`}>
            {day}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 text-[10px] font-sans text-white/40">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-900/40 border border-red-800" />Unavailable</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white" />Today</div>
      </div>
    </div>
  );
}

export default function CalendarMine() {
  const { user, isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: true,
  });

  const memberStatus = trpc.membership.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const today = new Date();
  const year = today.getFullYear();
  const calendarEvents = trpc.portal.calendar.events.useQuery({
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  });

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
              <h2 className="font-serif text-3xl text-white mb-2">Estate Calendar</h2>
              <p className="text-sm font-sans text-white/40 mb-6">Red dates indicate estate events or private closures. Contact concierge for availability.</p>
              <MiniCalendar blockedDates={blockedDateStrings} />
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
      </div>
    </PublicLayout>
  );
}
