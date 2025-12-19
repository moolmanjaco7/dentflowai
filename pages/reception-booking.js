// pages/reception-booking.js
import { useEffect, useMemo, useState } from "react";

function fmtDateInput(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISOToLocalTimeLabel(iso) {
  try {
    const dt = new Date(iso);
    return dt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function ReceptionBookingPage() {
  const defaultClinicId = process.env.NEXT_PUBLIC_DEFAULT_CLINIC_ID || "";
  const [clinic_id, setClinicId] = useState(defaultClinicId);

  const [date, setDate] = useState(fmtDateInput(new Date()));
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // ✅ WhatsApp opt-in ON by default
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  async function loadSlots() {
    setToast("");
    setSelectedSlot(null);

    if (!clinic_id) {
      setSlots([]);
      setToast("Missing clinic_id. Set NEXT_PUBLIC_DEFAULT_CLINIC_ID in Vercel env vars.");
      return;
    }

    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/booking/slots?clinic_id=${encodeURIComponent(clinic_id)}&date=${encodeURIComponent(date)}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setSlots([]);
        setToast(`Could not load slots. (${res.status}) ${txt}`);
        return;
      }

      const json = await res.json();
      setSlots(json?.slots || []);
    } catch (e) {
      console.error(e);
      setSlots([]);
      setToast("Could not load slots.");
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    if (clinic_id) loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic_id, date]);

  const slotGroups = useMemo(() => {
    const groups = {};
    for (const s of slots) {
      const label = parseISOToLocalTimeLabel(s.starts_at);
      const hour = label.slice(0, 2);
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push({ ...s, label });
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [slots]);

  async function createBooking() {
    setToast("");

    if (!clinic_id) return setToast("Missing clinic_id.");
    if (!selectedSlot) return setToast("Please select a time slot.");
    if (!full_name.trim()) return setToast("Please enter patient name.");
    if (!phone.trim()) return setToast("Please enter patient phone.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        // ✅ WhatsApp fields included here
        body: JSON.stringify({
          clinic_id,
          full_name,
          email,
          phone,
          notes,
          starts_at: selectedSlot.starts_at,
          ends_at: selectedSlot.ends_at,

          whatsapp_opt_in: whatsappOptIn,
          whatsapp_number: phone,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setToast(json?.error || "Could not create appointment.");
        return;
      }

      setToast("✅ Appointment created.");
      setSelectedSlot(null);
      setNotes("");
      await loadSlots();
    } catch (e) {
      console.error(e);
      setToast("Unexpected error creating appointment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reception Booking</h1>
            <p className="text-xs text-slate-400">
              Create a booking quickly and schedule WhatsApp reminders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSlots}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-500"
            >
              Refresh slots
            </button>
          </div>
        </header>

        {toast && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-[12px] text-slate-200">
            {toast}
          </div>
        )}

        {/* Clinic ID helper (for single-clinic use, set NEXT_PUBLIC_DEFAULT_CLINIC_ID) */}
        {!clinic_id && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-200">
            <p className="font-semibold">Clinic ID missing</p>
            <p className="mt-1">
              Set <span className="font-mono">NEXT_PUBLIC_DEFAULT_CLINIC_ID</span> in Vercel env vars.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={clinic_id}
                onChange={(e) => setClinicId(e.target.value)}
                placeholder="Paste clinic_id here to test"
                className="w-full rounded-lg border border-amber-500/20 bg-slate-950 px-3 py-2 text-[12px] text-slate-100 outline-none"
              />
              <button
                onClick={loadSlots}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100 hover:border-amber-400"
              >
                Load
              </button>
            </div>
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
          {/* Slots */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[12px] text-slate-300">Date</p>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4">
              {loadingSlots ? (
                <p className="text-sm text-slate-400">Loading slots…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-slate-400">No slots available for this date.</p>
              ) : (
                <div className="space-y-3">
                  {slotGroups.map(([hour, arr]) => (
                    <div key={hour}>
                      <p className="mb-2 text-[11px] text-slate-500">{hour}:00</p>
                      <div className="grid grid-cols-5 gap-2">
                        {arr.map((s, idx) => {
                          const active = selectedSlot?.starts_at === s.starts_at;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedSlot(s)}
                              className={`rounded-lg border px-2 py-2 text-[12px] ${
                                active
                                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                                  : "border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-600"
                              }`}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <p className="text-[12px] font-semibold text-slate-100">Patient</p>

            <div className="grid gap-2">
              <input
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone / WhatsApp number"
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={3}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
              />

              <label className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200">
                <input
                  type="checkbox"
                  checked={whatsappOptIn}
                  onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  WhatsApp reminders + confirm/cancel via WhatsApp (default ON).
                </span>
              </label>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-[12px] text-slate-300">
              <p className="font-semibold text-slate-100">Selected slot</p>
              <p className="mt-1">
                {selectedSlot
                  ? `${new Date(selectedSlot.starts_at).toLocaleDateString("en-ZA")} • ${parseISOToLocalTimeLabel(
                      selectedSlot.starts_at
                    )}`
                  : "None"}
              </p>
            </div>

            <button
              onClick={createBooking}
              disabled={submitting}
              className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[13px] font-semibold text-emerald-200 hover:border-emerald-400 disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create appointment"}
            </button>

            <p className="text-[11px] text-slate-500">
              Reminder flags will be saved on the appointment for the scheduler.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
