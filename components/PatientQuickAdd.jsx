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

// SA is UTC+2 with no DST
function toUtcIso(dateStr, timeStr) {
  // e.g. "2025-11-12", "09:30" -> "2025-11-12T07:30:00.000Z"
  const iso = `${dateStr}T${timeStr || "00:00"}:00+02:00`;
  return new Date(iso).toISOString();
}

export default function PatientQuickAdd({ patientId, onCreated }) {
  const [date, setDate] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function submit() {
    setErr("");
    if (!patientId) return setErr("Missing patient");
    if (!date || !start || !end) return setErr("Pick date, start & end");
    setSaving(true);
    try {
      const starts_at = toUtcIso(date, start);
      const ends_at = toUtcIso(date, end);

      // keep within your DB status constraint (booked/confirmed/checked_in/completed/no_show/cancelled)
      const payload = {
        patient_id: patientId,
        title: title || "Appointment",
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

      setTitle("");
      setStart("");
      setEnd("");
      setDate("");
      if (onCreated) onCreated(data?.id || null);

      // toast (optional)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Appointment created", type: "success" } }));
      }
    } catch (e) {
      setErr(e.message || "Failed to create appointment");
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
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={saving || !date || !start || !end}>
          {saving ? "Saving…" : "Create"}
        </Button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}
