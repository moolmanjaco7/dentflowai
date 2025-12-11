// components/DashboardCalendar.js

import { useMemo, useState } from "react";

// ----------------------------
// Helpers
// ----------------------------
function pad(n) {
  return String(n).padStart(2, "0");
}

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function getMonthGrid(current) {
  const year = current.getFullYear();
  const month = current.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const firstDay = firstOfMonth.getDay(); // 0 = Sunday
  const offset = (firstDay + 6) % 7; // Monday = 0

  const start = new Date(year, month, 1 - offset);

  const weeks = [];
  let cursor = new Date(start);

  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ----------------------------
// Component
// ----------------------------
export default function DashboardCalendar({ appointments }) {
  const [viewMode, setViewMode] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selected, setSelected] = useState(null);

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  // Group by date key
  const grouped = useMemo(() => {
    const map = {};
    (appointments || []).forEach((a) => {
      if (!a.date) return;
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    return map;
  }, [appointments]);

  const monthWeeks = useMemo(() => getMonthGrid(currentDate), [currentDate]);

  const monthLabel = useMemo(
    () =>
      currentDate.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    [currentDate]
  );

  const weekDays = useMemo(() => {
    if (viewMode !== "week") return [];
    const d = new Date(currentDate);
    const weekday = (d.getDay() + 6) % 7; // Monday=0
    d.setDate(d.getDate() - weekday);

    const arr = [];
    for (let i = 0; i < 7; i++) {
      arr.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [viewMode, currentDate]);

  function goPrev() {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }

  function goNext() {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  // ----------------------------
  // Renderers
  // ----------------------------

  function renderStatusDot(status) {
    const s = (status || "").toLowerCase();
    let color = "bg-slate-500";
    if (s.includes("confirm")) color = "bg-emerald-500";
    if (s.includes("cancel")) color = "bg-rose-500";
    if (s.includes("pending")) color = "bg-amber-500";
    return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />;
  }

  function renderMonthView() {
    const monthIndex = currentDate.getMonth();

    return (
      <div className="space-y-2">
        {/* Week labels */}
        <div className="grid grid-cols-7 bg-slate-900 text-[11px] text-slate-400">
          {weekdayLabels.map((lbl) => (
            <div
              key={lbl}
              className="border border-slate-800 py-1 text-center font-medium"
            >
              {lbl}
            </div>
          ))}
        </div>

        {/* Month Cells */}
        <div className="grid grid-cols-7 bg-slate-900 border border-slate-800">
          {monthWeeks.map((week, wi) =>
            week.map((day, di) => {
              const dateKey = `${day.getFullYear()}-${pad(
                day.getMonth() + 1
              )}-${pad(day.getDate())}`;
              const appts = grouped[dateKey] || [];
              const isToday = dateKey === todayKey;
              const inMonth = day.getMonth() === monthIndex;

              return (
                <div
                  key={`${wi}-${di}`}
                  className={`min-h-[90px] p-1 border border-slate-900 ${
                    inMonth ? "bg-slate-950" : "bg-slate-950/60 text-slate-500"
                  } ${isToday ? "ring-1 ring-emerald-500/70" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        isToday
                          ? "bg-emerald-500 text-slate-950 font-semibold"
                          : "text-slate-300"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {appts.length > 0 && (
                      <span className="text-[9px] text-slate-500">
                        {appts.length} appts
                      </span>
                    )}
                  </div>

                  {appts.slice(0, 3).map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 rounded-md px-1 py-0.5 cursor-pointer mb-0.5"
                      onClick={() => setSelected(appt)}
                    >
                      {renderStatusDot(appt.status)}
                      <span className="text-[10px] text-slate-100 truncate">
                        {appt.startTime} • {appt.patientName}
                      </span>
                    </div>
                  ))}

                  {appts.length > 3 && (
                    <span className="text-[9px] text-slate-500">
                      + {appts.length - 3} more…
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    if (weekDays.length === 0) return null;

    return (
      <div className="border border-slate-800 bg-slate-900 rounded-xl">
        <div className="grid grid-cols-7 text-[11px] text-slate-400 border-b border-slate-800">
          {weekDays.map((day) => {
            const dateKey = `${day.getFullYear()}-${pad(
              day.getMonth() + 1
            )}-${pad(day.getDate())}`;
            const isToday = dateKey === todayKey;

            return (
              <div
                key={dateKey}
                className={`px-2 py-2 border-r border-slate-800 ${
                  isToday ? "bg-slate-950" : ""
                }`}
              >
                <div className="flex justify-between mb-1">
                  <span className="text-slate-200 font-medium">
                    {day.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {isToday && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-300">
                      Today
                    </span>
                  )}
                </div>

                {(grouped[dateKey] || []).map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-1 bg-slate-950 hover:bg-slate-800 rounded px-1.5 py-1 mb-1 cursor-pointer text-[10px]"
                    onClick={() => setSelected(appt)}
                  >
                    {renderStatusDot(appt.status)}
                    <span className="truncate text-slate-100">
                      {appt.startTime} • {appt.patientName}
                    </span>
                  </div>
                ))}

                {(grouped[dateKey] || []).length === 0 && (
                  <p className="text-[10px] text-slate-500">No appointments</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
      {/* Calendar */}
      <section className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-slate-400">Calendar</p>
            <p className="text-sm font-semibold text-slate-50">{monthLabel}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex border border-slate-700 bg-slate-900 rounded-md p-0.5 text-[11px]">
              <button
                className={`px-2 py-1 rounded ${
                  viewMode === "month"
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400"
                }`}
                onClick={() => setViewMode("month")}
              >
                Month
              </button>
              <button
                className={`px-2 py-1 rounded ${
                  viewMode === "week"
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400"
                }`}
                onClick={() => setViewMode("week")}
              >
                Week
              </button>
            </div>

            <div className="inline-flex items-center gap-1 text-[11px]">
              <button
                onClick={goPrev}
                className="px-2 py-1 border border-slate-700 rounded text-slate-200 hover:border-slate-500"
              >
                ◀
              </button>
              <button
                onClick={goToday}
                className="px-2 py-1 border border-slate-700 rounded text-slate-200 hover:border-slate-500"
              >
                Today
              </button>
              <button
                onClick={goNext}
                className="px-2 py-1 border border-slate-700 rounded text-slate-200 hover:border-slate-500"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        {viewMode === "month" ? renderMonthView() : renderWeekView()}
      </section>

      {/* Appointment Details */}
      <aside className="p-4 rounded-xl border border-slate-800 bg-slate-950/80">
        <p className="text-[11px] font-semibold text-slate-100 mb-2">
          Appointment details
        </p>

        {!selected && (
          <p className="text-[11px] text-slate-400">
            Click an appointment on the calendar to view details here.
          </p>
        )}

        {selected && (
          <div className="space-y-2 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-300">
            <p className="text-sm font-semibold text-slate-50">
              {selected.patientName}
            </p>

            <p>
              <span className="text-slate-400">Date: </span>
              {(() => {
                const d = parseDateKey(selected.date);
                return d.toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
              })()}
            </p>

            <p>
              <span className="text-slate-400">Time: </span>
              {selected.startTime}{" "}
              {selected.endTime ? `– ${selected.endTime}` : ""}
            </p>

            {selected.practitionerName && (
              <p>
                <span className="text-slate-400">Practitioner: </span>
                {selected.practitionerName}
              </p>
            )}

            {selected.status && (
              <p>
                <span className="text-slate-400">Status: </span>
                {selected.status}
              </p>
            )}

            {selected.notes && (
              <p className="mt-2">
                <span className="text-slate-400">Notes: </span>
                {selected.notes}
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
