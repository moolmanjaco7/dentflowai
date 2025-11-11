// components/NewAppointmentModal.jsx
"use client";
import * as React from "react";
import { format } from "date-fns";
import { toDate } from "date-fns-tz";
import { createClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { UI_STATUS, STATUS_LABEL, normalizeUiStatus, toDbStatus } from "@/lib/status";


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

/**
 * Props:
 * - defaultDate: Date  (required)
 * - onCreated: () => void
 * - fixedPatientId?: string   -> when provided, skips patient select
 * - fixedPatientName?: string -> optional label in the form when fixedPatientId is set
 */
export default function NewAppointmentModal({ defaultDate, onCreated, fixedPatientId, fixedPatientName }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // form state
  const [title, setTitle] = React.useState("");
  const [patientId, setPatientId] = React.useState(fixedPatientId || "");
  const [status, setStatus] = React.useState("scheduled");
  const [notes, setNotes] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("09:30");

  // patients (only when not fixed)
  const [patients, setPatients] = React.useState([]);

  React.useEffect(() => {
    if (fixedPatientId) return; // skip fetching
    (async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, full_name")
        .order("full_name", { ascending: true })
        .limit(200);
      if (Array.isArray(data)) setPatients(data);
    })();
  }, [fixedPatientId]);
async function hasOverlap(startsAtIso, endsAtIso) {
  // ask DB if anything overlaps this interval
  const { data, error } = await supabase
    .from("appointments")
    .select("id")
    .overlaps("time_range", [startsAtIso, endsAtIso]); // Supabase supports overlaps with tstzrange
  if (error) return false; // be permissive if network hiccup; DB constraint still catches
  return Array.isArray(data) && data.length > 0;
}

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
    const effectivePatientId = fixedPatientId || patientId;
    if (!effectivePatientId) throw new Error("Please choose a patient");
    if (!startTime || !endTime) throw new Error("Please set start and end time");

    const startsAtUtc = toDate(localStr(defaultDate, startTime), { timeZone: TZ });
    const endsAtUtc   = toDate(localStr(defaultDate, endTime),   { timeZone: TZ });
    if (endsAtUtc <= startsAtUtc) throw new Error("End time must be after start time");

    // ✅ Working hours guard (edit times to your clinic hours)
    const OPEN = 8;  // 08:00
    const CLOSE = 18; // 18:00
    const sH = startsAtUtc.getUTCHours();
    const eH = endsAtUtc.getUTCHours();
    // Convert working hours to TZ by comparing in local TZ
    const localStart = new Date(startsAtUtc.toLocaleString("en-ZA", { timeZone: TZ }));
    const localEnd   = new Date(endsAtUtc.toLocaleString("en-ZA", { timeZone: TZ }));
    const lsH = localStart.getHours();
    const leH = localEnd.getHours();
    if (lsH < OPEN || leH > CLOSE || (leH === CLOSE && localEnd.getMinutes() > 0)) {
      throw new Error(`Outside working hours (${String(OPEN).padStart(2,"0")}:00–${CLOSE}:00)`);
    }

    // ✅ Client-side overlap check (DB still enforces)
    const startISO = startsAtUtc.toISOString();
    const endISO   = endsAtUtc.toISOString();
    if (await hasOverlap(startISO, endISO)) {
      throw new Error("This time overlaps another appointment");
    }

    const dbStatus = toDbStatus(status);

    const { error: insErr } = await supabase
      .from("appointments")
      .insert({
        title: title || "Appointment",
        patient_id: effectivePatientId,
        status: dbStatus,
        notes: notes || null,
        starts_at: startISO,
        ends_at: endISO,
      })
      .select("id")
      .maybeSingle();

    if (insErr) {
      // If DB overlap constraint triggers:
      if (insErr.code === "23P01") {
        throw new Error("This time overlaps another appointment");
      }
      throw insErr;
    }

    // reset and close
    setTitle("");
    setPatientId(fixedPatientId || "");
    setStatus("scheduled");
    setNotes("");
    setStartTime("09:00");
    setEndTime("09:30");
    setOpen(false);

    window.dispatchEvent(new CustomEvent("toast", {
      detail: { title: "Appointment created", type: "success" }
    }));
    onCreated?.();
  } catch (e) {
    setError(e?.message || "Failed to create appointment");
    window.dispatchEvent(new CustomEvent("toast", {
      detail: { title: e?.message || "Failed to create appointment", type: "error" }
    }));
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
              {!fixedPatientId ? (
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
              ) : (
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Patient</label>
                  <div className="px-2 py-2 text-sm rounded-md border bg-slate-50">
                    {fixedPatientName || "Selected patient"}
                  </div>
                </div>
              )}

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
