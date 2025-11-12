// components/NewAppointmentModal.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// SA is UTC+2
const tzOffset = "+02:00";
const UI_STATUS = ["booked","confirmed","checked_in","completed","no_show","cancelled"];

function toUtcIso(dateStr, timeStr) {
  const iso = `${dateStr}T${timeStr || "00:00"}:00${tzOffset}`;
  return new Date(iso).toISOString();
}

async function hasConflict(startISO, endISO) {
  const { count, error } = await supabase
    .from("appointments")
    .select("id", { head: true, count: "exact" })
    .lt("starts_at", endISO)
    .gt("ends_at", startISO);
  if (error) throw error;
  return (count || 0) > 0;
}

export default function NewAppointmentModal({ open, onOpenChange, defaultDate, onCreated, patientId: fixedPatientId }) {
  const [patientId, setPatientId] = React.useState(fixedPatientId || "");
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState(defaultDate || "");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [status, setStatus] = React.useState("booked");
  const [busyRanges, setBusyRanges] = React.useState([]); // [{startISO,endISO}]
  const [err, setErr] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [conflict, setConflict] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (defaultDate) setDate(defaultDate);
  }, [open, defaultDate]);

  // load taken slots for selected day -> lightweight availability indicator
  React.useEffect(() => {
    if (!open || !date) return;
    (async () => {
      setBusyRanges([]);
      const dayStart = new Date(`${date}T00:00:00${tzOffset}`).toISOString();
      const dayEnd   = new Date(`${date}T23:59:59${tzOffset}`).toISOString();
      const { data, error } = await supabase
        .from("appointments")
        .select("starts_at,ends_at,title")
        .gte("starts_at", dayStart)
        .lte("starts_at", dayEnd)
        .order("starts_at", { ascending: true });
      if (!error && data) {
        setBusyRanges(
          data.map(r => ({ startISO: r.starts_at, endISO: r.ends_at, title: r.title }))
        );
      }
    })();
  }, [open, date]);

  // live conflict check when picking times
  React.useEffect(() => {
    if (!date || !start || !end) { setConflict(false); return; }
    (async () => {
      try {
        setChecking(true);
        const s = toUtcIso(date, start);
        const e = toUtcIso(date, end);
        setConflict(await hasConflict(s, e));
      } finally {
        setChecking(false);
      }
    })();
  }, [date, start, end]);

  async function createAppt() {
    setErr("");
    if (!patientId) return setErr("Select/enter patient ID");
    if (!date || !start || !end) return setErr("Pick date, start & end");
    if (!UI_STATUS.includes(status)) return setErr("Invalid status");

    const starts_at = toUtcIso(date, start);
    const ends_at = toUtcIso(date, end);

    try {
      setSaving(true);
      if (await hasConflict(starts_at, ends_at)) {
        setConflict(true);
        throw new Error("This time overlaps with another appointment.");
      }

      const { data, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: patientId,
          title: title || "Appointment",
          starts_at,
          ends_at,
          status,
        })
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (onCreated) onCreated(data?.id || null);
      onOpenChange(false);

      // toast
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Appointment created", type: "success" } }));
      }

      // reset
      if (!fixedPatientId) setPatientId("");
      setTitle(""); setStart(""); setEnd("");
    } catch (e) {
      setErr(e.message || "Failed to create appointment");
    } finally {
      setSaving(false);
    }
  }

  // small helper to show red/green hint
  const conflictHint = !date || !start || !end ? "" : checking ? "Checking…" : conflict ? "⛔ Overlaps" : "✅ Available";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          {!fixedPatientId && (
            <div className="grid gap-1">
              <Label>Patient ID</Label>
              <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="UUID from patients table" />
            </div>
          )}

          <div className="grid gap-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional" />
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            <div className="grid gap-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Start</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>End</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <div className={`text-xs ${conflict ? "text-red-600" : "text-green-700"}`}>
            {conflictHint}
          </div>

          <div className="grid gap-1">
            <Label>Status</Label>
            <select className="border rounded-md px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              {UI_STATUS.map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>

          {Boolean(busyRanges.length) && (
            <div className="rounded-lg border p-2 bg-slate-50">
              <div className="text-xs font-medium mb-1">Taken on {date}:</div>
              <ul className="space-y-1">
                {busyRanges.map((r, i) => (
                  <li key={i} className="text-xs text-slate-600">
                    {new Date(r.startISO).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}
                    {"–"}
                    {new Date(r.endISO).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}
                    {r.title ? ` · ${r.title}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {err && <div className="text-sm text-red-600">{err}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={createAppt} disabled={saving || conflict || !date || !start || !end}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
