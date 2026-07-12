import { useState } from "react";
import { trpc } from "@shared/lib/trpc";
import { toast } from "sonner";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function MiniCalendar({ dates, title }: { dates: string[]; title: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isBooked = (day: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dates.includes(ds);
  };

  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div>
      <h3 className="font-serif text-xl text-white mb-4">{title}</h3>
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
              isBooked(day) ? "bg-blue-900/40 text-blue-400 cursor-pointer" :
              isToday(day) ? "bg-white text-black font-semibold" :
              "text-white/70 hover:bg-white/10 cursor-pointer"
            }`}>
              {day}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-[10px] font-sans text-white/40">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-900/40 border border-blue-800" />Booked</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white" />Today</div>
        </div>
      </div>
    </div>
  );
}

export function CalendarTabs() {
  const [activeTab, setActiveTab] = useState<"my" | "master" | "properties">("my");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  const myBookings = trpc.booking.bookings.myBookings.useQuery(undefined, {
    staleTime: 60000,
  });

  const masterCalendar = trpc.booking.bookings.masterCalendarView.useQuery(undefined, {
    staleTime: 60000,
    retry: false,
  });

  const accessibleProperties = trpc.booking.bookings.accessibleProperties.useQuery(undefined, {
    staleTime: 60000,
  });

  const propertyCalendar = trpc.booking.bookings.propertyCalendarView.useQuery(
    { propertyId: selectedPropertyId ?? 0 },
    {
      staleTime: 60000,
      enabled: selectedPropertyId !== null,
      retry: false,
    }
  );

  const masterAccessible = !masterCalendar.isError;
  const properties = accessibleProperties.data ?? [];

  // Auto-select first accessible property if none selected
  if (properties.length > 0 && selectedPropertyId === null) {
    setTimeout(() => setSelectedPropertyId(properties[0].id), 0);
  }

  const myBookingDates = (myBookings.data ?? []).map((b: any) => {
    const date = new Date(b.startDate);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });

  const masterBookingDates = (masterCalendar.data ?? []).map((b: any) => {
    const date = new Date(b.startDate);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });

  const propertyBookingDates = (propertyCalendar.data ?? []).map((b: any) => {
    const date = new Date(b.startDate);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });

  return (
    <div>
      <div className="flex gap-2 mb-8 border-b border-white/8">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-3 text-sm font-sans tracking-[0.08em] uppercase transition-colors ${
            activeTab === "my"
              ? "border-b-2 border-[var(--gold)] text-white"
              : "text-white/50 hover:text-white"
          }`}
        >
          My Calendar
        </button>
        {masterAccessible && (
          <button
            onClick={() => setActiveTab("master")}
            className={`px-4 py-3 text-sm font-sans tracking-[0.08em] uppercase transition-colors ${
              activeTab === "master"
                ? "border-b-2 border-[var(--gold)] text-white"
                : "text-white/50 hover:text-white"
            }`}
          >
            Master Calendar
          </button>
        )}
        <button
          onClick={() => setActiveTab("properties")}
          className={`px-4 py-3 text-sm font-sans tracking-[0.08em] uppercase transition-colors ${
            activeTab === "properties"
              ? "border-b-2 border-[var(--gold)] text-white"
              : "text-white/50 hover:text-white"
          }`}
        >
          Property Calendars
        </button>
      </div>

      {activeTab === "my" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <MiniCalendar dates={myBookingDates} title="My Bookings" />
          <div>
            <h3 className="font-serif text-xl text-white mb-4">Your Reservations</h3>
            {myBookings.isLoading ? (
              <p className="text-white/40">Loading...</p>
            ) : (myBookings.data ?? []).length === 0 ? (
              <p className="text-white/40">No bookings yet. Ready to book an adventure?</p>
            ) : (
              <div className="flex flex-col gap-4">
                {(myBookings.data ?? []).map((booking: any) => (
                  <div key={booking.id} className="border border-white/8 bg-[#2B2823] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-sans font-medium text-white">{booking.activity}</p>
                        <p className="text-xs font-sans text-white/40">
                          {new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-[9px] tracking-[0.12em] uppercase font-sans px-2 py-1 bg-green-400/10 text-green-400">
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "master" && masterAccessible && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <MiniCalendar dates={masterBookingDates} title="All Estate Bookings" />
          <div>
            <h3 className="font-serif text-xl text-white mb-4">Estate Activity</h3>
            {masterCalendar.isLoading ? (
              <p className="text-white/40">Loading...</p>
            ) : (masterCalendar.data ?? []).length === 0 ? (
              <p className="text-white/40">No bookings at the estate.</p>
            ) : (
              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto">
                {(masterCalendar.data ?? []).slice(0, 20).map((booking: any) => (
                  <div key={booking.id} className="border border-white/8 bg-[#2B2823] p-3">
                    <p className="text-xs font-sans text-white/60">{booking.activity}</p>
                    <p className="text-xs font-sans text-white/40">
                      {new Date(booking.startDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "properties" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h3 className="font-serif text-lg text-white mb-4">Select Property</h3>
            {accessibleProperties.isLoading ? (
              <p className="text-white/40 text-sm">Loading properties...</p>
            ) : properties.length === 0 ? (
              <p className="text-white/40 text-sm">No accessible properties at this time.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {properties.map((prop: any) => (
                  <button
                    key={prop.id}
                    onClick={() => setSelectedPropertyId(prop.id)}
                    className={`px-4 py-3 text-left text-sm font-sans transition-colors ${
                      selectedPropertyId === prop.id
                        ? "bg-[var(--gold)]/20 border border-[var(--gold)] text-white"
                        : "border border-white/8 text-white/60 hover:text-white"
                    }`}
                  >
                    {prop.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPropertyId && (
            <div className="lg:col-span-2">
              {propertyCalendar.isLoading ? (
                <p className="text-white/40">Loading calendar...</p>
              ) : propertyCalendar.isError ? (
                <p className="text-white/40">No calendar data available.</p>
              ) : (
                <MiniCalendar dates={propertyBookingDates} title="Property Bookings" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
