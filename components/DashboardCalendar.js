// components/DashboardCalendar.js
import React, { useMemo } from "react";

function toKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function addMonths(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  d.setDate(1);
  return d;
}

function monthTitle(date) {
  return date.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

function startOfMonthGrid(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = d.getDay(); // Sun=0
  const mondayIndex = (day + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - mondayIndex);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function statusBadgeClass(appt) {
  const status = (appt?.status || "").toLowerCase();
  const conf = (appt?.confirmation_status || "").toLowerCase();

  if (status === "cancelled" || conf === "cancelled") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (status === "completed") return "border-slate-600 bg-slate-900/40 text-slate-200";
  if (status === "confirmed" || conf === "confirmed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200"; // booked/unconfirmed
}

export default function DashboardCalendar({
  appointments = [],
  monthKey,
  onChangeMonthKey,
  selectedDateKey,
  onSelectDateKey,
  onSelectAppointment,
}) {
  const monthDate = useMemo(() => fromKey(monthKey || toKey(new Date())), [monthKey]);
  const gridStart = useMemo(() => startOfMonthGrid(monthDate), [monthDate]);

  const apptsByDay = useMemo(() => {
    const map = new Map();
    for (const a of appointments || []) {
      const starts = a?.starts_at || a?.start || a?.startsAt;
      const k = toKey(starts);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(a);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((x, y) => new Date(x.starts_at).getTime() - new Date(y.starts_at).getTime());
      map.set(k, arr);
    }
    return map;
  }, [appointments]);

  const days = useMemo(() => {
    const out = [];
    const d = new Date(gridStart);
    for (let i = 0; i < 42; i++) {
      out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [gridStart]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-[12px] text-slate-400">Calendar</p>
          <p className="text-[14px] font-semibold text-slate-100">{monthTitle(monthDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeMonthKey(toKey(addMonths(monthDate, -1)))}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
          >
            Prev
          </button>
          <button
            onClick={() => onChangeMonthKey(toKey(addMonths(monthDate, 1)))}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/40">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-3 py-2 text-[11px] text-slate-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((d) => {
          const k = toKey(d);
          const isSelected = k === selectedDateKey;
          const inMonth = sameMonth(d, monthDate);
          const list = apptsByDay.get(k) || [];
          const show = list.slice(0, 3);
          const more = list.length - show.length;

          return (
            <div
              key={k}
              className={`min-h-[92px] border-t border-slate-900/60 border-r border-slate-900/60 p-2 ${
                inMonth ? "bg-slate-950/40" : "bg-slate-950/20 opacity-70"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectDateKey(k)}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] ${
                  isSelected
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border border-transparent text-slate-300 hover:bg-slate-900/40"
                }`}
              >
                <span className="font-semibold">{d.getDate()}</span>
                {list.length > 0 && (
                  <span className="rounded-full border border-slate-700 bg-slate-950/40 px-2 py-[1px] text-[10px] text-slate-200">
                    {list.length}
                  </span>
                )}
              </button>

              <div className="mt-2 space-y-1">
                {show.map((a) => {
                  const patientName =
                    a?.patient?.full_name ||
                    a?.patient_name ||
                    a?.full_name ||
                    a?.patient_full_name ||
                    "Patient";

                  const start = a?.starts_at || a?.start || a?.startsAt;
                  const t = new Date(start);
                  const time = Number.isNaN(t.getTime())
                    ? ""
                    : t.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <button
                      key={a?.id || `${start}_${patientName}`}
                      type="button"
                      onClick={() => onSelectAppointment(a)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-left text-[11px] text-slate-200 hover:border-slate-600"
                      title={patientName}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-950/40 text-[10px] shrink-0">
                            {initials(patientName)}
                          </span>
                          <span className="text-slate-400 shrink-0">{time}</span>
                        </div>

                        <span className={`rounded-full border px-2 py-[1px] text-[10px] ${statusBadgeClass(a)}`}>
                          {((a?.status || "booked") === "confirmed" || (a?.confirmation_status || "") === "confirmed")
                            ? "confirmed"
                            : (a?.status || "booked")}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {more > 0 && <div className="text-[10px] text-slate-500 px-2">+{more} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
