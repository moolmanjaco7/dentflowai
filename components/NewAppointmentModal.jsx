// components/NewAppointmentModal.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { toDate } from "date-fns-tz";

// shadcn/ui bits (adjust paths if your setup differs)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { normalizeUiStatus, toDbStatus, UI_STATUS, STATUS_LABEL } from "@/lib/status";

const TZ = "Africa/Johannesburg";
const OPEN_H = 8;   // 08:00
const CLOSE_H = 18; // 18:00
const STEP_MIN = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ========================= Helpers ========================= */

// Build YYYY-MM-DD for a date in clinic TZ
function fmtDateLocalYYYYMMDD(d, tz = TZ) {
  const z = new Date(d.toLocaleString("en-ZA", { timeZone: tz }));
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, "0");
  const dd = String(z.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Build "yyyy-MM-dd HH:mm" local string for toDate()
function localStr(dateOnly, hhmm, tz = TZ) {
  const yyyyMMdd = fmtDateLocalYYYYMMDD(dateOnly, tz);
  return `${yyyyMMdd} ${hhmm}:00`;
}

// Generator for time slots (in minutes)
function* timeSlots(range = { start: OPEN_H * 60, end: CLOSE_H * 60, step: STEP_MIN }) {
  for (let m = range.start; m <= range.end; m += range.step) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    yield `${hh}:${mm}`;
  }
}

function parseHM(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  // half-open intervals [start, end)
  return aStart < bEnd && bStart < aEnd;
}

/* ========================================================== */

