// pages/book.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

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

export default function PublicBookingPage() {
  const router = useRouter();

  // clinic_id can come from query (?clinic_id=...)
  // or from env NEXT_PUBLIC_DEFAULT_CLINIC_ID
  const clinicIdFromQuery = router.query?.clinic_id ? String(router.query.clinic_id) : "";
  const defaultClinicId = process.env.NEXT_PUBLIC_DEFAULT_CLINIC_ID || "";
  const [clinic_id, setClinicId] = useState("");

  const [date, setDate] = useState(fmtDateInput(new Date()));
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slots, setSlots] = useState([]);

  const [selectedSlot, setSelectedSlot] = useState(null);

  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // ✅ WhatsApp opt-in ON by default (your choice B)
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setClinicId(clinicIdFromQuery || defaultClinicId || "");
  }, [clinicIdFromQuery, defaultClinicId]);

  async function loadSlots() {
    setToast("");
    setSelectedSlot(null);

    if (!clinic_id) {
      setSlots([]);
      setToast("Missing clinic_id. Add ?clinic_id=YOUR_ID to the URL or set NEXT_PUBLIC_DEFAULT_CLINIC_ID.");
      return;
    }

    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/public/slots?clinic_id=${encodeURIComponent(clinic_id)}&date=${encodeURIComponent(date)}`, {
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
    // group by hour label for nicer UI (optional)
    const groups = {};
    for (const s of slots) {
      const label = parseISOToLocalTimeLabel(s.starts_at);
      const hour = label.slice(0, 2);
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push({ ...s, label });
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [slots]);

  async function submitBooking() {
    setToast("");

    if (!clinic_id) return setToast("Missing clinic_id.");
    if (!selectedSlot) return setToast("Please select a time slot.");
    if (!full_name.trim()) return setToast("Please enter your name.");
    if (!phone.trim()) return setToast("Please enter your phone number.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/book", {
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
          whatsapp_number: phone, // reuse phone as WhatsApp number for MVP
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setToast(json?.error || "Could not create booking.");
        return;
      }

      setToast("✅ Booking confirmed!");
      // optional: redirect or clear form
      setSelectedSlot(null);
      setNotes("");
      // refresh slots after booking
      await loadSlots();
    } catch (e) {
      console.error(e);
      setToast("Unexpected error creating booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Book an Appointment</h1>
          <p className="text-xs text-slate-400">
            Choose a date and time, then enter your details to confirm.
          </p>
        </header>

        {toast && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-[12px] text-slate-200">
            {toast}
          </div>
        )}

        {/* clinic id helper (hidden in real clinic usage via query/env) */}
        {!clinic_id && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-200">
            <p className="font-semibold">Clinic ID missing</p>
            <p className="mt-1">
              Add <span className="font-mono">?clinic_id=YOUR_ID</span> to the URL, or set{" "}
              <span className="font-mono">NEXT_PUBLIC_DEFAULT_CLINIC_ID</span>.
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

        <section className="grid gap-4 lg:grid-cols-2">
          {/* Slots */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <p className="text-[12px] text-slate-300">Select date</p>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
                />
              </div>
              <button
                onClick={loadSlots}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-500"
              >
                Refresh slots
              </button>
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
                      <div className="grid grid-cols-4 gap-2">
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

          {/* Details */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <p className="text-[12px] font-semibold text-slate-100">Your details</p>

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
                  Send me WhatsApp reminders and allow me to confirm/cancel via WhatsApp.
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
              onClick={submitBooking}
              disabled={submitting}
              className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[13px] font-semibold text-emerald-200 hover:border-emerald-400 disabled:opacity-60"
            >
              {submitting ? "Booking…" : "Confirm booking"}
            </button>

            <p className="text-[11px] text-slate-500">
              By booking, you consent to appointment communications from the clinic.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
