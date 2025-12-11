// pages/dashboard.js
import { useEffect, useState } from "react";
import DashboardCalendar from "../components/DashboardCalendar";

function mapAppointmentsToCalendar(rawAppointments) {
  // Convert Supabase rows -> calendar format, using LOCAL time
  return (rawAppointments || []).map((a) => {
    const starts = a.starts_at ? new Date(a.starts_at) : null;
    const ends = a.ends_at ? new Date(a.ends_at) : null;

    const pad = (n) => String(n).padStart(2, "0");

    let date = "2025-01-01";
    let startTime = "09:00";
    let endTime = "";

    if (starts instanceof Date && !isNaN(starts.getTime())) {
      const year = starts.getFullYear();
      const month = pad(starts.getMonth() + 1); // 0-based
      const day = pad(starts.getDate()); // LOCAL day
      date = `${year}-${month}-${day}`;

      startTime = `${pad(starts.getHours())}:${pad(starts.getMinutes())}`;
    }

    if (ends instanceof Date && !isNaN(ends.getTime())) {
      endTime = `${pad(ends.getHours())}:${pad(ends.getMinutes())}`;
    }

    return {
      id: a.id,
      date,
      startTime,
      endTime,
      patientName: a.patient_name || "Patient",
      practitionerName: a.practitioner_name || "",
      status: a.status || "",
    };
  });
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAppointments() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/appointments");
        if (!res.ok) {
          console.warn("Appointments API returned", res.status);
          setError("Could not load appointments.");
          setAppointments([]);
          setLoading(false);
          return;
        }

        const json = await res.json();
        console.log("Dashboard appointments API response:", json);

        const raw =
          (json && (json.appointments || json.data || json.rows)) || [];
        const mapped = mapAppointmentsToCalendar(raw);

        setAppointments(mapped);
      } catch (err) {
        console.error("Failed to load dashboard appointments", err);
        setError("Unexpected error while loading appointments.");
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-xs text-slate-400">
            Month/week calendar of all upcoming appointments.
          </p>
        </div>
        <div className="flex gap-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Reception & online bookings included</span>
          </span>
        </div>
      </header>

      {loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-400">
          Loading appointments…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 text-center text-[12px] text-rose-100">
          {error}
        </div>
      )}

      {!loading && !error && (
        <DashboardCalendar appointments={appointments} />
      )}
    </main>
  );
}
