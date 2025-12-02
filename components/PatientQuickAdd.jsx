// components/PatientQuickAdd.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TZ_OFFSET = "+02:00"; // South Africa is UTC+2 year-round

function makeTimeOptions(stepMinutes = 15, start = "07:00", end = "18:00") {
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;
  const list = [];
  for (let m = startMin; m <= endMin; m += stepMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    list.push(`${hh}:${mm}`);
  }
  return list;
}

const TIME_OPTIONS = makeTimeOptions(15, "07:00", "18:00");
const DURATIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
];

export default function PatientQuickAdd({ patientId, patientName }) {
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const [title, setTitle] = React.useState(patientName ? `Consult: ${patientName}` : "Consultation");
  const [date, setDate] = React.useState(todayStr);
  const [time, setTime] = React.useState("09:00");
  const [duration, setDuration] = React.useState(30);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  function toIsoUtc(dateStr, timeStr) {
    // Build local SA time then convert to UTC ISO
    const local = `${dateStr}T${timeStr}:00${TZ_OFFSET}`;
    return new Date(local).toISOString();
  }

  function addMinutesIsoUtc(startIsoUtc, minutes) {
    return new Date(new Date(startIsoUtc).getTime() + minutes * 60000).toISOString();
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");

    try {
      if (!patientId) throw new Error("Missing patient id");
      if (!date) throw new Error("Select a date");
      if (!time) throw new Error("Select a time");

      const starts_at = toIsoUtc(date, time);
      const ends_at = addMinutesIsoUtc(starts_at, Number(duration));

      const payload = {
        title: title?.trim() || "Appointment",
        patient_id: patientId,
        starts_at,
        ends_at,
        status: "booked", // db status (UI “scheduled”)
      };

      const { error } = await supabase.from("appointments").insert(payload);
      if (error) throw error;

      // toast + simple reset
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { title: "Appointment created", type: "success" },
          })
        );
      }
    } catch (e2) {
      const msg = e2?.message || "Failed to create appointment";
      setErr(msg);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { title: "Error", description: msg, type: "error" },
          })
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm font-semibold">Quick add appointment</div>
      <p className="text-xs text-slate-500">Pick a date & time, then save.</p>

      <form onSubmit={handleCreate} className="mt-3 grid gap-3">
        {/* Title */}
        <label className="block">
          <span className="block text-xs font-medium text-slate-700">Title</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Consultation"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        {/* Compact row: Date / Time / Duration */}
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="block text-xs font-medium text-slate-700">Date</span>
            <input
              type="date"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-slate-700">Start time</span>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-slate-700">Duration</span>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Error */}
        {err ? <p className="text-xs text-red-600">{err}</p> : null}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}