export default function NewAppointmentModal({
  defaultDate = new Date(),
  fixedPatientId,
  fixedPatientName,
  onCreated,
}) {
  const [open, setOpen] = React.useState(false);

  // Form state
  const [title, setTitle] = React.useState("");
  const [patientId, setPatientId] = React.useState(fixedPatientId || "");
  const [status, setStatus] = React.useState("scheduled");
  const [notes, setNotes] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("09:30");
  const [patients, setPatients] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // Taken blocks for selected day (in LOCAL MINUTES, e.g., [[540, 570], ...])
  const [taken, setTaken] = React.useState([]);

  // Load patients (simple list)
  React.useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("patients")
        .select("id, full_name")
        .order("full_name", { ascending: true });
      setPatients(Array.isArray(data) ? data : []);
    })();
  }, []);

  // Load taken slots for the chosen day
  React.useEffect(() => {
    (async () => {
      const day = fmtDateLocalYYYYMMDD(defaultDate, TZ);
      // Query for all appts starting that day (in UTC bounds for safety)
      const startBound = new Date(`${day}T00:00:00`);
      const endBound = new Date(`${day}T23:59:59.999`);

      // Convert bounds to ISO (UTC)
      const { data, error } = await supabase
        .from("appointments")
        .select("starts_at, ends_at")
        .gte("starts_at", startBound.toISOString())
        .lte("starts_at", endBound.toISOString());

      if (error) {
        // Fail softly; DB constraint will still protect
        setTaken([]);
        return;
      }

      const tz = TZ;
      const blocks = (Array.isArray(data) ? data : []).map((a) => {
        // Convert the UTC timestamps into LOCAL time numbers (minutes since 00:00)
        const sLocal = new Date(
          new Date(a.starts_at).toLocaleString("en-ZA", { timeZone: tz })
        );
        const eLocal = new Date(
          new Date((a.ends_at || a.starts_at)).toLocaleString("en-ZA", { timeZone: tz })
        );
        const sHM = sLocal.getHours() * 60 + sLocal.getMinutes();
        const eHM = eLocal.getHours() * 60 + eLocal.getMinutes();
        return [sHM, eHM];
      });

      setTaken(blocks);
    })();
  }, [defaultDate]);

  // Quick server check (belt & braces). Uses tstzrange ‘overlaps’ if you added time_range column.
  async function hasOverlap(startsAtIso, endsAtIso) {
    const { data, error } = await supabase
      .from("appointments")
      .select("id")
      .overlaps("time_range", [startsAtIso, endsAtIso]); // server overlap
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  }

  async function handleCreate() {
    setLoading(true);
    setError("");

    try {
      const effectivePatientId = fixedPatientId || patientId;
      if (!effectivePatientId) throw new Error("Please choose a patient");
      if (!startTime || !endTime) throw new Error("Please set start and end time");

      // Convert local strings to UTC Date using date-fns-tz
      const startsAtUtc = toDate(localStr(defaultDate, startTime), { timeZone: TZ });
      const endsAtUtc = toDate(localStr(defaultDate, endTime), { timeZone: TZ });
      if (endsAtUtc <= startsAtUtc) throw new Error("End time must be after start time");

      // Working hours check in local TZ
      const localStart = new Date(startsAtUtc.toLocaleString("en-ZA", { timeZone: TZ }));
      const localEnd = new Date(endsAtUtc.toLocaleString("en-ZA", { timeZone: TZ }));
      const lsH = localStart.getHours();
      const leH = localEnd.getHours();
      if (lsH < OPEN_H || leH > CLOSE_H || (leH === CLOSE_H && localEnd.getMinutes() > 0)) {
        throw new Error(`Outside working hours (${String(OPEN_H).padStart(2, "0")}:00–${CLOSE_H}:00)`);
      }

      // Client-side overlap check using taken[]
      const sHM = localStart.getHours() * 60 + localStart.getMinutes();
      const eHM = localEnd.getHours() * 60 + localEnd.getMinutes();
      const clientOverlap = taken.some(([bS, bE]) => overlaps(sHM, eHM, bS, bE));
      if (clientOverlap) throw new Error("This time overlaps another appointment");

      // Server belt & braces (if time_range exists)
      const startISO = startsAtUtc.toISOString();
      const endISO = endsAtUtc.toISOString();
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
        // If you created the DB exclusion constraint, Postgres will raise code 23P01 on overlaps
        if (insErr.code === "23P01") {
          throw new Error("This time overlaps another appointment");
        }
        throw insErr;
      }

      // Reset and close
      setTitle("");
      setPatientId(fixedPatientId || "");
      setStatus("scheduled");
      setNotes("");
      setStartTime("09:00");
      setEndTime("09:30");
      setOpen(false);

      window.dispatchEvent(
        new CustomEvent("toast", { detail: { title: "Appointment created", type: "success" } })
      );
      onCreated?.();
    } catch (e) {
      setError(e?.message || "Failed to create appointment");
      window.dispatchEvent(
        new CustomEvent("toast", { detail: { title: e?.message || "Failed to create appointment", type: "error" } })
      );
    } finally {
      setLoading(false);
    }
  }

  // Disable logic for <option> items
  const disabledForStart = React.useCallback(
    (startHHMM) => {
      const sHM = parseHM(startHHMM);
      const eHM = sHM + STEP_MIN; // preview 30m slot
      // outside working hours?
      if (sHM < OPEN_H * 60 || eHM > CLOSE_H * 60) return true;
      // overlaps any taken?
      return taken.some(([bS, bE]) => overlaps(sHM, eHM, bS, bE));
    },
    [taken]
  );

  const disabledForEnd = React.useCallback(
    (endHHMM) => {
      const sHM = parseHM(startTime || "00:00");
      const eHM = parseHM(endHHMM);
      // must be strictly after start
      if (eHM <= sHM) return true;
      // outside working hours?
      if (sHM < OPEN_H * 60 || eHM > CLOSE_H * 60) return true;
      // overlaps any taken?
      return taken.some(([bS, bE]) => overlaps(sHM, eHM, bS, bE));
    },
    [taken, startTime]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">New appointment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Check-up / Cleaning…" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="patient">Patient</Label>
            {fixedPatientId ? (
              <Input id="patient" value={fixedPatientName || "(Fixed)"} disabled />
            ) : (
              <select
                id="patient"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="border rounded-md px-2 py-2 text-sm bg-white"
              >
                <option value="">Select a patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(normalizeUiStatus(e.target.value))}
              className="border rounded-md px-2 py-2 text-sm bg-white"
            >
              {UI_STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label>Time</Label>
            <div className="flex items-center gap-2">
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="border rounded-md px-2 py-2 text-sm bg-white"
                aria-label="Start time"
              >
                {[...timeSlots()].map((t) => (
                  <option key={t} value={t} disabled={disabledForStart(t)}>
                    {t}
                  </option>
                ))}
              </select>

              <span className="text-slate-500">to</span>

              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="border rounded-md px-2 py-2 text-sm bg-white"
                aria-label="End time"
              >
                {[...timeSlots()].map((t) => (
                  <option key={t} value={t} disabled={disabledForEnd(t)}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-500">
              Working hours: {String(OPEN_H).padStart(2, "0")}:00–{CLOSE_H}:00. Overlapping slots are disabled.
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any relevant notes…" />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Saving…" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
