// pages/index.js
import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>DentFlow AI — Smart Scheduling for Clinics</title>
        <meta name="description" content="Capture leads, manage patients, and reduce no-shows with one simple dashboard." />
      </Head>

      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-xl font-extrabold text-brand-800">DentFlow <span className="text-brand-700">AI</span></div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-600">
            <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
            <Link href="/auth/login" className="px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700">Dashboard Login</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-4 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-900">
                Smart Scheduling for Modern Clinics
              </h1>
              <p className="mt-4 text-lg text-slate-600 max-w-xl">
                Capture leads, manage patients, and reduce no-shows — all in one simple dashboard.
              </p>
              {/* CTA buttons in the hero */}
<div className="mt-6 flex flex-col sm:flex-row gap-3">
  <Link href="/auth/login" className="inline-flex justify-center px-5 py-3 rounded-xl bg-brand-600 text-white hover:bg-brand-700">
    Start 7-Day Free Trial
  </Link>
  <Link href="/demo" className="inline-flex justify-center px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-100">
    Book a Demo
  </Link>
  <a href="#features" className="inline-flex justify-center px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-100">
    See features
  </a>
</div>

              </div>
              <p className="mt-2 text-xs text-slate-500">No credit card required. Cancel anytime.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
              {/* simple illustrative “dashboard” mock */}
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-slate-200 rounded"></div>
                <div className="h-3 w-24 bg-slate-200 rounded"></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-24 bg-white border rounded-xl"></div>
                <div className="h-24 bg-white border rounded-xl"></div>
                <div className="h-24 bg-white border rounded-xl"></div>
              </div>
              <div className="mt-4 h-40 bg-white border rounded-xl"></div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-slate-900">Everything you need</h2>
            <p className="text-slate-600 mt-1">Built for reception teams and solo practitioners.</p>

            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border rounded-2xl p-5">
                <h3 className="font-semibold">Lead Capture</h3>
                <p className="text-sm text-slate-600 mt-1">Website form posts straight to your dashboard.</p>
              </div>
              <div className="bg-white border rounded-2xl p-5">
                <h3 className="font-semibold">Appointments</h3>
                <p className="text-sm text-slate-600 mt-1">Today’s view, status chips, confirm/complete/cancel.</p>
              </div>
              <div className="bg-white border rounded-2xl p-5">
                <h3 className="font-semibold">Reminders</h3>
                <p className="text-sm text-slate-600 mt-1">Email/WhatsApp reminders (enable SMTP).</p>
              </div>
              <div className="bg-white border rounded-2xl p-5">
                <h3 className="font-semibold">Patients</h3>
                <p className="text-sm text-slate-600 mt-1">Lightweight CRM for contacts & notes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-6">
          <div className="max-w-6xl mx-auto px-4">
            <div className="bg-white border rounded-2xl p-8 md:p-10 text-center">
              <h2 className="text-3xl font-bold text-slate-900">R499 <span className="text-base font-medium text-slate-500">/ month</span></h2>
              <ul className="mt-4 text-slate-700 space-y-1">
                <li>Lead form → dashboard</li>
                <li>Patients & appointments</li>
                <li>Status chips & reminders</li>
                <li>Admin access for your team</li>
              </ul>
              <div className="mt-6">
                <Link href="/auth/login" className="px-5 py-3 rounded-xl bg-brand-600 text-white hover:bg-brand-700">
                  Start Free Trial
                </Link>
              </div>
              <p className="mt-2 text-xs text-slate-500">No credit card needed. Cancel anytime.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-10 border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>Powered by DentFlow AI</div>
          <div className="space-x-4">
            <Link href="/pricing" className="underline">Pricing</Link>
            <Link href="/privacy" className="underline">Privacy</Link>
            <Link href="/terms" className="underline">Terms</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
