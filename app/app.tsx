// app/page.tsx

import Link from "next/link";

const features = [
  {
    title: "Online bookings that just work",
    description:
      "Let patients book 24/7 from your website or WhatsApp instead of phoning reception all day.",
  },
  {
    title: "Smart calendar for the whole clinic",
    description:
      "Manage multiple practitioners, rooms and chairs in one clean, colour-coded view.",
  },
  {
    title: "Automatic confirmations & reminders",
    description:
      "Cut no-shows with email confirmations and reminders sent automatically to patients.",
  },
  {
    title: "Built for South African practices",
    description:
      "Time zones, public holidays and workflows tailored for local dental and medical clinics.",
  },
];

const steps = [
  {
    step: "01",
    title: "Set up your clinic in minutes",
    description:
      "Add your practitioners, working hours and services. DentFlowAI generates a live booking link instantly.",
  },
  {
    step: "02",
    title: "Share your booking link",
    description:
      "Embed it on your website, add it to WhatsApp, Google Business, Instagram or email signatures.",
  },
  {
    step: "03",
    title: "Watch your reception workload drop",
    description:
      "Bookings appear directly in your dashboard calendar, with automated confirmations and reminders.",
  },
];

const faqs = [
  {
    question: "Is DentFlowAI only for dentists?",
    answer:
      "No. It’s perfect for dentists, hygienists, physios, aesthetic clinics, chiropractors, and any appointment-based practice.",
  },
  {
    question: "Do I need my own website to use it?",
    answer:
      "No. DentFlowAI gives you a hosted booking link you can send to patients or add to WhatsApp and social media.",
  },
  {
    question: "Can multiple practitioners use it at the same time?",
    answer:
      "Yes. You can add multiple practitioners and manage everyone’s calendars in one place.",
  },
  {
    question: "Is there a contract or long-term commitment?",
    answer:
      "No contracts. Month-to-month subscription, cancel anytime.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute top-40 -left-10 h-72 w-72 rounded-full bg-emerald-500 blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 lg:flex-row lg:items-center lg:py-24">
          <div className="max-w-xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live in South Africa • Built for clinics
            </span>

            <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
              Turn your clinic&apos;s bookings into a{" "}
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                smooth, automated flow.
              </span>
            </h1>

            <p className="text-balance text-sm text-slate-300 sm:text-base">
              DentFlowAI replaces messy WhatsApp messages, paper diaries and
              endless phone calls with one simple, shared booking system for
              your whole practice.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600"
              >
                Start free trial
                <span className="ml-2 text-base">→</span>
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400 hover:bg-slate-800/80"
              >
                View pricing
              </Link>
            </div>

            <p className="text-xs text-slate-400">
              No setup fee. No contracts. Designed for South African clinics.
            </p>
          </div>

          <div className="relative flex-1">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-300">
                    Today&apos;s schedule
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Example DentFlowAI dashboard snippet
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400">
                  7 bookings
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  {
                    time: "08:30",
                    name: "New patient exam",
                    meta: "Dr Naidoo • Room 1",
                    label: "New",
                    color: "bg-emerald-500/15 text-emerald-300",
                  },
                  {
                    time: "10:00",
                    name: "Scale & polish",
                    meta: "Dr Smith • Room 2",
                    label: "Confirmed",
                    color: "bg-blue-500/15 text-blue-300",
                  },
                  {
                    time: "11:30",
                    name: "Filling – upper molar",
                    meta: "Dr Patel • Room 1",
                    label: "Reminder sent",
                    color: "bg-amber-500/15 text-amber-300",
                  },
                  {
                    time: "15:00",
                    name: "Invisalign consult",
                    meta: "Dr Naidoo • Room 3",
                    label: "Online booking",
                    color: "bg-fuchsia-500/15 text-fuchsia-300",
                  },
                ].map((item) => (
                  <div
                    key={item.time}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2"
                  >
                    <div>
                      <p className="text-[11px] font-medium text-slate-100">
                        {item.time} • {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {item.meta}
                      </p>
                    </div>
                    <span
                      className={`ml-3 rounded-full px-2 py-1 text-[10px] font-medium ${item.color}`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                <p className="text-[11px] text-slate-400">
                  3 online bookings • 2 walk-ins • 2 follow-ups
                </p>
                <span className="text-[11px] text-emerald-400">
                  ↓ 32% fewer no-shows
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                Everything your clinic needs in one place
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Built for busy practices that can&apos;t afford appointment
                chaos.
              </p>
            </div>
            <p className="max-w-sm text-xs text-slate-500">
              DentFlowAI replaces spreadsheets, WhatsApp threads and scribbled
              notes with one clean, central booking system.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <p className="text-sm font-medium text-slate-50">
                  {feature.title}
                </p>
                <p className="text-xs text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                From chaos to clarity in three steps
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Get your clinic live in under an hour.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.step}
                className="relative flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-300">
                  {step.step}
                </span>
                <p className="text-sm font-medium text-slate-50">
                  {step.title}
                </p>
                <p className="text-xs text-slate-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
          <div>
            <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
              Simple, transparent pricing.
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              One monthly fee. No per-booking charges. No long-term contracts.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              View pricing & plans
              <span className="ml-2 text-base">→</span>
            </Link>
            <span className="text-xs text-slate-400">
              Start with a free trial, upgrade when you&apos;re ready.
            </span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="mb-8 max-w-xl">
            <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
              Frequently asked questions
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Still unsure if DentFlowAI is a fit? Start here.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <p className="text-sm font-medium text-slate-50">
                  {faq.question}
                </p>
                <p className="mt-2 text-xs text-slate-400">{faq.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Want help setting up your first clinic on DentFlowAI?
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 hover:border-slate-400 hover:bg-slate-800"
            >
              Get started today
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
