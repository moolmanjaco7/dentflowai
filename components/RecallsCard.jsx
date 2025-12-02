// components/RecallsCard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Queued", value: "queued" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
];

export default function RecallsCard() {
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(null); // id of expanded preview

  async function fetchRecalls() {
    setLoading(true);
    let query = supabase
      .from("recall_notifications")
      .select("id, channel, status, created_at, sent_at, payload")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (!error) setRecalls(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchRecalls(); }, [filter]);

  const filtered = useMemo(() => {
    if (!q) return recalls;
    const qq = q.toLowerCase();
    return recalls.filter(r => {
      const email = r?.payload?.to || "";
      const subject = r?.payload?.subject || "";
      return email.toLowerCase().includes(qq) || subject.toLowerCase().includes(qq);
    });
  }, [recalls, q]);

  async function sendQueuedNow() {
    try {
      setSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return alert("Please log in first.");
      const res = await fetch("/api/recalls/send-queued-admin", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.ok) {
        alert(`✅ Sent: ${json.sent} • Failed: ${json.failed}`);
        fetchRecalls();
      } else {
        alert(`❌ Send failed: ${json.error || "Unknown error"}`);
      }
    } catch (e) {
      alert(`⚠️ Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  }

  async function resendOne(id) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return alert("Please log in first.");

      const res = await fetch("/api/recalls/resend-one.js", { method: "HEAD" });
      // Some hosts block .js path confusion; ensure we hit the correct route:
      const resp = await fetch("/api/recalls/resend-one", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id })
      });
      const json = await resp.json();
      if (json.ok) {
        alert("✅ Reminder sent");
        fetchRecalls();
      } else {
        alert(`❌ ${json.error || "Send failed"}`);
      }
    } catch (e) {
      alert(`⚠️ ${e.message}`);
    }
  }

  return (
    <Card className="p-4 mt-4 shadow-sm border border-slate-200 rounded-xl bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold">📅 Recalls & Reminders</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search email or subject…"
            className="border rounded-md px-3 py-1.5 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="border rounded-md px-2 py-1.5 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={sendQueuedNow}
            disabled={sending}
            className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
              sending ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "hover:bg-slate-50"
            }`}
          >
            {sending ? "Sending…" : "Send Test Reminder"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading recalls…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No recalls found.</p>
      ) : (
        <ul className="divide-y divide-slate-200 text-sm">
          {filtered.map((r) => {
            const isOpen = expanded === r.id;
            return (
              <li key={r.id} className="py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate">
                      <strong>{r.payload?.to || "Unknown"}</strong> — {r.payload?.subject || "Reminder"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleString("en-ZA")} · {r.status}
                      {r.sent_at ? ` · sent ${new Date(r.sent_at).toLocaleString("en-ZA")}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="text-xs px-2 py-1 rounded-md border hover:bg-slate-50"
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                    >
                      {isOpen ? "Hide" : "Preview"}
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded-md border hover:bg-slate-50"
                      onClick={() => resendOne(r.id)}
                    >
                      Re-send
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-2 rounded-md border bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap">
                    {r.payload?.body || "(no body)"}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
