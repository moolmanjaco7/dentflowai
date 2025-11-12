// components/DayAppointments.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import NewAppointmentModal from "@/components/NewAppointmentModal";
import EditAppointmentModal from "@/components/EditAppointmentModal";
import { baseFromName } from "@/lib/patientCode";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ALLOWED = ["booked","confirmed","checked_in","completed","no_show","cancelled"];
const STATUS_LABEL = { booked:"Scheduled", confirmed:"Confirmed", checked_in:"Checked-in", completed:"Completed", no_show:"No Show", cancelled:"Cancelled" };

const TZ = "Africa/Johannesburg";
const tzOffset = "+02:00";

function isoDayBounds(dateStr) {
  const s = new Date(`${dateStr}T00:00:00${tzOffset}`).toISOString();
  const e = new Date(`${dateStr}T23:59:59${tzOffset}`).toISOString();
  return { s, e };
}

export default function DayAppointments() {
  const [date, setDate] = React.useState(() => {
    const now = new Date(new Date().toLocaleString("en-ZA", { timeZone: TZ }));
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth()+1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [list, setList] = React.useState([]);
  const [patientsMap, setPatientsMap] = React.useState({}); // {id: {patient_code, full_name}}
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [newOpen, setNewOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editAppt, setEditAppt] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const { s, e } = isoDayBounds(date);
      const { data: appts, error } = await supabase
        .from("appointments")
        .select("id,title,starts_at,ends_at,status,patient_id")
        .gte("starts_at", s)
        .lte("starts_at", e)
        .order("starts_at", { ascending: true });
      if (error) throw error;

      setList(appts || []);

      // fetch patients for these appts (no join assumptions)
      const ids = Array.from(new Set((appts || []).map(a => a.patient_id).filter(Boolean)));
      if (ids.length) {
        const { data: pats, error: pErr } = await supabase
          .from("patients")
          .select("id, full_name, patient_code")
          .in("id", ids);
        if (pErr) throw pErr;
        const map = {};
        (pats || []).forEach(p => { map[p.id] = p; });
        setPatientsMap(map);
      } else {
        setPatientsMap({});
      }
    } catch (e) {
      setErr(e.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => { load(); }, [load]);

  function openEdit(a) { setEditAppt(a); setEditOpen(true); }

  async function setStatus(id, next) {
    if (!ALLOWED.includes(next)) return;
    const prev = list;
    setList((rows) => rows.map(r => r.id === id ? { ...r, status: next } : r));
    const { error } = await supabase.from("appointments").update({ status: next }).eq("id", id);
    if (error) {
      setList(prev);
      alert(error.message);
    }
  }

  function tagFor(appt) {
    if (!appt.patient_id) return null;
    const p = patientsMap[appt.patient_id];
    if (!p) return null;
    return p.patient_code || baseFromName(p.full_name);
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Appointments</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> Booked
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500" /> Confirmed
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Completed
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> No show
          </div>
          <Button size="sm" onClick={() => setNewOpen(true)}>+ New</Button>
        </div>
      </div>

      <Separator className="my-3" />

      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-600">No appointments.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((a) => {
            const tag = tagFor(a);
            return (
              <div key={a.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.title || "Appointment"}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(a.starts_at).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}
                      {"–"}
                      {new Date(a.ends_at).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}
                      {a.patient_id && (
                        <> · <a className="underline" href={`/patients/${a.patient_id}`}>{tag || "Patient"}</a></>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      className="border rounded-md px-2 py-1 text-xs"
                      value={a.status}
                      onChange={(e) => setStatus(a.id, e.target.value)}
                    >
                      {ALLOWED.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    <Button size="sm" variant="outline" onClick={() => openEdit(a)}>Edit</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New modal */}
      <NewAppointmentModal
        open={newOpen}
        onOpenChange={(v) => { setNewOpen(v); if (!v) load(); }}
        defaultDate={date}
        onCreated={() => load()}
      />

      {/* Edit modal */}
      {editAppt && (
        <EditAppointmentModal
          open={editOpen}
          onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditAppt(null); load(); } }}
          appt={editAppt}
          onUpdated={() => load()}
        />
      )}
    </div>
  );
}
