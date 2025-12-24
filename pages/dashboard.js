import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardCalendar from "../components/DashboardCalendar";

function toKey(d) {
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

async function fetchJson(url, options) {
  const res = await fetch(url, { cache: "no-store", ...(options || {}) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState(toKey(new Date()));
  const [monthKey, setMonthKey] = useState(toKey(new Date()));

  const [selectedAppt, setSelectedAppt] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  async function loadAppointments() {
    setLoading(true);
    setError("");

    const candidates = ["/api/appointments/list", "/api/appointments", "/api/appointments/all"];
    let found = null;

    for (const url of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const { ok, status, json } = await fetchJson(url);
      if (ok) {
        found = json;
        break;
      }
      if (status !== 404) {
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

  const dayAppointments = useMemo(() => {
    const k = selectedDateKey;
    if (!k) return [];
    return (appointments || []).filter((a) => toKey(a?.starts_at || a?.start || a?.startsAt) === k);
  }, [appointments, selectedDateKey]);

  const selectedDayLabel = useMemo(() => {
    const d = new Date(selectedDateKey);
    if (Number.isNaN(d.getTime())) return "Selected day";
    return d.toLocaleDateString("en-ZA", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [selectedDateKey]);

  function updateApptInState(updated) {
    setAppointments((prev) => (prev || []).map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    if (selectedAppt?.id === updated.id) setSelectedAppt((p) => ({ ...p, ...updated }));
  }

  async function setAppointmentStatus(appt, mode) {
    const key = process.env.NEXT_PUBLIC_APPT_UPDATE_KEY;
    const url = key
      ? `/api/appointments/update-status?key=${encodeURIComponent(key)}`
      : "/api/appointments/update-status";

    const body =
      mode === "confirm"
        ? { appointment_id: appt.id, status: "confirmed", confirmation_status: "confirmed" }
        : { appointment_id: appt.id, status: "cancelled", confirmation_status: "cancelled" };

    const { ok, json } = await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!ok) {
      alert(json?.error || "Could not update appointment.");
      return;
    }

    updateApptInState(json.appointment);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-xs text-slate-400">Full month calendar is always shown below.</p>
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

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200">
            {error}
          </div>
        )}

        {/* ✅ ALWAYS SHOW MONTH CALENDAR */}
        <DashboardCalendar
          appointments={appointments}
          monthKey={monthKey}
          onChangeMonthKey={(k) => setMonthKey(k)}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={(k) => setSelectedDateKey(k)}
          onSelectAppointment={(a) => setSelectedAppt(a)}
        />
<p className="text-[10px] text-slate-600">
  Build: {process.env.NEXT_PUBLIC_BUILD_ID || "no-build-id"}
</p>

        {/* Day list under calendar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-[12px] text-slate-400">Day view</p>
              <p className="text-[14px] font-semibold text-slate-100">{selectedDayLabel}</p>
            </div>
            <input
              type="date"
              value={selectedDateKey}
              onChange={(e) => setSelectedDateKey(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
            />
          </div>

          <div className="p-4">
            {loading ? (
              <p className="text-sm text-slate-400">Loading appointments…</p>
            ) : dayAppointments.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4">
                <p className="text-[13px] font-semibold text-slate-100">No appointments</p>
                <p className="mt-1 text-[12px] text-slate-400">Create one from Reception Booking.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayAppointments
                  .slice()
                  .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
                  .map((a) => {
                    const patientName =
                      a?.patient?.full_name ||
                      a?.patient_name ||
                      a?.full_name ||
                      a?.patient_full_name ||
                      "Patient";
                    const starts = a?.starts_at || a?.start || a?.startsAt;
                    const ends = a?.ends_at || a?.end || a?.endsAt;

                    return (
                      <button
                        key={a?.id || `${starts}_${patientName}`}
                        onClick={() => setSelectedAppt(a)}
                        className="w-full text-left flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 hover:border-slate-600"
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
                          {a?.status || "booked"}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Appointment modal (unchanged behavior) */}
        {selectedAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <p className="text-[13px] font-semibold text-slate-100">Appointment</p>
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
                >
                  Close
                </button>
              </div>

              <div className="p-4 text-[12px] text-slate-200 space-y-3">
                {(() => {
                  const a = selectedAppt;
                  const patientName =
                    a?.patient?.full_name ||
                    a?.patient_name ||
                    a?.full_name ||
                    a?.patient_full_name ||
                    "Patient";
                  const starts = a?.starts_at || a?.start || a?.startsAt;
                  const ends = a?.ends_at || a?.end || a?.endsAt;

                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center text-[13px] font-semibold">
                          {initials(patientName)}
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-slate-100">{patientName}</p>
                          <p className="text-[11px] text-slate-500">
                            {timeLabel(starts)} – {timeLabel(ends)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmAction({ type: "confirm", appt: a })}
                          className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[12px] font-semibold text-emerald-200 hover:border-emerald-400"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: "cancel", appt: a })}
                          className="flex-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-[12px] font-semibold text-rose-200 hover:border-rose-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {confirmAction && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-[14px] font-semibold text-slate-100">Are you sure?</p>
              <p className="mt-2 text-[12px] text-slate-400">
                {confirmAction.type === "confirm"
                  ? "This will mark the appointment as CONFIRMED."
                  : "This will CANCEL the appointment."}
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-[12px] text-slate-200 hover:border-slate-600"
                >
                  Back
                </button>
                <button
                  onClick={async () => {
                    const { type, appt } = confirmAction;
                    setConfirmAction(null);
                    await setAppointmentStatus(appt, type);
                  }}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-[12px] font-semibold text-slate-100 hover:border-slate-600"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
