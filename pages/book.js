// pages/book.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

function fmtDateInput(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function safeTimeLabel(isoOrDateStr) {
  try {
    const dt = new Date(isoOrDateStr);
    if (Number.isNaN(dt.getTime())) return String(isoOrDateStr || "");
    return dt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(isoOrDateStr || "");
  }
}

function buildLocalISO(dateStr, timeStr) {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  return dt.toISOString();
}

function normalizeSlots(rawSlots, dateStr) {
  const arr = Array.isArray(rawSlots) ? rawSlots : [];

  const normalized = arr
    .map((s) => {
      // 1) If slot is a string like "09:00"
      if (typeof s === "string") {
        const starts_at = buildLocalISO(dateStr, s);
        // default 30min
        const dt = new Date(starts_at);
        dt.setMinutes(dt.getMinutes() + 30);
        return { starts_at, ends_at: dt.toISOString() };
      }

      // 2) If slot is object but with different keys
      const starts =
        s?.starts_at ||
        s?.start ||
        s?.start_time ||
        s?.startsAt ||
        s?.from ||
        s?.begin;

      const ends =
        s?.ends_at ||
        s?.end ||
        s?.end_time ||
        s?.endsAt ||
        s?.to ||
        s?.finish;

      // If starts is "09:00" (time-only), build full ISO using selected date
      const starts_at =
        typeof starts === "string" && /^\d{1,2}:\d{2}$/.test(starts)
          ? buildLocalISO(dateStr, starts)
          : starts;

      const ends_at =
        typeof ends === "string" && /^\d{1,2}:\d{2}$/.test(ends)
          ? buildLocalISO(dateStr, ends)
          : ends;

      return { ...s, starts_at, ends_at };
    })
    .filter((s) => {
      const a = new Date(s?.starts_at);
      const b = new Date(s?.ends_at);
      return (
        s?.starts_at &&
        s?.ends_at &&
        !Number.isNaN(a.getTime()) &&
        !Number.isNaN(b.getTime())
      );
    });

  return normalized;
}

export default function PublicBookingPage() {
  const router = useRouter();

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

  // WhatsApp opt-in ON by default
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
      setToast("Clinic ID missing. Set NEXT_PUBLIC_DEFAULT_CLINIC_ID or pass ?clinic_id=...");
      return;
    }

    setLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/public/slots?clinic_id=${encodeURIComponent(clinic_id)}&date=${encodeURIComponent(date)}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setSlots([]);
        setToast(`Could not load slots. (${res.status}) ${txt}`);
        return;
      }

      const json = await res.json().catch(() => ({}));
      const raw = json?.slots || [];
      const normalized = normalizeSlots(raw, date);
      setSlots(normalized);

      if (normalized.length === 0) {
        setToast("No valid slots returned (slot format mismatch). We fixed UI parsing — if still empty, we’ll adjust the slots API.");
      }
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
      const label = safeTimeLabel(s.starts_at);
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
        setToast(json?.error || "Could not create booking.");
        return;
      }

      setToast("✅ Booking confirmed!");
      setSelectedSlot(null);
      setNotes("");
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
          <p className="text-xs text-slate-400">Choose a date and time, then enter your details.</p>
        </header>

        {toast && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-[12px] text-slate-200">
            {toast}
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
                <span>Send me WhatsApp reminders and allow confirm/cancel via WhatsApp.</span>
              </label>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-[12px] text-slate-300">
              <p className="font-semibold text-slate-100">Selected slot</p>
              <p className="mt-1">
                {selectedSlot ? `${date} • ${safeTimeLabel(selectedSlot.starts_at)}` : "None"}
              </p>
            </div>

            <button
              onClick={submitBooking}
              disabled={submitting}
              className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[13px] font-semibold text-emerald-200 hover:border-emerald-400 disabled:opacity-60"
            >
              {submitting ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
