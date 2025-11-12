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

export default function PatientQuickAdd({ patientId, onCreated }) {
  const [date, setDate] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function insertAppt({ dateStr, startStr, endStr, apptTitle }) {
    const starts_at = toUtcIso(dateStr, startStr);
    const ends_at = toUtcIso(dateStr, endStr);
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

      // toast
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Appointment created", type: "success" } }));
        window.dispatchEvent(new CustomEvent("patient-history-refresh", { detail: { patientId } }));
      }

      setTitle("");
      setStart("");
      setEnd("");
      setDate("");
    } catch (e) {
      setErr(e.message || "Failed to create appointment");
    } finally {
      setSaving(false);
    }
  }

  async function createFollowUp6w() {
    setErr("");
    if (!patientId) return setErr("Missing patient");
    if (!date || !start || !end) return setErr("Pick date, start & end first");
    setSaving(true);
    try {
      const followDate = addDays(date, 42); // +6 weeks
      const newId = await insertAppt({
        dateStr: followDate,
        startStr: start,
        endStr: end,
        apptTitle: title ? `${title} (Follow-up)` : "Follow-up",
      });
      if (onCreated) onCreated(newId);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Follow-up created (+6 weeks)", type: "success" } }));
        window.dispatchEvent(new CustomEvent("patient-history-refresh", { detail: { patientId } }));
      }
    } catch (e) {
      setErr(e.message || "Failed to create follow-up");
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
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={saving || !date || !start || !end}>
          {saving ? "Saving…" : "Create"}
        </Button>
        <Button
          variant="outline"
          onClick={createFollowUp6w}
          disabled={saving || !date || !start || !end}
          title="Uses the same start/end time, 6 weeks later"
        >
          + Follow-up in 6 weeks
        </Button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}
