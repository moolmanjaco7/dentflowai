// components/PatientHistory.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PRESETS = [
  { key: "2w", label: "+2 weeks", days: 14 },
  { key: "6w", label: "+6 weeks", days: 42 },
  { key: "3m", label: "+3 months", days: 90 },
];

function addDaysDate(d, days) {
  const nd = new Date(d.getTime());
  nd.setDate(nd.getDate() + days);
  return nd;
}
function toSa(dateUtc) {
  return new Date(dateUtc.getTime() + 2 * 60 * 60 * 1000);
}
function fromSaToUtcIso(dateSa) {
  const utc = new Date(dateSa.getTime() - 2 * 60 * 60 * 1000);
  return utc.toISOString();
}

async function hasConflict(startISO, endISO) {
  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .lt("starts_at", endISO)
    .gt("ends_at", startISO);
  if (error) throw error;
  return (count || 0) > 0;
}

export default function PatientHistory({ patientId }) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [creating, setCreating] = React.useState(null); // appt id
  const [presetById, setPresetById] = React.useState({}); // { [apptId]: "6w" }

  const load = React.useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setErr("");
    const { data, error } = await supabase
      .from("appointments")
      .select("id, title, starts_at, ends_at, status")
      .eq("patient_id", patientId)
      .order("starts_at", { ascending: false });
    if (error) setErr(error.message);
    setRows(data || []);
    setLoading(false);
  }, [patientId]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    function onRefresh(evt) {
      if (evt?.detail?.patientId && evt.detail.patientId !== patientId) return;
      load();
    }
    window.addEventListener("patient-history-refresh", onRefresh);
    return () => window.removeEventListener("patient-history-refresh", onRefresh);
  }, [patientId, load]);

  async function createFollowUp(appt, presetKey) {
    try {
      setCreating(appt.id);
      const chosen = PRESETS.find((p) => p.key === presetKey) || PRESETS[1];

      // compute same duration, same SA wall-clock time, shifted by preset days
      const startUtc = new Date(appt.starts_at);
      const endUtc = new Date(appt.ends_at);
      const durMs = endUtc.getTime() - startUtc.getTime();

      const startSa = toSa(startUtc);
      const followSaStart = addDaysDate(startSa, chosen.days);
      const followSaEnd = new Date(followSaStart.getTime() + durMs);

      const starts_at = fromSaToUtcIso(followSaStart);
      const ends_at = fromSaToUtcIso(followSaEnd);

      if (await hasConflict(starts_at, ends_at)) {
        alert("⛔ That follow-up overlaps with an existing appointment.");
        return;
      }

      const { error } = await supabase.from("appointments").insert({
        patient_id: patientId,
        title: appt.title || "Follow-up",
        starts_at,
        ends_at,
        status: "booked",
      });
      if (error) throw error;

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", { detail: { title: `Follow-up created (${chosen.label})`, type: "success" } })
        );
      }
      await load();
    } catch (e) {
      alert(e.message || "Failed to create follow-up");
    } finally {
      setCreating(null);
    }
  }

  if (loading) return <p className="text-sm text-slate-600">Loading history…</p>;
  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!rows.length) return <p className="text-sm text-slate-600">No appointment history.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const preset = presetById[r.id] || "6w";
        return (
          <div key={r.id} className="border rounded-lg bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{r.title || "Appointment"}</div>
                <div className="text-xs text-slate-500">
                  {new Date(r.starts_at).toLocaleString("en-ZA")}
                  {" → "}
                  {new Date(r.ends_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div
                className={`text-xs px-2 py-1 rounded shrink-0 ${
                  r.status === "completed" ? "bg-green-100 text-green-700"
                  : r.status === "cancelled" ? "bg-red-100 text-red-700"
                  : r.status === "no_show" ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
                }`}
              >
                {r.status}
              </div>
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between gap-3">
              <a href={`/dashboard?focus=${r.starts_at}`} className="text-xs underline text-slate-600">
                View on dashboard
              </a>
              <div className="flex items-center gap-2">
                <select
                  value={preset}
                  onChange={(e) => setPresetById((s) => ({ ...s, [r.id]: e.target.value }))}
                  className="border rounded-md px-2 py-1 text-sm"
                  title="Choose follow-up interval"
                >
                  {PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={() => createFollowUp(r, preset)}
                  disabled={creating === r.id}
                >
                  {creating === r.id ? "Creating…" : "Create follow-up"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
