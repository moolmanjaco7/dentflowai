// components/EditAppointmentModal.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const tzOffset = "+02:00";
const UI_STATUS = ["booked","confirmed","checked_in","completed","no_show","cancelled"];

function dateStrFromISO(iso) {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth()+1).padStart(2,"0");
  const dd = String(d.getUTCDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
function timeStrFromISO(iso) {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()+2).padStart(2,"0"); // show SA time
  const mm = String(d.getUTCMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}
function toUtcIso(dateStr, timeStr) {
  const iso = `${dateStr}T${timeStr || "00:00"}:00${tzOffset}`;
  return new Date(iso).toISOString();
}

async function hasConflict(startISO, endISO, excludeId) {
  let q = supabase
    .from("appointments")
    .select("id", { head: true, count: "exact" })
    .lt("starts_at", endISO)
    .gt("ends_at", startISO);
  if (excludeId) q = q.neq("id", excludeId);
  const { count, error } = await q;
  if (error) throw error;
  return (count || 0) > 0;
}

export default function EditAppointmentModal({ open, onOpenChange, appt, onUpdated }) {
  const [date, setDate] = React.useState(appt ? dateStrFromISO(appt.starts_at) : "");
  const [start, setStart] = React.useState(appt ? timeStrFromISO(appt.starts_at) : "");
  const [end, setEnd] = React.useState(appt ? timeStrFromISO(appt.ends_at) : "");
  const [title, setTitle] = React.useState(appt?.title || "");
  const [status, setStatus] = React.useState(appt?.status || "booked");
  const [err, setErr] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [conflict, setConflict] = React.useState(false);

  React.useEffect(() => {
    if (!open || !appt) return;
    setDate(dateStrFromISO(appt.starts_at));
    setStart(timeStrFromISO(appt.starts_at));
    setEnd(timeStrFromISO(appt.ends_at));
    setTitle(appt.title || "");
    setStatus(appt.status || "booked");
  }, [open, appt]);

  React.useEffect(() => {
    if (!date || !start || !end) { setConflict(false); return; }
    (async () => {
      setChecking(true);
      try {
        const s = toUtcIso(date, start);
        const e = toUtcIso(date, end);
        setConflict(await hasConflict(s, e, appt?.id));
      } finally {
        setChecking(false);
      }
    })();
  }, [date, start, end, appt?.id]);

  async function save() {
    setErr("");
    if (!date || !start || !end) return setErr("Pick date, start & end");
    const starts_at = toUtcIso(date, start);
    const ends_at = toUtcIso(date, end);
    try {
      setSaving(true);
      if (await hasConflict(starts_at, ends_at, appt.id)) {
        setConflict(true);
        throw new Error("This time overlaps with another appointment.");
      }
      const { error } = await supabase
        .from("appointments")
        .update({ title: title || "Appointment", status, starts_at, ends_at })
        .eq("id", appt.id);
      if (error) throw error;
      if (onUpdated) onUpdated();
      onOpenChange(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Appointment updated", type: "success" } }));
      }
    } catch (e) {
      setErr(e.message || "Failed to update appointment");
    } finally {
      setSaving(false);
    }
  }

  const conflictHint = !date || !start || !end ? "" : checking ? "Checking…" : conflict ? "⛔ Overlaps" : "✅ Available";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit appointment</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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

          {err && <div className="text-sm text-red-600">{err}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || conflict || !date || !start || !end}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
