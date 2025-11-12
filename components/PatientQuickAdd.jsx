// components/PatientQuickAdd.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// SA is UTC+2 (no DST)
function toUtcIso(dateStr, timeStr) {
  const iso = `${dateStr}T${timeStr || "00:00"}:00+02:00`;
  return new Date(iso).toISOString();
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const PRESETS = [
  { key: "2w", label: "+2 weeks", days: 14 },
  { key: "6w", label: "+6 weeks", days: 42 },
  { key: "3m", label: "+3 months", days: 90 },
];

// clinic-wide overlap check: any appt where (start < proposedEnd) AND (end > proposedStart)
async function hasConflict(startISO, endISO) {
  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .lt("starts_at", endISO)
    .gt("ends_at", startISO);
  if (error) throw error;
  return (count || 0) > 0;
}

export default function PatientQuickAdd({ patientId, onCreated }) {
  const [date, setDate] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [preset, setPreset] = React.useState("6w");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [conflictMsg, setConflictMsg] = React.useState("");

  async function insertAppt({ dateStr, startStr, endStr, apptTitle }) {
    const starts_at = toUtcIso(dateStr, startStr);
    const ends_at = toUtcIso(dateStr, endStr);

    // conflict check
    if (await hasConflict(starts_at, ends_at)) {
      setConflictMsg("⛔ That time overlaps with an existing appointment.");
      throw new Error("Overlapping appointment");
    } else {
      setConflictMsg("");
    }

    const payload = {
      patient_id: patientId,
      title: apptTitle || "Appointment",
      starts_at,
      ends_at,
      status: "booked",
    };
    const { data, error } = await supabase
      .from("appointments")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return data?.id || null;
  }

  async function submit() {
    setErr("");
    if (!patientId) return setErr("Missing patient");
    if (!date || !start || !end) return setErr("Pick date, start & end");
    setSaving(true);
    try {
      const newId = await insertAppt({
        dateStr: date,
        startStr: start,
        endStr: end,
        apptTitle: title,
      });
      if (onCreated) onCreated(newId);

      // toast + refresh history
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Appointment created", type: "success" } }));
        window.dispatchEvent(new CustomEvent("patient-history-refresh", { detail: { patientId } }));
      }

      setTitle(""); setStart(""); setEnd(""); setDate("");
    } catch (e) {
      if (e.message !== "Overlapping appointment") setErr(e.message || "Failed to create appointment");
    } finally {
      setSaving(false);
    }
  }

  async function createFollowUpPreset() {
    setErr("");
    if (!patientId) return setErr("Missing patient");
    if (!date || !start || !end) return setErr("Pick date, start & end first");
    const p = PRESETS.find((x) => x.key === preset) || PRESETS[1]; // default 6w
    setSaving(true);
    try {
      const followDate = addDays(date, p.days);
      const newId = await insertAppt({
        dateStr: followDate,
        startStr: start,
        endStr: end,
        apptTitle: title ? `${title} (Follow-up)` : "Follow-up",
      });
      if (onCreated) onCreated(newId);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: `Follow-up created (${p.label})`, type: "success" } }));
        window.dispatchEvent(new CustomEvent("patient-history-refresh", { detail: { patientId } }));
      }
    } catch (e) {
      if (e.message !== "Overlapping appointment") setErr(e.message || "Failed to create follow-up");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="text-sm font-semibold">Quick add appointment</div>
      <div className="grid sm:grid-cols-4 gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      {!!conflictMsg && <div className="text-sm text-red-600">{conflictMsg}</div>}
      {!!err && <div className="text-sm text-red-600">{err}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={saving || !date || !start || !end}>
          {saving ? "Saving…" : "Create"}
        </Button>

        <div className="flex items-center gap-2">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
            title="Choose follow-up interval"
          >
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={createFollowUpPreset}
            disabled={saving || !date || !start || !end}
            title="Uses the same start/end time at the chosen interval"
          >
            + Follow-up (preset)
          </Button>
        </div>
      </div>
    </div>
  );
}
