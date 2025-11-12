// pages/patients/[id].js
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@supabase/supabase-js";

import Toasts from "@/components/Toast";
import NewAppointmentModal from "@/components/NewAppointmentModal";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import {
  UI_STATUS,
  STATUS_LABEL,
  normalizeUiStatus,
  toDbStatus,
  toUiStatus,
} from "@/lib/status";

const TZ = "Africa/Johannesburg";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PatientDetailsPage() {
  const router = useRouter();
  const { id } = router.query;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [patient, setPatient] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [statusSaving, setStatusSaving] = useState(null);

  // Notes
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (typeof window !== "undefined") window.location.href = "/auth/login";
        return;
      }
      setSession(session);

      // Patient
      const { data: p, error: pErr } = await supabase
        .from("patients")
        .select("id, full_name, email, phone")
        .eq("id", id)
        .maybeSingle();
      if (pErr) throw pErr;
      setPatient(p);

      const nowIso = new Date().toISOString();

      // Upcoming
      const { data: up, error: upErr } = await supabase
        .from("appointments")
        .select("id, title, starts_at, ends_at, status, notes")
        .eq("patient_id", id)
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true });
      if (upErr) throw upErr;

      // History
      const { data: hist, error: hErr } = await supabase
        .from("appointments")
        .select("id, title, starts_at, ends_at, status, notes")
        .eq("patient_id", id)
        .lt("starts_at", nowIso)
        .order("starts_at", { ascending: false });
      if (hErr) throw hErr;

      const hydrate = (rows) =>
        (Array.isArray(rows) ? rows : []).map((a) => ({
          ...a,
          status: toUiStatus(a.status),
        }));

      setUpcoming(hydrate(up));
      setHistory(hydrate(hist));

      // Notes
      const { data: nts, error: nErr } = await supabase
        .from("patient_notes")
        .select("id, content, author, created_at")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (nErr) throw nErr;
      setNotes(Array.isArray(nts) ? nts : []);
    } catch (e) {
      setErr(e?.message || "Failed to load patient");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const stats = useMemo(() => {
    const all = [...upcoming, ...history];
    const s = {
      total: all.length,
      scheduled: 0,
      confirmed: 0,
      checked_in: 0,
      completed: 0,
      no_show: 0,
      cancelled: 0,
    };
    for (const a of all) s[normalizeUiStatus(a.status)]++;
    return s;
  }, [upcoming, history]);

  async function changeStatus(aptId, newUiStatus) {
    const newDb = toDbStatus(newUiStatus);
    const prevU = upcoming;
    const prevH = history;

    setStatusSaving(aptId);
    const norm = normalizeUiStatus(newUiStatus);
    setUpcoming((list) => list.map((a) => (a.id === aptId ? { ...a, status: norm } : a)));
    setHistory((list) => list.map((a) => (a.id === aptId ? { ...a, status: norm } : a)));

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newDb })
        .eq("id", aptId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Status updated", type: "success" } }));
    } catch (e) {
      setUpcoming(prevU);
      setHistory(prevH);
      window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Failed to update", type: "error" } }));
    } finally {
      setStatusSaving(null);
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    try {
      const { data, error } = await supabase
        .from("patient_notes")
        .insert({
          patient_id: id,
          content: noteText.trim(),
          author: session?.user?.email || null,
        })
        .select("id, content, author, created_at")
        .maybeSingle();
      if (error) throw error;
      setNotes((n) => [data, ...n]);
      setNoteText("");
      window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Note added", type: "success" } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Failed to add note", type: "error" } }));
    } finally {
      setNoteSaving(false);
    }
  }

  return (
    <>
      <Head><title>DentFlow AI — Patient</title></Head>
      <Toasts />
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{patient?.full_name || "Patient"}</h1>
              <div className="text-sm text-slate-600">
                {patient?.email || "—"} · {patient?.phone || "—"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {patient && (
                <NewAppointmentModal
                  defaultDate={new Date()}
                  fixedPatientId={patient.id}
                  fixedPatientName={patient.full_name}
                  onCreated={load}
                />
              )}
              <Link href="/patients" className="text-sm underline">Back to Patients</Link>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Chip label="Total" value={stats.total} />
            <Chip label="Scheduled" value={stats.scheduled} />
            <Chip label="Confirmed" value={stats.confirmed} />
            <Chip label="Checked-in" value={stats.checked_in} />
            <Chip label="Completed" value={stats.completed} />
            <Chip label="No Show" value={stats.no_show} />
            <Chip label="Cancelled" value={stats.cancelled} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Upcoming */}
            <Card className="p-3 lg:col-span-2">
              <div className="text-sm font-semibold mb-2">Upcoming</div>
              {loading ? (
                <Loader />
              ) : err ? (
                <div className="text-sm text-red-600">{err}</div>
              ) : upcoming.length === 0 ? (
                <div className="text-sm text-slate-600">No upcoming appointments.</div>
              ) : (
                <ul>
                  {upcoming.map((a, idx) => (
                    <li key={a.id}>
                      {idx !== 0 && <Separator className="my-2" />}
                      <Row a={a} changeStatus={changeStatus} statusSaving={statusSaving} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Notes */}
            <Card className="p-3">
              <div className="text-sm font-semibold mb-2">Notes</div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Write a note about this patient…"
                  value={noteText}
                  onChange={(e)=>setNoteText(e.target.value)}
                />
                <Button disabled={noteSaving || !noteText.trim()} onClick={addNote}>
                  {noteSaving ? "Saving…" : "Add note"}
                </Button>
              </div>
              <Separator className="my-3" />
              {notes.length === 0 ? (
                <div className="text-sm text-slate-600">No notes yet.</div>
              ) : (
                <ul className="space-y-2">
                  {notes.map(n => (
                    <li key={n.id} className="rounded-md border p-2 bg-white">
                      <div className="text-xs text-slate-500">
                        {new Date(n.created_at).toLocaleString("en-ZA")} · {n.author || "—"}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{n.content}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* History */}
            <Card className="p-3 lg:col-span-2">
              <div className="text-sm font-semibold mb-2">History</div>
              {loading ? (
                <Loader />
              ) : err ? (
                <div className="text-sm text-red-600">{err}</div>
              ) : history.length === 0 ? (
                <div className="text-sm text-slate-600">No past appointments.</div>
              ) : (
                <ul>
                  {history.map((a, idx) => (
                    <li key={a.id}>
                      {idx !== 0 && <Separator className="my-2" />}
                      <Row a={a} changeStatus={changeStatus} statusSaving={statusSaving} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </section>
      </main>
    </>
  );
}

function Loader() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
      Loading…
    </div>
  );
}

function Chip({ label, value }) {
  return (
    <div className="text-xs px-2 py-1 rounded-full border bg-slate-50 text-slate-700">
      <span className="font-medium">{label}:</span> {value ?? 0}
    </div>
  );
}

function Row({ a, changeStatus, statusSaving }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="text-sm font-medium">{a.title || "Appointment"}</div>
        <div className="text-xs text-muted-foreground">
          {formatInTimeZone(new Date(a.starts_at), TZ, "EEE, dd MMM yyyy · HH:mm")} —{" "}
          {a.ends_at
            ? formatInTimeZone(new Date(a.ends_at), TZ, "HH:mm zzz")
            : formatInTimeZone(new Date(a.starts_at), TZ, "HH:mm zzz")}
        </div>
        {a.notes && <div className="text-xs text-slate-600 line-clamp-2">{a.notes}</div>}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={badgeVariant(a.status)} className="shrink-0 capitalize">
          {STATUS_LABEL[a.status] || "Scheduled"}
        </Badge>
        <select
          value={normalizeUiStatus(a.status)}
          onChange={(e) => changeStatus(a.id, e.target.value)}
          className="text-xs border rounded-md px-2 py-1 bg-white"
          disabled={statusSaving === a.id}
          aria-label="Change status"
        >
          {UI_STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function badgeVariant(uiStatus) {
  switch (normalizeUiStatus(uiStatus)) {
    case "confirmed":
    case "checked_in":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
    case "no_show":
      return "destructive";
    case "scheduled":
    default:
      return "outline";
  }
}
