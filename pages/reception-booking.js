// pages/reception-booking.js

import { useState } from "react";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function StepPill({ active, done, children }) {
  return (
    <div
      className={classNames(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
        active
          ? "bg-blue-500 text-slate-50"
          : done
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
          : "bg-slate-900 text-slate-400 border border-slate-700"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{children}</span>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block text-[11px]">
      <span className="mb-1 inline-flex items-center gap-1 text-slate-300">
        {label}
        {required && <span className="text-rose-400">*</span>}
      </span>
      {children}
    </label>
  );
}

const practitionersDemo = [
  { id: 1, name: "Dr Naidoo" },
  { id: 2, name: "Dr Smith" },
  { id: 3, name: "Dr Patel" },
];

const reasonsDemo = [
  "New patient exam",
  "Check-up & clean",
  "Filling",
  "Whitening consult",
  "Emergency / pain",
];

export default function ReceptionBookingPage() {
  const [step, setStep] = useState(1);

  const [patient, setPatient] = useState({
    fullName: "",
    phone: "",
    email: "",
    notes: "",
  });

  const [appointment, setAppointment] = useState({
    date: "",
    time: "",
    duration: "30",
    practitionerId: "",
    reason: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [serverMessage, setServerMessage] = useState("");

  // Email now required to satisfy backend ("Missing name, email, date, or time")
  const canGoNextFromStep1 =
    patient.fullName.trim().length > 2 &&
    patient.phone.trim().length >= 5 &&
    patient.email.trim().length > 3;

  const canGoNextFromStep2 =
    appointment.date && appointment.time && appointment.practitionerId;

  function computeDateTimes() {
    if (!appointment.date || !appointment.time) {
      return { startsAt: null, endsAt: null };
    }

    const parts = appointment.time.split(":");
    const hours = parseInt(parts[0] || "0", 10);
    const minutes = parseInt(parts[1] || "0", 10);

    const d = new Date(appointment.date);
    d.setHours(hours, minutes, 0, 0);

    const startsAt = new Date(d);
    const durationMinutes = parseInt(appointment.duration || "30", 10);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);

    return { startsAt, endsAt };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setServerMessage("");
    setSubmitting(true);
    setSubmitted(false);

    try {
      if (!patient.fullName || !patient.email || !appointment.date || !appointment.time) {
        setError("Name, email, date and time are required.");
        setSubmitting(false);
        return;
      }

      const { startsAt, endsAt } = computeDateTimes();

      if (!startsAt || !endsAt) {
        setError("Please select a valid date and time.");
        setSubmitting(false);
        return;
      }

      // Flat payload to match /api/booking/create expectations
      const payload = {
        name: patient.fullName,
        email: patient.email,
        phone: patient.phone,
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration,
        practitionerId: appointment.practitionerId || null,
        reason: appointment.reason || null,
        notes: patient.notes || null,
        // Extra timestamps if your backend uses them:
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      };

      console.log(
        "Sending reception booking payload to /api/booking/create:",
        payload
      );

      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let json = null;
      try {
        json = await res.json();
      } catch (_err) {
        // ignore JSON parse errors; we'll trust status code
      }

      if (!res.ok) {
        console.error("Booking create failed:", res.status, json);
        setError(
          (json && (json.error || json.message)) ||
            "Could not create appointment. Please try again."
        );
        setSubmitting(false);
        return;
      }

      console.log("Reception booking created:", json);
      setServerMessage(
        (json && (json.message || json.status)) ||
          "Booking created successfully."
      );
      setSubmitted(true);
    } catch (err) {
      console.error("Reception booking error:", err);
      setError("Unexpected error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setPatient({
      fullName: "",
      phone: "",
      email: "",
      notes: "",
    });
    setAppointment({
      date: "",
      time: "",
      duration: "30",
      practitionerId: "",
      reason: "",
    });
    setStep(1);
    setSubmitted(false);
    setError("");
    setServerMessage("");
  }

  const selectedPractitioner =
    practitionersDemo.find(
      (p) => String(p.id) === String(appointment.practitionerId)
    ) || null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row">
        {/* Left pane: form */}
        <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-50">
                Reception booking
              </h1>
              <p className="text-xs text-slate-400">
                Quick, guided flow for reception to capture new bookings.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Live booking mode</span>
            </span>
          </header>

          {/* Stepper */}
          <nav className="mb-5 flex items-center gap-3 text-[11px]">
            <StepPill active={step === 1} done={step > 1}>
              Patient
            </StepPill>
            <div className="h-px flex-1 bg-slate-800" />
            <StepPill active={step === 2} done={step > 2}>
              Appointment
            </StepPill>
            <div className="h-px flex-1 bg-slate-800" />
            <StepPill active={step === 3} done={submitted}>
              Confirm
            </StepPill>
          </nav>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-slate-100">
                  Patient details
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Full name" required>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 outline-none focus:border-slate-400"
                      placeholder="e.g. John Smith"
                      value={patient.fullName}
                      onChange={(e) =>
                        setPatient((p) => ({
                          ...p,
                          fullName: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Mobile / WhatsApp" required>
                    <input
                      type="tel"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 outline-none focus:border-slate-400"
                      placeholder="e.g. 082 123 4567"
                      value={patient.phone}
                      onChange={(e) =>
                        setPatient((p) => ({
                          ...p,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Email" required>
                    <input
                      type="email"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 outline-none focus:border-slate-400"
                      placeholder="For confirmations & reminders"
                      value={patient.email}
                      onChange={(e) =>
                        setPatient((p) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Reception notes (optional)">
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 outline-none focus:border-slate-400"
                      placeholder="e.g. nervous patient, prefers mornings"
                      value={patient.notes}
                      onChange={(e) =>
                        setPatient((p) => ({
                          ...p,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-slate-100">
                  Appointment details
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Date" required>
                    <input
                      type="date"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 outline-none focus:border-slate-400"
                      value={appointment.date}
                      onChange={(e) =>
                        setAppointment((a) => ({
                          ...a,
                          date: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Time" required>
                    <input
                      type="time"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 outline-none focus:border-slate-400"
                      value={appointment.time}
                      onChange={(e) =>
                        setAppointment((a) => ({
                          ...a,
                          time: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Duration">
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 outline-none focus:border-slate-400"
                      value={appointment.duration}
                      onChange={(e) =>
                        setAppointment((a) => ({
                          ...a,
                          duration: e.target.value,
                        }))
                      }
                    >
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </Field>
                  <Field label="Practitioner" required>
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 outline-none focus:border-slate-400"
                      value={appointment.practitionerId}
                      onChange={(e) =>
                        setAppointment((a) => ({
                          ...a,
                          practitionerId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select...</option>
                      {practitionersDemo.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Reason (optional)">
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 outline-none focus:border-slate-400"
                      value={appointment.reason}
                      onChange={(e) =>
                        setAppointment((a) => ({
                          ...a,
                          reason: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select or leave blank</option>
                      {reasonsDemo.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-slate-100">
                  Confirm booking
                </h2>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
                  <div className="mb-2 border-b border-slate-800 pb-2">
                    <p className="text-[11px] font-semibold text-slate-300">
                      Patient
                    </p>
                    <p className="mt-1 text-slate-50">{patient.fullName}</p>
                    <p className="text-slate-400">{patient.phone}</p>
                    {patient.email && (
                      <p className="text-slate-400">{patient.email}</p>
                    )}
                    {patient.notes && (
                      <p className="mt-1 text-slate-400">
                        Notes: {patient.notes}
                      </p>
                    )}
                  </div>

                  <div className="mb-2 border-b border-slate-800 pb-2">
                    <p className="text-[11px] font-semibold text-slate-300">
                      Appointment
                    </p>
                    <p className="mt-1 text-slate-50">
                      {appointment.date || "Not set"} •{" "}
                      {appointment.time || "Not set"} ({appointment.duration}{" "}
                      min)
                    </p>
                    {selectedPractitioner && (
                      <p className="text-slate-400">
                        With {selectedPractitioner.name}
                      </p>
                    )}
                    {appointment.reason && (
                      <p className="mt-1 text-slate-400">
                        Reason: {appointment.reason}
                      </p>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    This booking will be created via your existing DentFlowAI
                    booking API and will appear in your appointments table.
                  </p>
                </div>

                {error && (
                  <p className="text-[11px] text-rose-400">{error}</p>
                )}

                {submitted && (
                  <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
                    {serverMessage || "Booking created successfully."}
                  </div>
                )}
              </section>
            )}

            {/* Footer buttons */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
              <div className="flex gap-2 text-[11px] text-slate-400">
                <button
                  type="button"
                  className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:border-slate-500"
                  onClick={resetForm}
                >
                  Clear form
                </button>
              </div>

              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:border-slate-500"
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                  >
                    Back
                  </button>
                )}

                {step < 3 && (
                  <button
                    type="button"
                    disabled={
                      (step === 1 && !canGoNextFromStep1) ||
                      (step === 2 && !canGoNextFromStep2)
                    }
                    className={classNames(
                      "rounded-md px-3 py-1.5 text-[11px] font-semibold",
                      step === 1 && !canGoNextFromStep1
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : step === 2 && !canGoNextFromStep2
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : "bg-blue-500 text-slate-50 hover:bg-blue-600"
                    )}
                    onClick={() => setStep((s) => Math.min(3, s + 1))}
                  >
                    Next
                  </button>
                )}

                {step === 3 && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? "Saving…" : "Confirm booking"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Right pane: context / tips */}
        <aside className="w-full max-w-sm space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-300">
          <p className="text-[11px] font-semibold text-slate-200">
            Reception tips
          </p>
          <ul className="space-y-2 text-[11px] text-slate-400">
            <li>✅ Always confirm the patient&apos;s mobile number twice.</li>
            <li>
              ✅ Ask whether this is a new patient, follow-up, or emergency.
            </li>
            <li>
              ✅ Note any special considerations (anxious, medical conditions,
              time preferences).
            </li>
            <li>✅ Confirm date, time and practitioner out loud.</li>
          </ul>
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-[11px]">
            <p className="font-medium text-slate-100">
              Linked to booking backend
            </p>
            <p className="mt-1 text-slate-400">
              This flow posts to <code>/api/booking/create</code>, using
              your existing booking logic. Any extra validation or email
              confirmations you&apos;ve set up there will continue to work.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
