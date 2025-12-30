// pages/reception.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DashboardCalendar from "../components/DashboardCalendar";

function toKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchWithAuth(url, token) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export default function ReceptionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState(toKey(new Date()));
  const [monthKey, setMonthKey] = useState(toKey(new Date()));
  const [search, setSearch] = useState("");
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

  const dayList = useMemo(() => {
    const q = String(search || "").toLowerCase().trim();
    const list = (appointments || []).filter((a) => toKey(a.starts_at) === selectedDateKey);

    if (!q) return list;

    return list.filter((a) => {
      const name = (a.patient?.full_name || "").toLowerCase();
      const phone = (a.patient?.phone || "").toLowerCase();
      const email = (a.patient?.email || "").toLowerCase();
      return `${name} ${phone} ${email}`.includes(q);
    });
  }, [appointments, selectedDateKey, search]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reception</h1>
            <p className="text-xs text-slate-400">Calendar + day list (tenant-safe).</p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/reception-booking"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
            >
              Create booking
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
            >
              Dashboard
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

        {/* Top controls */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),220px,auto] items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / phone / email…"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none placeholder:text-slate-500"
            />
            <input
              type="date"
              value={selectedDateKey}
              onChange={(e) => setSelectedDateKey(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
            />
            <button
              onClick={() => { setSearch(""); setSelectedDateKey(toKey(new Date())); }}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
            >
              Today
            </button>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr),minmax(0,0.6fr)]">
          <div className="space-y-4">
            <DashboardCalendar
              appointments={appointments}
              monthKey={monthKey}
              onChangeMonthKey={(k) => setMonthKey(k)}
              selectedDateKey={selectedDateKey}
              onSelectDateKey={(k) => setSelectedDateKey(k)}
              onSelectAppointment={(a) => setSelectedAppt(a)}
            />

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[12px] font-semibold text-slate-100">Day list</p>
              <p className="text-[12px] text-slate-500">{loading ? "Loading…" : `${dayList.length} appointment(s)`}</p>

              <div className="mt-3 space-y-2">
                {dayList.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAppt(a)}
                    className="w-full text-left rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 hover:border-slate-600"
                  >
                    <p className="text-[13px] font-semibold text-slate-100">
                      {a.patient?.full_name || "Patient"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(a.starts_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })} • {a.status || "—"}
                    </p>
                  </button>
                ))}
                {!loading && dayList.length === 0 && (
                  <p className="text-[12px] text-slate-500">No appointments for this day.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-[12px] font-semibold text-slate-100">Tip</p>
            <p className="mt-2 text-[12px] text-slate-400">
              If the calendar is empty, create a booking via <b>Reception Booking</b> or public <b>/book</b>.
            </p>
          </div>
        </section>

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
