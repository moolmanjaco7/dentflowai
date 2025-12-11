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

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

function statusColor(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("confirm")) return "bg-emerald-500";
  if (s.includes("cancel")) return "bg-rose-500";
  if (s.includes("pending") || s.includes("tentative")) return "bg-amber-500";
  return "bg-slate-500";
}

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

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    (appointments || []).forEach((a) => {
      if (!a.date) return;
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    // Sort in each day by time
    Object.values(map).forEach((list) => {
      list.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
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
  // Render pieces
  // ----------------------------
  function renderStatusDot(status) {
    return (
      <span className={`h-1.5 w-1.5 rounded-full ${statusColor(status)}`} />
    );
  }

  function renderMonthView() {
    const monthIndex = currentDate.getMonth();

    return (
      <div className="space-y-2">
        {/* Week labels */}
        <div className="grid grid-cols-7 rounded-t-lg bg-slate-950 text-[10px] text-slate-400">
          {weekdayLabels.map((lbl) => (
            <div
              key={lbl}
              className="border border-slate-800 py-1 text-center font-medium uppercase tracking-wide"
            >
              {lbl}
            </div>
          ))}
        </div>

        {/* Month Cells */}
        <div className="grid grid-cols-7 rounded-b-lg border border-slate-800 bg-slate-950">
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
                  className={`min-h-[80px] p-1.5 border border-slate-900 flex flex-col gap-1 ${
                    inMonth ? "bg-slate-950" : "bg-slate-950/60 text-slate-500"
                  } ${isToday ? "ring-1 ring-emerald-500/70" : ""}`}
                >
                  {/* Date heading */}
                  <div className="flex items-center justify-between">
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
                        {appts.length} appt{appts.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Appointments in cell */}
                  <div className="flex flex-col gap-0.5">
                    {appts.slice(0, 3).map((appt) => (
                      <button
                        key={appt.id}
                        type="button"
                        className="group flex items-center gap-1 rounded-md bg-slate-900/90 px-1 py-0.5 text-left hover:bg-slate-800"
                        onClick={() => setSelected(appt)}
                      >
                        {/* Initials pill */}
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[9px] font-semibold text-slate-50">
                          {getInitials(appt.patientName)}
                        </span>

                        <div className="flex-1 truncate">
                          <div className="flex items-center gap-1 text-[10px] text-slate-100">
                            <span>{appt.startTime || "Time"}</span>
                            <span className="text-slate-500">•</span>
                            <span className="truncate text-slate-300">
                              {appt.patientName || "Patient"}
                            </span>
                          </div>
                          {appt.practitionerName && (
                            <div className="truncate text-[9px] text-slate-500">
                              {appt.practitionerName}
                            </div>
                          )}
                        </div>

                        {/* Status dot */}
                        {renderStatusDot(appt.status)}
                      </button>
                    ))}

                    {appts.length > 3 && (
                      <span className="text-[9px] text-slate-500">
                        + {appts.length - 3} more…
                      </span>
                    )}
                  </div>
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
      <div className="rounded-xl border border-slate-800 bg-slate-950">
        <div className="grid grid-cols-7 border-b border-slate-800 text-[11px] text-slate-400">
          {weekDays.map((day) => {
            const dateKey = `${day.getFullYear()}-${pad(
              day.getMonth() + 1
            )}-${pad(day.getDate())}`;
            const isToday = dateKey === todayKey;
            const appts = grouped[dateKey] || [];

            return (
              <div
                key={dateKey}
                className={`border-r border-slate-800 px-2 py-2 last:border-r-0 ${
                  isToday ? "bg-slate-950" : ""
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-200">
                    {day.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {appts.map((appt) => (
                    <button
                      key={appt.id}
                      type="button"
                      className="flex w-full items-center gap-1 rounded-md bg-slate-950 px-1.5 py-1 text-left text-[10px] text-slate-100 hover:bg-slate-800"
                      onClick={() => setSelected(appt)}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[9px] font-semibold text-slate-50">
                        {getInitials(appt.patientName)}
                      </span>
                      {renderStatusDot(appt.status)}
                      <div className="flex-1 truncate">
                        <div className="truncate">
                          {appt.startTime || "Time"}{" "}
                          {appt.patientName && (
                            <span className="text-slate-400">
                              • {appt.patientName}
                            </span>
                          )}
                        </div>
                        {appt.practitionerName && (
                          <div className="truncate text-[9px] text-slate-500">
                            {appt.practitionerName}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}

                  {appts.length === 0 && (
                    <p className="text-[10px] text-slate-500">
                      No appointments
                    </p>
                  )}
                </div>
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
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        {/* Header */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] text-slate-400">Calendar</p>
            <p className="text-sm font-semibold text-slate-50">
              {monthLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-700 bg-slate-900 p-0.5 text-[11px]">
              <button
                type="button"
                className={`rounded px-2 py-1 ${
                  viewMode === "month"
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400"
                }`}
                onClick={() => setViewMode("month")}
              >
                Month
              </button>
              <button
                type="button"
                className={`rounded px-2 py-1 ${
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
                type="button"
                onClick={goPrev}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 hover:border-slate-500"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={goToday}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 hover:border-slate-500"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 hover:border-slate-500"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        {viewMode === "month" ? renderMonthView() : renderWeekView()}

        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>Cancelled</span>
          </div>
        </div>
      </section>

      {/* Appointment Details */}
      <aside className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-200">
        <p className="text-[11px] font-semibold text-slate-100">
          Appointment details
        </p>

        {!selected && (
          <p className="text-[11px] text-slate-400">
            Click an appointment on the calendar to view details here.
          </p>
        )}

        {selected && (
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-50">
                {getInitials(selected.patientName)}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-50">
                  {selected.patientName || "Patient"}
                </p>
                {selected.practitionerName && (
                  <p className="text-[11px] text-slate-400">
                    With {selected.practitionerName}
                  </p>
                )}
              </div>
              {selected.status && (
                <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-200">
                  {selected.status}
                </span>
              )}
            </div>

            <div className="space-y-1 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-400">Date: </span>
                <span>
                  {selected.date &&
                    (() => {
                      const d = parseDateKey(selected.date);
                      return d.toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                    })()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Time: </span>
                <span>
                  {selected.startTime || "—"}
                  {selected.endTime ? `–${selected.endTime}` : ""}
                </span>
              </div>
            </div>

            {selected.notes && (
              <div className="mt-1 rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-300">
                <span className="text-slate-400">Notes: </span>
                <span>{selected.notes}</span>
              </div>
            )}

            <p className="mt-2 text-[10px] text-slate-500">
              Later we can link this panel to a full patient profile or add
              quick actions like reschedule / cancel.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
