// components/NewAppointmentModal.jsx
"use client";
import * as React from "react";
import { format } from "date-fns";
import { toDate } from "date-fns-tz";
import { createClient } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TZ = "Africa/Johannesburg";

// Supabase (browser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// UI -> DB statuses (kept consistent with DayAppointments)
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

  // patient list
  const [patients, setPatients] = React.useState([]);

  React.useEffect(() => {
    // load a dropdown of patients
    (async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name")
        .order("full_name", { ascending: true })
        .limit(200);
      if (!error && Array.isArray(data)) setPatients(data);
    })();
  }, []);

  function localStr(dateObj, timeHHmm) {
    // "YYYY-MM-DD HH:mm:00" string in local SA time, converted to UTC date via toDate()
    const d = format(defaultDate ?? dateObj ?? new Date(), "yyyy-MM-dd");
    return `${d} ${timeHHmm}:00`;
  }

  async function handleCreate() {
    setLoading(true);
    setError("");

    try {
      // Basic validation
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

      // Reset & close
      setTitle("");
      setPatientId("");
      setStatus("scheduled");
      setNotes("");
      setStartTime("09:00");
      setEndTime("09:30");
      setOpen(false);

      // Tell parent to refresh
      onCreated?.();
    } catch (e) {
      setError(e?.message || "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="text-sm">+ New Appointment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Patient</Label>
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
            <Label>Title</Label>
            <Input placeholder="Eg. Check-up / Cleaning" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Start</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>End</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Status</Label>
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
              <Label>Date</Label>
              <Input value={format(defaultDate ?? new Date(), "yyyy-MM-dd")} disabled />
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Notes</Label>
            <Textarea rows={3} placeholder="Optional notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
