// components/RecallsCard.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TZ = "Africa/Johannesburg";
const tzOffset = "+02:00";
const todaySA = () => new Date(new Date().toLocaleString("en-ZA", { timeZone: TZ }));
const toISODate = (d) => d.toISOString().slice(0,10);

export default function RecallsCard() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [rows, setRows] = React.useState([]);

  const load = React.useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const today = toISODate(todaySA());
      const in30 = toISODate(new Date(todaySA().getTime() + 30*24*3600*1000));
      const { data, error } = await supabase
        .from("recalls")
        .select("id, patient_id, rule_code, due_on, status, snooze_until, patients:patient_id(full_name,patient_code)")
        .gte("due_on", today)
        .lte("due_on", in30)
        .neq("status", "completed")
        .order("due_on", { ascending: true });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      setErr(e.message || "Failed to load recalls");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function markCompleted(id) {
    const prev = rows;
    setRows(r => r.map(x => x.id===id ? { ...x, status: "completed" } : x));
    const { error } = await supabase.from("recalls").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { alert(error.message); setRows(prev); }
  }

  async function snooze30(id) {
    const d = new Date(todaySA().getTime() + 30*24*3600*1000);
    const snooze = d.toISOString().slice(0,10);
    const prev = rows;
    setRows(r => r.map(x => x.id===id ? { ...x, status: "snoozed", snooze_until: snooze } : x));
    const { error } = await supabase.from("recalls").update({ status: "snoozed", snooze_until: snooze, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { alert(error.message); setRows(prev); }
  }

  async function queueReminder(id) {
    // insert a notification row (email by default)
    const rec = rows.find(x => x.id === id);
    if (!rec) return;
    const name = rec.patients?.full_name || "Patient";
    const code = rec.patients?.patient_code || "";
    const { error } = await supabase.from("recall_notifications").insert({
      recall_id: id,
      channel: "email",
      payload: { subject: "Check-up reminder", body: `Hi ${name}, this is a quick reminder for your ${rec.rule_code} around ${rec.due_on}.`, tag: code }
    });
    if (error) return alert(error.message);
    await supabase.from("recalls").update({ status: "notified", last_notified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Reminder queued", type: "success" } }));
    }
    load();
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Recalls (next 30 days)</div>
          <div className="text-xs text-slate-500">Automated follow-ups coming in hot</div>
        </div>
        <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
      </div>

      <Separator className="my-3" />

      {loading ? <p className="text-sm text-slate-600">Loading…</p> :
       err ? <p className="text-sm text-red-600">{err}</p> :
       rows.length === 0 ? <p className="text-sm text-slate-600">No upcoming recalls.</p> : (
        <ul className="grid md:grid-cols-2 gap-3">
          {rows.map(r => {
            const tag = r.patients?.patient_code || (r.patients?.full_name ? (r.patients.full_name.split(/\s+/)[0] + (r.patients.full_name.split(/\s+/).slice(-1)[0]?.[0]||"")).replace(/[^A-Za-z]/g,"") : "");
            return (
              <li key={r.id} className="border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.rule_code}</div>
                    <div className="text-xs text-slate-500">
                      Due: {r.due_on} · <a className="underline" href={`/patients/${r.patient_id}`}>{tag || "Patient"}</a> · Status: {r.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => queueReminder(r.id)}>Remind</Button>
                    <Button size="sm" variant="outline" onClick={() => snooze30(r.id)}>Snooze 30d</Button>
                    <Button size="sm" onClick={() => markCompleted(r.id)}>Complete</Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
