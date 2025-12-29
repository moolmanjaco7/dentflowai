// pages/reception.js
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

function normalize(s) {
  return String(s || "").toLowerCase().trim();
}

function statusLabel(appt) {
  const status = normalize(appt?.status);
  const conf = normalize(appt?.confirmation_status);

  if (status === "cancelled" || conf === "cancelled") return { label: "cancelled", tone: "rose" };
  if (status === "completed") return { label: "completed", tone: "slate" };
  if (status === "no_show") return { label: "no-show", tone: "violet" };
  if (status === "confirmed" || conf === "confirmed") return { label: "confirmed", tone: "emerald" };
  return { label: "booked", tone: "amber" };
}

function badgeClass(tone) {
  if (tone === "rose") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (tone === "emerald") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (tone === "violet") return "border-violet-500/30 bg-violet-500/10 text-violet-200";
  if (tone === "slate") return "border-slate-700 bg-slate-900/40 text-slate-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

async function fetchJson(url, options) {
  const res = await fetch(url, { cache: "no-store", ...(options || {}) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

function getPatientName(a) {
  return (
    a?.patient?.full_name ||
    a?.patient_name ||
    a?.full_name ||
    a?.patient_full_name ||
    "Patient"
  );
}

function getPatientPhone(a) {
  return a?.patient?.phone || a?.phone || a?.patient_phone || "";
}

function getPatientEmail(a) {
  return a?.patient?.email || a?.email || a?.patient_email || "";
}

function toLocalInputValue(iso) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export default function ReceptionCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [appointments, setAppointments] = useState([]);

  const [selectedDateKey, setSelectedDateKey] = useState(toKey(new Date()));
  const [monthKey, setMonthKey] = useState(toKey(new Date()));

  const [search, setSearch] = useState("");

  const [selectedAppt, setSelectedAppt] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type, appt }

  // edit modal state
  const [editMode, setEditMode] = useState(null); // "notes" | "reschedule" | null
  const [editNotes, setEditNotes] = useState("");
  const [editStartLocal, setEditStartLocal] = useState("");
  const [editEndLocal, setEditEndLocal] = useState("");

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

  const filteredDayAppointments = useMemo(() => {
    const q = normalize(search);
    if (!q) return dayAppointments;

    return (dayAppointments || []).filter((a) => {
      const name = getPatientName(a);
      const phone = getPatientPhone(a);
      const email = getPatientEmail(a);
      const init = initials(name);
      const hay = normalize(`${name} ${phone} ${email} ${init}`);
      return hay.includes(q);
    });
  }, [dayAppointments, search]);

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

    let body;
    if (mode === "confirm") body = { appointment_id: appt.id, status: "confirmed", confirmation_status: "confirmed" };
    else if (mode === "cancel") body = { appointment_id: appt.id, status: "cancelled", confirmation_status: "cancelled" };
    else if (mode === "complete") body = { appointment_id: appt.id, status: "completed" };
    else if (mode === "no_show") body = { appointment_id: appt.id, status: "no_show" };
    else body = { appointment_id: appt.id };

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

  async function updateAppointment(appt, patch) {
    const secret = process.env.NEXT_PUBLIC_APPT_EDIT_KEY; // optional public pass-through
    const apiKey = process.env.NEXT_PUBLIC_APPT_EDIT_KEY ? `&key=${encodeURIComponent(secret)}` : "";
    // We use server secret actually in query; easiest is to use a public env that matches APPT_UPDATE_SECRET.
    // If you prefer not to expose, tell me and we’ll switch to session auth.
    const url = `/api/appointments/update?key=${encodeURIComponent(process.env.NEXT_PUBLIC_APPT_EDIT_KEY || "")}`;

    const { ok, json } = await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: appt.id, ...patch }),
    });

    if (!ok) {
      alert(json?.error || "Could not update appointment.");
      return;
    }

    updateApptInState(json.appointment);
  }

  function openNotesEditor(appt) {
    setEditMode("notes");
    setEditNotes(String(appt?.notes || ""));
  }

  function openRescheduleEditor(appt) {
    setEditMode("reschedule");
    const starts = appt?.starts_at || appt?.start || appt?.startsAt;
    const ends = appt?.ends_at || appt?.end || appt?.endsAt;
    setEditStartLocal(starts ? toLocalInputValue(starts) : "");
    setEditEndLocal(ends ? toLocalInputValue(ends) : "");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reception</h1>
            <p className="text-xs text-slate-400">Search + day controls above the calendar. Click appointments to manage.</p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* ✅ TOP CONTROLS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),220px,auto] items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / initials / phone / email…"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none placeholder:text-slate-500"
            />
            <input
              type="date"
              value={selectedDateKey}
              onChange={(e) => setSelectedDateKey(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDateKey(toKey(new Date()))}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
              >
                Today
              </button>
              <button
                onClick={() => setSearch("")}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] text-slate-400">Selected day</p>
              <p className="text-[14px] font-semibold text-slate-100">{selectedDayLabel}</p>
            </div>

            {/* legend stays */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className={`rounded-full border px-2 py-1 ${badgeClass("amber")}`}>booked</span>
              <span className={`rounded-full border px-2 py-1 ${badgeClass("emerald")}`}>confirmed</span>
              <span className={`rounded-full border px-2 py-1 ${badgeClass("rose")}`}>cancelled</span>
              <span className={`rounded-full border px-2 py-1 ${badgeClass("slate")}`}>completed</span>
              <span className={`rounded-full border px-2 py-1 ${badgeClass("violet")}`}>no-show</span>
            </div>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr),minmax(0,0.6fr)]">
          {/* Calendar */}
          <div className="space-y-4">
            <DashboardCalendar
              appointments={appointments}
              monthKey={monthKey}
              onChangeMonthKey={(k) => setMonthKey(k)}
              selectedDateKey={selectedDateKey}
              onSelectDateKey={(k) => setSelectedDateKey(k)}
              onSelectAppointment={(a) => setSelectedAppt(a)}
            />

            {/* Day list */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-[12px] text-slate-400">Appointments for {selectedDayLabel}</p>
              </div>

              <div className="p-4">
                {loading ? (
                  <p className="text-sm text-slate-400">Loading appointments…</p>
                ) : filteredDayAppointments.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4">
                    <p className="text-[13px] font-semibold text-slate-100">No matching appointments</p>
                    <p className="mt-1 text-[12px] text-slate-400">Try clearing search or choose another day.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDayAppointments
                      .slice()
                      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
                      .map((a) => {
                        const name = getPatientName(a);
                        const starts = a?.starts_at || a?.start || a?.startsAt;
                        const ends = a?.ends_at || a?.end || a?.endsAt;
                        const st = statusLabel(a);

                        return (
                          <button
                            key={a?.id || `${starts}_${name}`}
                            onClick={() => setSelectedAppt(a)}
                            className="w-full text-left flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 hover:border-slate-600"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-xl border border-slate-700 bg-slate-950/40 flex items-center justify-center text-[12px] text-slate-100 shrink-0">
                                {initials(name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-slate-100 truncate">{name}</p>
                                <p className="text-[11px] text-slate-500">
                                  {timeLabel(starts)} – {timeLabel(ends)}
                                </p>
                              </div>
                            </div>

                            <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] ${badgeClass(st.tone)}`}>
                              {st.label}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side tips */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[12px] font-semibold text-slate-100">Workflow</p>
              <ul className="mt-2 space-y-2 text-[12px] text-slate-400">
                <li>• Click appointment → Confirm / Cancel / Completed / No-show.</li>
                <li>• Use Notes to add instructions (x-rays, meds, etc.).</li>
                <li>• Use Reschedule to move time/date without rebooking.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Appointment modal */}
        {selectedAppt && (() => {
          const a = selectedAppt;
          const name = getPatientName(a);
          const phone = getPatientPhone(a);
          const email = getPatientEmail(a);
          const starts = a?.starts_at || a?.start || a?.startsAt;
          const ends = a?.ends_at || a?.end || a?.endsAt;
          const st = statusLabel(a);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                  <p className="text-[13px] font-semibold text-slate-100">Appointment</p>
                  <button
                    onClick={() => { setSelectedAppt(null); setEditMode(null); }}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
                  >
                    Close
                  </button>
                </div>

                <div className="p-4 text-[12px] text-slate-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center text-[13px] font-semibold">
                      {initials(name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-slate-100 truncate">{name}</p>
                      <p className="text-[11px] text-slate-500">
                        {timeLabel(starts)} – {timeLabel(ends)}
                      </p>
                      {(phone || email) && (
                        <p className="text-[11px] text-slate-500 truncate">
                          {phone ? phone : ""}{phone && email ? " • " : ""}{email ? email : ""}
                        </p>
                      )}
                    </div>
                    <span className={`ml-auto shrink-0 rounded-full border px-2 py-1 text-[11px] ${badgeClass(st.tone)}`}>
                      {st.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirmAction({ type: "confirm", appt: a })}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[12px] font-semibold text-emerald-200 hover:border-emerald-400"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: "cancel", appt: a })}
                      className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-[12px] font-semibold text-rose-200 hover:border-rose-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: "complete", appt: a })}
                      className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-[12px] font-semibold text-slate-100 hover:border-slate-500"
                    >
                      Mark Completed
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: "no_show", appt: a })}
                      className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-3 text-[12px] font-semibold text-violet-200 hover:border-violet-400"
                    >
                      No-show
                    </button>
                  </div>

                  {/* Edit controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openNotesEditor(a)}
                      className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-[12px] font-semibold text-slate-100 hover:border-slate-600"
                    >
                      Edit Notes
                    </button>
                    <button
                      onClick={() => openRescheduleEditor(a)}
                      className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-[12px] font-semibold text-slate-100 hover:border-slate-600"
                    >
                      Reschedule
                    </button>
                  </div>

                  {/* Notes editor */}
                  {editMode === "notes" && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-2">
                      <p className="text-[12px] font-semibold text-slate-100">Notes</p>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[12px] text-slate-100 outline-none"
                        placeholder="Add notes (optional)…"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditMode(null)}
                          className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            await updateAppointment(a, { notes: editNotes });
                            setEditMode(null);
                          }}
                          className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-200 hover:border-emerald-400"
                        >
                          Save notes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reschedule editor */}
                  {editMode === "reschedule" && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-2">
                      <p className="text-[12px] font-semibold text-slate-100">Reschedule</p>

                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <p className="text-[11px] text-slate-400 mb-1">Start</p>
                          <input
                            type="datetime-local"
                            value={editStartLocal}
                            onChange={(e) => setEditStartLocal(e.target.value)}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[12px] text-slate-100 outline-none"
                          />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 mb-1">End</p>
                          <input
                            type="datetime-local"
                            value={editEndLocal}
                            onChange={(e) => setEditEndLocal(e.target.value)}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[12px] text-slate-100 outline-none"
                          />
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Tip: use a 30-minute slot (e.g., 14:00–14:30).
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditMode(null)}
                          className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!editStartLocal || !editEndLocal) {
                              alert("Please select both start and end.");
                              return;
                            }
                            const startsAtIso = new Date(editStartLocal).toISOString();
                            const endsAtIso = new Date(editEndLocal).toISOString();
                            await updateAppointment(a, { starts_at: startsAtIso, ends_at: endsAtIso });
                            setSelectedDateKey(toKey(startsAtIso));
                            setEditMode(null);
                          }}
                          className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-200 hover:border-emerald-400"
                        >
                          Save time
                        </button>
                      </div>
                    </div>
                  )}

                  {a?.notes && editMode !== "notes" && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <p className="text-slate-400 mb-1">Notes</p>
                      <p className="text-slate-100 whitespace-pre-wrap">{a.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Are you sure modal */}
        {confirmAction && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-[14px] font-semibold text-slate-100">Are you sure?</p>
              <p className="mt-2 text-[12px] text-slate-400">
                {confirmAction.type === "confirm" && "This will mark the appointment as CONFIRMED."}
                {confirmAction.type === "cancel" && "This will CANCEL the appointment."}
                {confirmAction.type === "complete" && "This will mark the appointment as COMPLETED."}
                {confirmAction.type === "no_show" && "This will mark the appointment as NO-SHOW."}
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
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-[12px] font-semibold text-slate-100 hover:border-slate-500"
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
