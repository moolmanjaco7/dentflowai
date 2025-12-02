// components/RecallsCard.jsx
import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RecallsCard() {
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  async function fetchRecalls() {
    setLoading(true);
    const { data, error } = await supabase
      .from("recall_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (!error) setRecalls(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchRecalls();
  }, []);

  // 🧠 Handle manual “Send test reminder” button click
  async function handleSendTest() {
    try {
      setSending(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert("You must be logged in to send test reminders.");
        setSending(false);
        return;
      }

      const res = await fetch("/api/recalls/send-queued-admin", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (json.ok) {
        alert(`✅ Sent: ${json.sent} • Failed: ${json.failed}`);
        fetchRecalls();
      } else {
        alert(`❌ Send failed: ${json.error}`);
      }
    } catch (err) {
      alert(`⚠️ Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="p-4 mt-4 shadow-sm border border-slate-200 rounded-xl bg-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">📅 Recalls & Reminders</h2>
        <button
          onClick={handleSendTest}
          disabled={sending}
          className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
            sending
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "hover:bg-slate-50"
          }`}
        >
          {sending ? "Sending..." : "Send Test Reminder"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading recalls...</p>
      ) : recalls.length === 0 ? (
        <p className="text-sm text-slate-500">No recalls found.</p>
      ) : (
        <ul className="divide-y divide-slate-200 text-sm">
          {recalls.map((r) => (
            <li key={r.id} className="py-2 flex justify-between">
              <span>
                <strong>{r.payload?.to || "Unknown"}</strong> —{" "}
                {r.payload?.subject || "Reminder"}
              </span>
              <span
                className={`font-medium ${
                  r.status === "sent"
                    ? "text-green-600"
                    : r.status === "failed"
                    ? "text-red-500"
                    : "text-slate-500"
                }`}
              >
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
