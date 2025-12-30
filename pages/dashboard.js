// pages/dashboard.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DashboardCalendar from "../components/DashboardCalendar";

async function fetchWithAuth(url, token) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [monthKey, setMonthKey] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [selectedDateKey, setSelectedDateKey] = useState(monthKey);
  const [selectedAppt, setSelectedAppt] = useState(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon);
  }, []);

  async function loadAppointments() {
    setLoading(true);
    setError("");

    if (!supabase) {
      setError("Supabase env vars missing on client.");
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) {
      setError("Missing token (not logged in).");
      setLoading(false);
      return;
    }

    const { ok, json } = await fetchWithAuth("/api/appointments/list", token);
    if (!ok) {
      setError(json?.error || "Could not load appointments.");
      setAppointments([]);
      setLoading(false);
      return;
    }

    setAppointments(Array.isArray(json?.appointments) ? json.appointments : []);
    setLoading(false);
  }

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-xs text-slate-400">Month calendar + clickable appointments.</p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/reception"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
            >
              Reception
            </Link>
            <Link
              href="/patients"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
            >
              Patients
            </Link>
            <button
              onClick={loadAppointments}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
            >
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200">
            {error}
          </div>
        )}

        <DashboardCalendar
          appointments={appointments}
          monthKey={monthKey}
          onChangeMonthKey={(k) => setMonthKey(k)}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={(k) => setSelectedDateKey(k)}
          onSelectAppointment={(a) => setSelectedAppt(a)}
        />

        {/* Optional quick list */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-slate-100">Latest appointments</p>
            <p className="text-[12px] text-slate-500">{loading ? "Loading…" : `${appointments.length}`}</p>
          </div>
          <div className="mt-3 space-y-2">
            {(appointments || []).slice(0, 10).map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAppt(a)}
                className="w-full text-left rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 hover:border-slate-600"
              >
                <p className="text-[13px] font-semibold text-slate-100">
                  {(a.patient?.full_name || "Patient")} • {new Date(a.starts_at).toLocaleString("en-ZA")}
                </p>
                <p className="text-[11px] text-slate-500">status: {a.status || "—"}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Simple modal */}
        {selectedAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold">Appointment</p>
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 text-[12px] text-slate-200 space-y-1">
                <div><b>Patient:</b> {selectedAppt.patient?.full_name || "Patient"}</div>
                <div><b>Start:</b> {new Date(selectedAppt.starts_at).toLocaleString("en-ZA")}</div>
                <div><b>End:</b> {new Date(selectedAppt.ends_at).toLocaleString("en-ZA")}</div>
                <div><b>Status:</b> {selectedAppt.status || "—"}</div>
                {selectedAppt.notes ? <div><b>Notes:</b> {selectedAppt.notes}</div> : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
