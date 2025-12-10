// pages/dashboard.js
import { useEffect, useState } from "react";
import DashboardCalendar from "../components/DashboardCalendar";

export default function DashboardPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAppointments() {
      try {
        // Try main appointments API route
        let res = await fetch("/api/appointments");
        if (!res.ok) {
          // Fallback to /api/appointments/list if first one doesn't exist
          res = await fetch("/api/appointments/list");
        }
        if (!res.ok) {
          console.warn("No appointment API found.");
          setAppointments([]);
          setLoading(false);
          return;
        }

        const json = await res.json();
        const items = Array.isArray(json)
          ? json
          : json.data || json.appointments || [];

        const mapped = items.map((a) => ({
          id: a.id,
          date:
            a.appointment_date ||
            a.date ||
            a.appointmentDate ||
            "2025-01-01",
          startTime: (a.start_time || a.startTime || "09:00").slice(0, 5),
          endTime: (a.end_time || a.endTime || "10:00").slice(0, 5),
          patientName:
            a.patient_full_name ||
            a.patient_name ||
            (a.patient && a.patient.full_name) ||
            "Patient",
          practitionerName:
            a.practitioner_full_name ||
            a.practitioner_name ||
            (a.practitioner && a.practitioner.full_name) ||
            "",
          status: a.status || "",
        }));

        setAppointments(mapped);
      } catch (err) {
        console.error("Failed to load dashboard appointments", err);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-400">
          Loading appointments…
        </div>
      ) : (
        <DashboardCalendar appointments={appointments} />
      )}
    </main>
  );
}
