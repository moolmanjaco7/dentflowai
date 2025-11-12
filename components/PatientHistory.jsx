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

// Helpers for SA timezone (+02:00, no DST)
function addDays(d, days) {
  const nd = new Date(d.getTime());
  nd.setDate(nd.getDate() + days);
  return nd;
}
function toSa(dateUtc) {
  // Convert UTC Date -> SA wall clock by adding 2 hours
  return new Date(dateUtc.getTime() + 2 * 60 * 60 * 1000);
}
function fromSaToUtcIso(dateSa) {
  // SA wall clock -> UTC by subtracting 2 hours, then ISO
  const utc = new Date(dateSa.getTime() - 2 * 60 * 60 * 1000);
  return utc.toISOString();
}

export default function PatientHistory({ patientId }) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [creating, setCreating] = React.useState(null); // appointment id while creating follow-up

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

  React.useEffect(() => {
    load();
  }, [load]);

  // 🔁 Auto-refresh when the patient page dispatches this event
  React.useEffect(() => {
    function onRefresh(evt) {
      if (evt?.detail?.patientId && evt.detail.patientId !== patientId) return;
      load();
    }
    window.addEventListener("patient-history-refresh", onRefresh);
    return () => window.removeEventListener("patient-history-refresh", onRefresh);
  }, [patientId, load]);

  async function createFollowUp(appt) {
    try {
      setCreating(appt.id);
      // keep same slot length, shift by +42 days (6 weeks), keep SA wall-clock time
      const startUtc = new Date(appt.starts_at);
      const endUtc = new Date(appt.ends_at);
      const durMs = endUtc.getTime() - startUtc.getTime();

      // to SA wall clock
      const startSa = toSa(startUtc);
      const followSaStart = addDays(startSa, 42); // +6 weeks
      const followSaEnd = new Date(followSaStart.getTime() + durMs);

      const payload = {
        patient_id: patientId,
        title: appt.title || "Follow-up",
        starts_at: fromSaToUtcIso(followSaStart),
        ends_at: fromSaToUtcIso(followSaEnd),
        status: "booked", // matches your DB constraint
      };

      const { error } = await supabase.from("appointments").insert(payload);
      if (error) throw error;

      // toast (optional)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", { detail: { title: "Follow-up created (+6 weeks)", type: "success" } })
        );
      }

      // Refresh list
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
      {rows.map((r) => (
        <div key={r.id} className="border rounded-lg bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {r.title || "Appointment"}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(r.starts_at).toLocaleString("en-ZA")}
                {" → "}
                {new Date(r.ends_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <div
              className={`text-xs px-2 py-1 rounded shrink-0 ${
                r.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : r.status === "cancelled"
                  ? "bg-red-100 text-red-700"
                  : r.status === "no_show"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {r.status}
            </div>
          </div>

          <Separator className="my-2" />

          <div className="flex items-center justify-between">
            <a
              href={`/dashboard?focus=${r.starts_at}`}
              className="text-xs underline text-slate-600"
            >
              View on dashboard
            </a>
            <Button
              size="sm"
              onClick={() => createFollowUp(r)}
              disabled={creating === r.id}
            >
              {creating === r.id ? "Creating…" : "Create follow-up (+6 weeks)"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
