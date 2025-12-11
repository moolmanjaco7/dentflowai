// pages/reception.js

import { useEffect, useState } from "react";

// --- Local date & time helpers (fixes the next-day bug) ---
function toLocalDateKey(isoString) {
  if (!isoString) return "2025-01-01";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "2025-01-01";

  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());

  return `${year}-${month}-${day}`; // YYYY-MM-DD in LOCAL TIME
}

function toLocalTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// -----------------------------------------------------------

// Fallback demo appointments in case API fails
const demoAppointments = [
  {
    id: 1,
    starts_at: "2025-12-10T08:30:00",
    ends_at: "2025-12-10T09:00:00",
    status: "confirmed",
    notes: "Demo booking",
  },
  {
    id: 2,
    starts_at: "2025-12-10T10:00:00",
    ends_at: "2025-12-10T10:30:00",
    status: "confirmed",
    notes: "Demo booking 2",
  },
  {
    id: 3,
    starts_at: "2025-12-11T09:15:00",
    ends_at: "2025-12-11T09:45:00",
    status: "pending",
    notes: "Demo booking 3",
  },
];

function mapAppointments(rawAppointments) {
  return (rawAppointments || []).map((a) => {
    const dateKey = toLocalDateKey(a.starts_at);
    const startTime = toLocalTime(a.starts_at) || "09:00";
    const endTime = toLocalTime(a.ends_at) || "";

    return {
      id: a.id,
      dateKey,
      startTime,
      endTime,
      status: a.status || "",
      notes: a.notes || "",
      // If later you add patient/practitioner joins, map them here:
      patientName: a.patient_name || "Patient",
      practitionerName: a.practitioner_name || "",
    };
  });
}

export default function ReceptionPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      setUsingDemo(false);

      try {
        const res = await fetch("/api/appointments");
        if (!res.ok) {
          console.warn("Reception /api/appointments status:", res.status);
          const mappedDemo = mapAppointments(demoAppointments);
          setAppointments(mappedDemo);
          setUsingDemo(true);
          setLoading(false);
          return;
        }

        const json = await res.json();
        console.log("Reception appointments API response:", json);

        const raw =
          (json && (json.appointments || json.data || json.rows)) || [];
        const mapped = mapAppointments(raw);
        setAppointments(mapped);
      } catch (err) {
        console.error("Reception calendar load error:", err);
        const mappedDemo = mapAppointments(demoAppointments);
        setAppointments(mappedDemo);
        setUsingDemo(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Group by dateKey
  const grouped = appointments.reduce((acc, appt) => {
    if (!acc[appt.dateKey]) acc[appt.dateKey] = [];
    acc[appt.dateKey].push(appt);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  const todayKey = toLocalDateKey(new Date().toISOString());

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-50">
              Reception calendar
            </h1>
            <p className="text-xs text-slate-400">
              Today&apos;s and upcoming appointments in local time (no more
              next-day shift).
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
            <a
              href="/reception-booking"
              className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-200 hover:border-emerald-400"
            >
              + New booking
            </a>
            {usingDemo && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/60 bg-amber-500/10 px-3 py-1 text-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Showing demo data (appointments API not responding)</span>
              </span>
            )}
          </div>
        </header>

        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-400">
            Loading reception calendar…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 text-center text-[12px] text-rose-100">
            {error}
          </div>
        ) : (
          <section className="space-y-4">
            {sortedDates.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-400 text-xs">
                No appointments found.
              </div>
            )}

            {sortedDates.map((dateKey) => {
              const list = grouped[dateKey] || [];

              const dateObj = new Date(dateKey + "T00:00:00");
              const label = dateObj.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              const isToday = dateKey === todayKey;

              return (
                <div
                  key={dateKey}
                  className="rounded-xl border border-slate-800 bg-slate-950/70"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-100">
                        {label}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                          Today
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {list.length} appointment{list.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800 text-xs">
                    {list.map((appt) => (
                      <div
                        key={appt.id}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-50">
                            {appt.startTime}
                            {appt.endTime ? `–${appt.endTime}` : ""}
                          </span>
                          <span className="text-[11px] text-slate-300">
                            {appt.patientName}
                          </span>
                          {appt.practitionerName && (
                            <span className="text-[10px] text-slate-500">
                              {appt.practitionerName}
                            </span>
                          )}
                          {appt.notes && (
                            <span className="mt-0.5 text-[10px] text-slate-500">
                              Notes: {appt.notes}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1 text-[10px]">
                          {appt.status && (
                            <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-300">
                              {appt.status}
                            </span>
                          )}
                          {/* Placeholder for quick actions later */}
                          <button
                            type="button"
                            className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 hover:border-slate-500"
                          >
                            View / edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
