// components/NewAppointmentModal.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generatePatientCode } from "@/lib/patientCode";

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
  // patient selection / creation
  const [patientQuery, setPatientQuery] = React.useState("");
  const [patientResults, setPatientResults] = React.useState([]);
  const [selectedPatientId, setSelectedPatientId] = React.useState(fixedPatientId || null);
  const [newEmail, setNewEmail] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const creatingNew = !selectedPatientId && patientQuery.trim().length > 0;

  // appointment fields
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState(defaultDate || "");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [status, setStatus] = React.useState("booked");

  // UI state
  const [busyRanges, setBusyRanges] = React.useState([]);
  const [err, setErr] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [conflict, setConflict] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (defaultDate) setDate(defaultDate);
    if (fixedPatientId) setSelectedPatientId(fixedPatientId);
  }, [open, defaultDate, fixedPatientId]);

  // simple live search by name
  React.useEffect(() => {
    if (!open) return;
    const q = patientQuery.trim();
    if (!q || fixedPatientId) { setPatientResults([]); return; }
    const run = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, patient_code, email, phone")
        .ilike("full_name", `%${q}%`)
        .order("full_name", { ascending: true })
        .limit(6);
      if (!error) setPatientResults(data || []);
    };
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [open, patientQuery, fixedPatientId]);

  // load taken slots for that day
  React.useEffect(() => {
    if (!open || !date) return;
    (async () => {
      const dayStart = new Date(`${date}T00:00:00${tzOffset}`).toISOString();
      const dayEnd   = new Date(`${date}T23:59:59${tzOffset}`).toISOString();
      const { data, error } = await supabase
        .from("appointments")
        .select("starts_at,ends_at,title")
        .gte("starts_at", dayStart)
        .lte("starts_at", dayEnd)
        .order("starts_at", { ascending: true });
      if (!error && data) {
        setBusyRanges(data.map(r => ({ startISO: r.starts_at, endISO: r.ends_at, title: r.title })));
      }
    })();
  }, [open, date]);

  // live conflict hint
  React.useEffect(() => {
    if (!date || !start || !end) { setConflict(false); return; }
    (async () => {
      setChecking(true);
      try {
        const s = toUtcIso(date, start);
        const e = toUtcIso(date, end);
        setConflict(await hasConflict(s, e));
      } finally {
        setChecking(false);
      }
    })();
  }, [date, start, end]);

  async function ensurePatientId() {
    if (selectedPatientId || fixedPatientId) return selectedPatientId || fixedPatientId;
    // create new patient
    const full_name = patientQuery.trim();
    if (!full_name) throw new Error("Enter patient name");
    const code = await generatePatientCode(supabase, full_name);

    const { data, error } = await supabase
      .from("patients")
      .insert({
        full_name,
        email: newEmail || null,
        phone: newPhone || null,
        patient_code: code
      })
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return data?.id;
  }

  async function createAppt() {
    try {
      setErr("");
      if (!date || !start || !end) throw new Error("Pick date, start & end");
      if (!UI_STATUS.includes(status)) throw new Error("Invalid status");

      setSaving(true);

      const pid = await ensurePatientId();

      const starts_at = toUtcIso(date, start);
      const ends_at = toUtcIso(date, end);

      if (await hasConflict(starts_at, ends_at)) {
        setConflict(true);
        throw new Error("This time overlaps with another appointment.");
      }

      const { data, error } = await supabase
        .from("appointments")
        .insert({ patient_id: pid, title: title || "Appointment", starts_at, ends_at, status })
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (onCreated) onCreated(data?.id || null);
      onOpenChange(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Appointment created", type: "success" } }));
      }

      // reset for next open
      if (!fixedPatientId) {
        setSelectedPatientId(null);
        setPatientQuery("");
        setNewEmail(""); setNewPhone("");
      }
      setTitle(""); setStart(""); setEnd("");
    } catch (e) {
      setErr(e.message || "Failed to create appointment");
    } finally {
      setSaving(false);
    }
  }

  const conflictHint = !date || !start || !end ? "" : checking ? "Checking…" : conflict ? "⛔ Overlaps" : "✅ Available";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New appointment</DialogTitle></DialogHeader>

        <div className="grid gap-3">
          {/* Patient select / create */}
          {!fixedPatientId && (
            <div className="grid gap-1">
              <Label>Patient</Label>
              <Input
                placeholder="Type a name (e.g. John Smith)"
                value={patientQuery}
                onChange={(e) => {
                  setPatientQuery(e.target.value);
                  setSelectedPatientId(null); // reset selection when typing
                }}
              />
              {/* results */}
              {patientResults.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-auto bg-white">
                  {patientResults.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => { setSelectedPatientId(p.id); setPatientQuery(p.full_name); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${selectedPatientId===p.id ? "bg-slate-100" : ""}`}
                    >
                      <div className="font-medium">{p.full_name}</div>
                      <div className="text-xs text-slate-500">
                        {p.patient_code ? `Tag: ${p.patient_code}` : ""} {p.email ? ` · ${p.email}` : ""} {p.phone ? ` · ${p.phone}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {/* creation hint */}
              {creatingNew && (
                <div className="text-xs text-slate-600">
                  New patient will be created as <span className="font-medium">“{patientQuery.trim()}”</span>.
                </div>
              )}

              {/* extra fields when creating new */}
              {creatingNew && (
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Email (optional)</Label>
                    <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@clinic.com" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Phone (optional)</Label>
                    <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+27 ..." />
                  </div>
                </div>
              )}
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
            <Button onClick={createAppt} disabled={saving || conflict || !date || !start || !end || (!fixedPatientId && !patientQuery.trim())}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
