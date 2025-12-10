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
          console.warn("No appointment API found. Status:", res.status);
          setAppointments([]);
          setLoading(false);
          return;
        }

        const json = await res.json();
        console.log("Dashboard appointments API response:", json);

        // 🔧 Try to extract the actual array from the JSON in a very tolerant way
        let items = null;

        if (Array.isArray(json)) {
          items = json;
        } else if (json) {
          items =
            json.data ||
            json.appointments ||
            json.appointment ||
            json.results ||
            json.items ||
            json.rows ||
            null;

          // If still not an array but it's an object, take its values
          if (!Array.isArray(items) && typeof json === "object") {
            const values = Object.values(json);
            // If first value is an array, use that
            if (values.length && Array.isArray(values[0])) {
              items = values[0];
            } else if (values.length) {
              items = values;
            }
          }
        }

        if (!Array.isArray(items)) {
          console.warn("Could not detect appointments array shape, got:", json);
          items = [];
        }

        // 🔁 Map raw items into what the calendar expects
        const mapped = items.map((a) => {
          // Try to find a date-like field
          const date =
            a.appointment_date ||
            a.date ||
            a.appointmentDate ||
            a.day ||
            a.booking_date ||
            "2025-01-01";

          // Try to find time-like fields
          const rawStart = a.start_time || a.startTime || a.time || "09:00";
          const rawEnd = a.end_time || a.endTime || null;

          const startTime =
            typeof rawStart === "string" ? rawStart.slice(0, 5) : "09:00";
          const endTime =
            rawEnd && typeof rawEnd === "string" ? rawEnd.slice(0, 5) : "";

          // Patient name from different possible shapes
          const patientName =
            a.patient_full_name ||
            a.patient_name ||
            (a.patient && (a.patient.full_name || a.patient.name)) ||
            a.name ||
            "Patient";

          // Practitioner name from different possible shapes
          const practitionerName =
            a.practitioner_full_name ||
            a.practitioner_name ||
            (a.practitioner &&
              (a.practitioner.full_name || a.practitioner.name)) ||
            a.doctor ||
            "";

          return {
            id: a.id || a.appointment_id || `${date}-${startTime}-${patientName}`,
            date,
            startTime,
            endTime,
            patientName,
            practitionerName,
            status: a.status || a.state || a.booking_status || "",
          };
        });

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
