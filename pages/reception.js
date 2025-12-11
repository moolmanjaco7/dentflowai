// pages/reception.js

import { useEffect, useState } from "react";

function toLocalDateKey(isoString) {
  if (!isoString) return "2025-01-01";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "2025-01-01";

  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());

  return `${year}-${month}-${day}`;
}

function toLocalTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
      patientName: a.patient_name || "Patient",
      practitionerName: a.practitioner_name || "",
    };
  });
}

export default function ReceptionPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/appointments");
        if (!res.ok) {
          console.warn("Reception /api/appointments status:", res.status);
          setError("Could not load appointments.");
          setAppointments([]);
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
        setError("Unexpected error while loading appointments.");
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

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
              Appointments grouped by day, using local time.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
            <a
              href="/reception-booking"
              className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-200 hover:border-emerald-400"
            >
              + New booking
            </a>
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
        ) : sortedDates.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-xs text-slate-400">
            No appointments found.
          </div>
        ) : (
          <section className="space-y-4">
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
