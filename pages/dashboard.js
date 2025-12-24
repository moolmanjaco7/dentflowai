// pages/dashboard.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function toLocalDateKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeLabel(iso) {
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export default function DashboardPage() {
  // ✅ Fix: define activeTab so build never crashes
  const [activeTab, setActiveTab] = useState("today"); // today | week | month
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);

  // we use local date by default
  const [selectedDate, setSelectedDate] = useState(toLocalDateKey(new Date()));

  async function loadAppointments() {
    setLoading(true);
    setError("");

    // Try likely endpoints in your repo. Use the first that exists.
    const candidates = [
      "/api/appointments/list",
      "/api/appointments",
      "/api/appointments/all",
    ];

    let found = null;

    for (const url of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const { ok, status, json } = await fetchJson(url);
      if (ok) {
        found = json;
        break;
      }
      // 404 means endpoint doesn't exist, try next
      if (status !== 404) {
        // Some other failure (401/500)
        setError(json?.error || `Could not load appointments (${status}).`);
        setLoading(false);
        return;
      }
    }

    if (!found) {
      setAppointments([]);
      setError("Could not load appointments (no appointments API found).");
      setLoading(false);
      return;
    }

    // Accept multiple shapes:
    // { appointments: [...] } or { data: [...] } or [...]
    const list =
      Array.isArray(found) ? found :
      Array.isArray(found?.appointments) ? found.appointments :
      Array.isArray(found?.data) ? found.data :
      [];

    setAppointments(list);
    setLoading(false);
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const filtered = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];

    const sd = selectedDate;
    if (!sd) return appointments;

    // Filter by selectedDate in local time
    return appointments.filter((a) => {
      const key = toLocalDateKey(a?.starts_at || a?.start || a?.startsAt);
      return key === sd;
    });
  }, [appointments, selectedDate]);

  const todayLabel = useMemo(() => {
    try {
      const dt = new Date(selectedDate);
      if (Number.isNaN(dt.getTime())) return "Selected day";
      return dt.toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "Selected day";
    }
  }, [selectedDate]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-xs text-slate-400">Appointments and clinic overview.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/reception-booking"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
            >
              Reception booking
            </Link>
            <button
              onClick={loadAppointments}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { k: "today", label: "Day" },
            { k: "week", label: "Week" },
            { k: "month", label: "Month" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setActiveTab(t.k)}
              className={`rounded-xl border px-3 py-2 text-[12px] ${
                activeTab === t.k
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] text-slate-400">Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
          {/* Appointment list */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
            <div className="border-b border-slate-800 px-4 py-3">
              <p className="text-[12px] font-semibold text-slate-100">{todayLabel}</p>
              <p className="text-[11px] text-slate-500">Showing appointments for selected date.</p>
            </div>

            <div className="p-4">
              {loading ? (
                <p className="text-sm text-slate-400">Loading appointments…</p>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4">
                  <p className="text-[13px] font-semibold text-slate-100">No appointments</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    Create one from Reception Booking.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered
                    .slice()
                    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
                    .map((a) => {
                      const patientName =
                        a?.patient?.full_name ||
                        a?.patient_name ||
                        a?.full_name ||
                        a?.patient_full_name ||
                        "Patient";
                      const status = a?.status || "booked";
                      const starts = a?.starts_at || a?.start || a?.startsAt;
                      const ends = a?.ends_at || a?.end || a?.endsAt;

                      return (
                        <div
                          key={a?.id || `${starts}_${patientName}`}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl border border-slate-700 bg-slate-950/40 flex items-center justify-center text-[12px] text-slate-100">
                              {initials(patientName)}
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-slate-100">{patientName}</p>
                              <p className="text-[11px] text-slate-500">
                                {timeLabel(starts)} – {timeLabel(ends)}
                              </p>
                            </div>
                          </div>

                          <span className="rounded-full border border-slate-700 bg-slate-950/40 px-2 py-1 text-[11px] text-slate-200">
                            {status}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Quick links / stats */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[12px] font-semibold text-slate-100">Quick actions</p>
              <div className="mt-3 grid gap-2">
                <Link
                  href="/patients"
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
                >
                  View patients
                </Link>
                <Link
                  href="/reception-booking"
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
                >
                  Create booking
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[12px] font-semibold text-slate-100">WhatsApp reminders</p>
              <p className="mt-1 text-[12px] text-slate-400">
                Queue and send reminders using your worker endpoints when ready.
              </p>
              <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                <div className="font-mono">/api/whatsapp/queue-reminders</div>
                <div className="font-mono">/api/whatsapp/send-queued</div>
              </div>
            </div>
          </div>
        </section>

        {/* Note: activeTab is currently UI-only; week/month views can be re-added later */}
      </div>
    </main>
  );
}
