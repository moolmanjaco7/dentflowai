// components/NewAppointmentModal.jsx
"use client";
import * as React from "react";
import { format } from "date-fns";
import { toDate } from "date-fns-tz";
import { createClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input"; // you already have this

const TZ = "Africa/Johannesburg";

// Supabase (browser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Map UI -> DB status values
const UI_TO_DB = {
  scheduled: "booked",
  confirmed: "confirmed",
  checked_in: "checked_in",
  completed: "completed",
  no_show: "no_show",
  cancelled: "cancelled",
};

export default function NewAppointmentModal({ defaultDate, onCreated }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // form state
  const [title, setTitle] = React.useState("");
  const [patientId, setPatientId] = React.useState("");
  const [status, setStatus] = React.useState("scheduled");
  const [notes, setNotes] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("09:30");

  // patients
  const [patients, setPatients] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, full_name")
        .order("full_name", { ascending: true })
        .limit(200);
      if (Array.isArray(data)) setPatients(data);
    })();
  }, []);

  // close on ESC
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function localStr(dateObj, timeHHmm) {
    const d = format(defaultDate ?? dateObj ?? new Date(), "yyyy-MM-dd");
    return `${d} ${timeHHmm}:00`;
  }

  async function handleCreate() {
    setLoading(true);
    setError("");

    try {
      if (!patientId) throw new Error("Please choose a patient");
      if (!startTime || !endTime) throw new Error("Please set start and end time");

      const startsAtUtc = toDate(localStr(defaultDate, startTime), { timeZone: TZ });
      const endsAtUtc = toDate(localStr(defaultDate, endTime), { timeZone: TZ });
      if (endsAtUtc <= startsAtUtc) throw new Error("End time must be after start time");

      const dbStatus = UI_TO_DB[status] || "booked";

      const { error: insErr } = await supabase
        .from("appointments")
        .insert({
          title: title || "Appointment",
          patient_id: patientId,
          status: dbStatus,
          notes: notes || null,
          starts_at: startsAtUtc.toISOString(),
          ends_at: endsAtUtc.toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (insErr) throw insErr;

      // reset & close
      setTitle("");
      setPatientId("");
      setStatus("scheduled");
      setNotes("");
      setStartTime("09:00");
      setEndTime("09:30");
      setOpen(false);

      onCreated?.();
    } catch (e) {
      setError(e?.message || "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="text-sm px-3 py-2 rounded-md border bg-white hover:bg-slate-50"
        onClick={() => setOpen(true)}
      >
        + New Appointment
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          {/* modal */}
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">New Appointment</h2>
              <button
                className="rounded px-2 py-1 text-sm hover:bg-slate-100"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Patient</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="border rounded-md px-2 py-2 text-sm bg-white"
                >
                  <option value="">Select a patient…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Eg. Check-up / Cleaning"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Start</label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium">End</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="border rounded-md px-2 py-2 text-sm bg-white"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked_in">Checked-in</option>
                    <option value="completed">Completed</option>
                    <option value="no_show">No Show</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Date</label>
                  <Input value={format(defaultDate ?? new Date(), "yyyy-MM-dd")} disabled />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Optional notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded-md p-2 text-sm"
                />
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 rounded-md border bg-white hover:bg-slate-50 text-sm"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-sm rounded-lg"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
