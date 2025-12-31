// pages/book.js  (or pages/book/index.js)
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

export default function PublicBookPage() {
  const router = useRouter();
  const clinic = typeof router.query.clinic === "string" ? router.query.clinic : "";
  const slug = typeof router.query.slug === "string" ? router.query.slug : "";

  const [date, setDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [slots, setSlots] = useState([]);
  const [time, setTime] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const clinicQuery = useMemo(() => {
    if (clinic) return `clinic=${encodeURIComponent(clinic)}`;
    if (slug) return `slug=${encodeURIComponent(slug)}`;
    return "";
  }, [clinic, slug]);

  async function loadSlots() {
    setErr("");
    setOkMsg("");
    setTime("");
    setSlots([]);

    if (!clinicQuery) {
      setErr("This booking link is missing clinic info. Use /book?slug=your-clinic (or /book?clinic=...).");
      return;
    }

    setLoadingSlots(true);
    const res = await fetch(`/api/public/slots?${clinicQuery}&date=${encodeURIComponent(date)}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setLoadingSlots(false);

    if (!res.ok) {
      setErr(json?.error || "Could not load slots");
      return;
    }

    setSlots(Array.isArray(json?.slots) ? json.slots : []);
  }

  useEffect(() => {
    if (!router.isReady) return;
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, date, clinicQuery]);

  async function submit() {
    setErr("");
    setOkMsg("");

    if (!clinicQuery) {
      setErr("Missing clinic in booking link.");
      return;
    }
    if (!name || !email || !date || !time) {
      setErr("Please complete name, email, date, and time.");
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/public/book?${clinicQuery}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        date,
        time,
        notes,
        ...(clinic ? { clinic_id: clinic } : {}),
        ...(slug ? { clinic_slug: slug } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setErr(json?.error || "Unexpected error");
      return;
    }

    setOkMsg("✅ Booking created. The clinic will confirm shortly.");
    // refresh slots to remove taken time
    loadSlots();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Book an appointment</h1>
          <p className="text-xs text-slate-400">
            Booking link must include <b>?slug=</b> or <b>?clinic=</b> for the correct clinic.
          </p>
        </header>

        {err && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200">
            {err}
          </div>
        )}
        {okMsg && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
            {okMsg}
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[12px] text-slate-300">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="text-[12px] text-slate-300">Time</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
              >
                <option value="">{loadingSlots ? "Loading…" : "Select a time"}</option>
                {slots.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[12px] text-slate-300">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="text-[12px] text-slate-300">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
                placeholder="jane@email.com"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[12px] text-slate-300">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
                placeholder="+27..."
              />
            </div>
            <div>
              <label className="text-[12px] text-slate-300">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none"
                placeholder="Optional"
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] font-semibold text-emerald-200 hover:border-emerald-400 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create appointment"}
          </button>
        </div>
      </div>
    </main>
  );
}
