// pages/book.js
import Head from "next/head";
import { useState } from "react";

const HOURS_START = 8;  // 08:00
const HOURS_END = 17;   // 17:00
const STEP_MINUTES = 15;

function buildTimeOptions() {
  const opts = [];
  for (let h = HOURS_START; h < HOURS_END; h++) {
    for (let m = 0; m < 60; m += STEP_MINUTES) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      opts.push(`${hh}:${mm}`);
    }
  }
  return opts;
}

const TIME_OPTIONS = buildTimeOptions();

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function PublicBookingPage() {
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("10:00");
  const [fullName, setFullName] = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [note,    setNote]    = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName || !date || !time) {
      setError("Please fill in your name, date and time.");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          date,
          time,
          note,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Could not book appointment. Please try again.");
      } else {
        setSuccess("Thank you! Your appointment request has been received.");
        // Clear only note/time/date if you want to allow multiple bookings
        // setDate(todayISO());
        // setTime("10:00");
        setNote("");
      }
    } catch (e) {
      console.error(e);
      setError("Unexpected error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Book an appointment — DentFlowAI Clinic</title>
      </Head>
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="bg-white border rounded-2xl shadow-sm p-6">
            <h1 className="text-2xl font-bold text-slate-900 text-center">
              Book an appointment
            </h1>
            <p className="mt-2 text-sm text-slate-600 text-center">
              Choose your date and time, then add your details. We’ll confirm your visit.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {error && (
                <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm rounded-md px-3 py-2">
                  {success}
                </div>
              )}

              {/* Date + Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Date
                  </label>
                  <input
                    type="date"
                    min={todayISO()}
                    className="rounded-md border px-3 py-2 text-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Time
                  </label>
                  <select
                    className="rounded-md border px-3 py-2 text-sm"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    Times are in your clinic’s timezone (Africa/Johannesburg).
                  </p>
                </div>
              </div>

              {/* Patient details */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  className="rounded-md border px-3 py-2 text-sm"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    className="rounded-md border px-3 py-2 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    className="rounded-md border px-3 py-2 text-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27..."
                  />
                </div>
              </div>

              {/* Note */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Note to the clinic (optional)
                </label>
                <textarea
                  className="rounded-md border px-3 py-2 text-sm min-h-[80px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason for visit or any important information."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {submitting ? "Booking…" : "Confirm appointment"}
              </button>
            </form>
          </div>

          <p className="mt-4 text-xs text-slate-500 text-center">
            If you prefer, you can also call the reception to book or change your appointment.
          </p>
        </div>
      </main>
    </>
  );
}
