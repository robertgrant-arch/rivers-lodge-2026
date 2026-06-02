import { useState, useMemo } from "react";
import { trpc } from '@shared/lib/trpc';

interface Props {
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
  className?: string;
  showLegend?: boolean;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AvailabilityCalendar({
  onDateSelect,
  selectedDate,
  className = "",
  showLegend = true,
}: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-indexed

  const { data: blockedDates = [] } = trpc.booking.public.getBlockedDates.useQuery(
    { year: viewYear, month: viewMonth },
    { staleTime: 5 * 60_000 }
  );

  const blockedSet = useMemo(() => {
    const s = new Set<string>();
    for (const bd of blockedDates) {
      // bd.date may be a Date object or string
      const d = bd.date instanceof Date ? bd.date : new Date(bd.date);
      s.add(d.toISOString().split("T")[0]);
    }
    return s;
  }, [blockedDates]);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const todayStr = today.toISOString().split("T")[0];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  const isPast = (day: number) => {
    const d = new Date(viewYear, viewMonth - 1, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date(today);
    t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const dateStr = (day: number) =>
    `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className={`select-none ${className}`}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10 hover:border-white/25"
          aria-label="Previous month"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h3 className="font-serif text-lg text-white">
          {MONTHS[viewMonth - 1]} {viewYear}
        </h3>

        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10 hover:border-white/25"
          aria-label="Next month"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[9px] tracking-[0.14em] uppercase font-sans text-white/25 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const ds = dateStr(day);
          const isBlocked = blockedSet.has(ds);
          const isToday = ds === todayStr;
          const isPastDay = isPast(day);
          const isSelected = ds === selectedDate;
          const isSelectable = !isBlocked && !isPastDay && !!onDateSelect;

          return (
            <button
              key={ds}
              disabled={isBlocked || isPastDay || !onDateSelect}
              onClick={() => isSelectable && onDateSelect?.(ds)}
              className={`
                relative aspect-square flex items-center justify-center text-xs font-sans transition-colors
                ${isSelected
                  ? "bg-[var(--gold)] text-[oklch(0.12_0.015_66)] font-medium"
                  : isBlocked
                  ? "bg-white/4 text-white/15 cursor-not-allowed"
                  : isPastDay
                  ? "text-white/15 cursor-default"
                  : isSelectable
                  ? "text-white/70 hover:bg-white/8 hover:text-white cursor-pointer"
                  : "text-white/70"
                }
                ${isToday && !isSelected ? "ring-1 ring-inset ring-white/20" : ""}
              `}
              title={isBlocked ? "Not available" : isToday ? "Today" : undefined}
            >
              {day}
              {isBlocked && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/20" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-5 mt-5 pt-4 border-t border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[var(--gold)]" />
            <span className="text-[9px] tracking-[0.12em] uppercase font-sans text-white/40">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white/8 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-white/25 block" />
            </div>
            <span className="text-[9px] tracking-[0.12em] uppercase font-sans text-white/40">Not Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 ring-1 ring-white/20" />
            <span className="text-[9px] tracking-[0.12em] uppercase font-sans text-white/40">Today</span>
          </div>
        </div>
      )}
    </div>
  );
}
