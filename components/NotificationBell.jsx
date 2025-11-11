// components/NotificationBell.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";

const TZ = "Africa/Johannesburg";
const POLL_MS = 60_000; // refresh every 60s

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [count, setCount] = React.useState(0);

  async function load() {
    const now = new Date();
    const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from("appointments")
      .select("id,title,starts_at,ends_at,status,patient_id")
      .gte("starts_at", now.toISOString())
      .lt("starts_at", next.toISOString())
      .order("starts_at", { ascending: true })
      .limit(10);

    if (!error && Array.isArray(data)) {
      setItems(data);
      setCount(data.length);
    }
  }

  React.useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    function onClick(e) {
      if (!open) return;
      const menu = document.getElementById("notif-menu");
      const btn = document.getElementById("notif-btn");
      if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
        setOpen(false);
      }
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        id="notif-btn"
        onClick={() => setOpen((v) => !v)}
        className="relative text-sm px-3 py-2 rounded-md border bg-white hover:bg-slate-50"
        aria-label="Notifications"
      >
        🔔
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notif-menu"
          className="absolute right-0 mt-2 w-80 rounded-lg border bg-white shadow-lg z-50 p-2"
        >
          <div className="px-2 py-1 text-xs font-semibold text-slate-700">
            Next 24 hours
          </div>
          {items.length === 0 ? (
            <div className="p-3 text-sm text-slate-600">No upcoming appointments.</div>
          ) : (
            <ul className="max-h-80 overflow-auto">
              {items.map((a) => (
                <li key={a.id} className="p-2 hover:bg-slate-50 rounded-md">
                  <div className="text-sm font-medium">
                    {a.title || "Appointment"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {formatInTimeZone(new Date(a.starts_at), TZ, "EEE, dd MMM · HH:mm")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
