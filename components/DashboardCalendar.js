// components/DashboardCalendar.js
import { useMemo } from "react";

function toKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromKey(key) {
  const [y, m, d] = String(key || "").split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt;
}

function monthStartFromKey(monthKey) {
  const dt = fromKey(monthKey);
  return new Date(dt.getFullYear(), dt.getMonth(), 1);
}

function addMonths(dt, delta) {
  return new Date(dt.getFullYear(), dt.getMonth() + delta, 1);
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function normalize(s) {
  return String(s || "").toLowerCase().trim();
}

function statusTone(appt) {
  const status = normalize(appt?.status);
  const conf = normalize(appt?.confirmation_status);

  if (status === "cancelled" || conf === "cancelled") return { label: "cancelled", tone: "rose" };
  if (status === "completed") return { label: "completed", tone: "slate" };
  if (status === "no_show") return { label: "no-show", tone: "violet" };
  if (status === "confirmed" || conf === "confirmed") return { label: "confirmed", tone: "emerald" };
  return { label: "booked", tone: "amber" };
}

function chipClass(tone) {
  if (tone === "rose") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (tone === "emerald") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (tone === "violet") return "border-violet-500/30 bg-violet-500/10 text-violet-200";
  if (tone === "slate") return "border-slate-700 bg-slate-900/40 text-slate-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

function isSameDayKey(aKey, bKey) {
  return String(aKey || "") === String(bKey || "");
}

function getPatientName(a) {
  return (
    a?.patient?.full_name ||
    a?.patient_name ||
    a?.full_name ||
    a?.patient_full_name ||
    "Patient"
  );
}

export default function DashboardCalendar({
  appointments = [],
  monthKey,
  onChangeMonthKey,
  selectedDateKey,
  onSelectDateKey,
  onSelectAppointment,
}) {
  const start = useMemo(() => monthStartFromKey(monthKey || toKey(new Date())), [monthKey]);

  const monthLabel = useMemo(() => {
    return start.toLocaleDateString("en-ZA", { year: "numeric", month: "long" });
  }, [start]);

  // Build a 6-week grid (42 days)
  const gridDays = useMemo(() => {
    const first = new Date(start);
    const dow = first.getDay(); // 0 Sun .. 6 Sat
    const mondayIndex = (dow + 6) % 7; // convert to Monday=0
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - mondayIndex);

    const days = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [start]);

  const apptsByDay = useMemo(() => {
    const map = new Map();
    for (const a of appointments || []) {
      const key = toKey(a?.starts_at || a?.start || a?.startsAt);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }

    // sort each day by start time
    for (const [k, list] of map.entries()) {
      list.sort((x, y) => {
        const ax = new Date(x?.starts_at || x?.start || x?.startsAt).getTime();
        const ay = new Date(y?.starts_at || y?.start || y?.startsAt).getTime();
        return ax - ay;
      });
      map.set(k, list);
    }

    return map;
  }, [appointments]);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-[12px] text-slate-400">Calendar</p>
          <p className="text-[14px] font-semibold text-slate-100">{monthLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeMonthKey?.(toKey(addMonths(start, -1)))}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
          >
            Prev
          </button>
          <button
            onClick={() => onChangeMonthKey?.(toKey(new Date()))}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
          >
            Today
          </button>
          <button
            onClick={() => onChangeMonthKey?.(toKey(addMonths(start, 1)))}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
          >
            Next
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/40">
        {weekDays.map((w) => (
          <div key={w} className="px-3 py-2 text-[11px] text-slate-400">
            {w}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7">
        {gridDays.map((d) => {
          const key = toKey(d);
          const inMonth = d.getMonth() === start.getMonth();
          const isSelected = isSameDayKey(key, selectedDateKey);
          const todaysKey = toKey(new Date());
          const isToday = key === todaysKey;

          const list = apptsByDay.get(key) || [];

          return (
            <div
              key={key}
              className={`min-h-[110px] border-r border-b border-slate-800 p-2 ${
                !inMonth ? "bg-slate-950/30" : "bg-slate-950/10"
              }`}
            >
              {/* Day number */}
              <button
                onClick={() => onSelectDateKey?.(key)}
                className={`mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-[12px] ${
                  isSelected
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                    : "border border-transparent hover:border-slate-700 hover:bg-slate-900/40 text-slate-200"
                }`}
              >
                <span className={`${!inMonth ? "text-slate-500" : ""}`}>
                  {d.getDate()}
                </span>
                {isToday && (
                  <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-[2px] text-[10px] text-slate-200">
                    today
                  </span>
                )}
              </button>

              {/* Appointments (dense pills) */}
              <div className="space-y-1">
                {list.slice(0, 4).map((a) => {
                  const name = getPatientName(a);
                  const st = statusTone(a);

                  return (
                    <button
                      key={a?.id || `${key}_${name}`}
                      onClick={() => onSelectAppointment?.(a)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1 hover:border-slate-600"
                    >
                      {/* ✅ No overlap: left = name (truncate), right = chip (shrink-0) */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-6 w-6 shrink-0 rounded-md border border-slate-700 bg-slate-950/40 flex items-center justify-center text-[10px] text-slate-100">
                          {initials(name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-medium text-slate-100">
                            {name}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-[2px] text-[10px] ${chipClass(
                            st.tone
                          )}`}
                        >
                          {st.label}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {list.length > 4 && (
                  <div className="px-2 pt-1 text-[10px] text-slate-500">
                    +{list.length - 4} more
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
