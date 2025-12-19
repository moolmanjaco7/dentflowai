// pages/dashboard.js
import { useEffect, useState } from "react";
import DashboardCalendar from "../components/DashboardCalendar";
import PatientsTab from "../pages/patients"; // adjust path

// ...
{activeTab === "patients" && <PatientsTab />}


function toLocalDateKey(isoString) {
  if (!isoString) return "2025-01-01";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "2025-01-01";

  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());

  return `${year}-${month}-${day}`; // YYYY-MM-DD in LOCAL time
}

function toLocalTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mapAppointmentsToCalendar(rawAppointments) {
  return (rawAppointments || []).map((a) => {
    const date = toLocalDateKey(a.starts_at);
    const startTime = toLocalTime(a.starts_at) || "09:00";
    const endTime = toLocalTime(a.ends_at) || "";

    return {
      id: a.id,
      date,
      startTime,
      endTime,
      // We don’t have patient/practitioner joins here yet,
      // but the calendar expects these fields:
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
      <h1 className="mb-2 text-2xl font-semibold">Dashboard</h1>
      <p className="mb-4 text-xs text-slate-400">
        Month / week view of all appointments in local time.
      </p>

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

      {!loading && !error && appointments.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-xs text-slate-400">
          No appointments found.
        </div>
      )}

      {!loading && !error && appointments.length > 0 && (
        <DashboardCalendar appointments={appointments} />
      )}
    </main>
  );
}
