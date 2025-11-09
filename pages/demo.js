// pages/demo.js
import Head from 'next/head'
import Link from 'next/link'

const CAL_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/your-handle/15min'

export default function Demo() {
  return (
    <>
      <Head>
        <title>Book a DentFlow Demo</title>
        <meta name="description" content="Schedule a 15-minute DentFlow AI demo and see how clinics save hours each week." />
      </Head>

      <main className="bg-slate-50 min-h-screen">
        {/* Hero */}
        <section className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Book a Live Demo</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              See how DentFlow AI captures leads, manages patients, and reduces no-shows in minutes.
              Pick a time that suits you — no obligations.
            </p>
            <div className="mt-4 flex items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> 15–20 minutes
              </span>
              <span>•</span>
              <span>Screen share walk-through</span>
              <span>•</span>
              <span>Q&A</span>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
          {/* Left: Calendly */}
          <div className="lg:col-span-2">
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <iframe
                src={CAL_URL}
                title="Book a DentFlow Demo"
                style={{ width: '100%', height: '860px', border: 0 }}
                allowFullScreen
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Can’t find a time? Email <a className="underline" href="mailto:info@dentflowai.co.za">info@dentflowai.co.za</a>
            </p>
          </div>

          {/* Right: Benefits / social proof */}
          <aside className="space-y-4">
            <div className="bg-white border rounded-2xl p-5">
              <h3 className="font-semibold text-slate-900">What you’ll see</h3>
              <ul className="mt-2 text-sm text-slate-700 space-y-2">
                <li>• Lead form → Dashboard in real time</li>
                <li>• Today’s Appointments view + Status chips</li>
                <li>• Patient records & quick notes</li>
                <li>• Reminder email flow (if enabled)</li>
              </ul>
            </div>

            <div className="bg-white border rounded-2xl p-5">
              <h3 className="font-semibold text-slate-900">Why clinics like DentFlow</h3>
              <ul className="mt-2 text-sm text-slate-700 space-y-2">
                <li>• Fewer no-shows with reminders</li>
                <li>• Centralised bookings & contacts</li>
                <li>• Simple enough for the whole team</li>
                <li>• South Africa–based support</li>
              </ul>
            </div>

            <div className="bg-white border rounded-2xl p-5">
              <h3 className="font-semibold text-slate-900">Prefer to explore first?</h3>
              <p className="mt-2 text-sm text-slate-700">
                Start a 7-day free trial and look around the dashboard.
              </p>
              <Link href="/auth/login" className="inline-flex mt-3 px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 text-sm">
                Start Free Trial
              </Link>
            </div>
          </aside>
        </section>
      </main>
    </>
  )
}
