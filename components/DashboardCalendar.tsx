// components/dashboard/DashboardCalendar.tsx
import React, { useMemo, useState } from "react";

export type CalendarAppointment = {
  id: string | number;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime?: string;
  patientName: string;
  practitionerName?: string;
  status?: string;
};

type ViewMode = "month" | "week";

type Props = {
  appointments: CalendarAppointment[];
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseDate(dateStr: string) {
  // Expect "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDateKey(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day + 6) % 7; // convert to Mon=0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export default function DashboardCalendar({ appointments }: Props) {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const todayKey = formatDateKey(new Date());

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    for (const appt of appointments) {
      if (!map[appt.date]) map[appt.date] = [];
      map[appt.date].push(appt);
    }
    // sort by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [appointments]);

  const monthGrid = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const startWeek = startOfWeek(start);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(startWeek, i)); // 6 weeks x 7 days
    }
    return { days, start, end };
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return { start, days };
  }, [currentDate]);

  const handlePrev = () => {
    if (view === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
    } else {
      setCurrentDate(addDays(currentDate, -7));
    }
  };

  const handleNext = () => {
    if (view === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
    } else {
      setCurrentDate(addDays(currentDate, 7));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthLabel = currentDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-slate-50">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-sm hover:border-slate-500"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium hover:border-slate-500"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-sm hover:border-slate-500"
          >
            ›
          </button>
          <div className="ml-2 text-sm font-semibold">{monthLabel}</div>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 p-1 text-xs">
          <button
            type="button"
            onClick={() => setView("month")}
            className={`flex-1 rounded px-2 py-1 ${
              view === "month"
                ? "bg-slate-200 text-slate-900"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setView("week")}
            className={`flex-1 rounded px-2 py-1 ${
              view === "week"
                ? "bg-slate-200 text-slate-900"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {view === "month" ? (
        <MonthView
          days={monthGrid.days}
          monthStart={monthGrid.start}
          appointmentsByDate={appointmentsByDate}
          todayKey={todayKey}
        />
      ) : (
        <WeekView
          days={weekDays.days}
          appointmentsByDate={appointmentsByDate}
          todayKey={todayKey}
        />
      )}
    </div>
  );
}

function MonthView({
  days,
  monthStart,
  appointmentsByDate,
  todayKey,
}: {
  days: Date[];
  monthStart: Date;
  appointmentsByDate: Record<string, CalendarAppointment[]>;
  todayKey: string;
}) {
  const currentMonth = monthStart.getMonth();

  return (
    <div>
      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-px text-center text-[11px] font-medium text-slate-400">
        {weekdayLabels.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg border border-slate-800 bg-slate-900">
        {days.map((date) => {
          const key = formatDateKey(date);
          const isToday = key === todayKey;
          const isCurrentMonth = date.getMonth() === currentMonth;
          const appts = appointmentsByDate[key] || [];

          return (
            <div
              key={key}
              className={`min-h-[80px] border border-slate-800 bg-slate-950/80 p-1.5 text-[11px] ${
                !isCurrentMonth ? "bg-slate-900/60 text-slate-500" : ""
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                    isToday
                      ? "bg-emerald-500 text-slate-950 font-semibold"
                      : "text-slate-300"
                  }`}
                >
                  {date.getDate()}
                </span>
                {appts.length > 0 && (
                  <span className="rounded-full bg-slate-800 px-2 text-[10px] text-slate-200">
                    {appts.length}
                  </span>
                )}
              </div>

              <div className="space-y-0.5">
                {appts.slice(0, 3).map((appt) => (
                  <div
                    key={appt.id}
                    className="truncate rounded bg-slate-800/90 px-1 py-0.5 text-[10px] text-slate-100"
                  >
                    <span className="font-medium">{appt.startTime}</span>{" "}
                    • {appt.patientName}
                  </div>
                ))}
                {appts.length > 3 && (
                  <div className="text-[10px] text-slate-400">
                    +{appts.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  days,
  appointmentsByDate,
  todayKey,
}: {
  days: Date[];
  appointmentsByDate: Record<string, CalendarAppointment[]>;
  todayKey: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto text-[11px] text-slate-300">
        {days.map((date, idx) => {
          const key = formatDateKey(date);
          const isToday = key === todayKey;
          const appts = appointmentsByDate[key] || [];

          const label = date.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });

          return (
            <div
              key={key}
              className="min-w-[180px] flex-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium">
                    {weekdayLabels[idx]}
                  </div>
                  <div className="text-[11px] text-slate-400">{label}</div>
                </div>
                {isToday && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    Today
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {appts.length === 0 && (
                  <div className="rounded border border-dashed border-slate-700 bg-slate-900/60 px-2 py-4 text-center text-[11px] text-slate-500">
                    No appointments
                  </div>
                )}

                {appts.map((appt) => (
                  <div
                    key={appt.id}
                    className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-50">
                        {appt.startTime}
                        {appt.endTime ? `–${appt.endTime}` : ""}
                      </span>
                      {appt.status && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] text-slate-300">
                          {appt.status}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-slate-200">
                      {appt.patientName}
                    </div>
                    {appt.practitionerName && (
                      <div className="text-[10px] text-slate-400">
                        {appt.practitionerName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
