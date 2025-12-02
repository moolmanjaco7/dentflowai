// pages/pricing.js
import Head from "next/head";
import Link from "next/link";

export default function PricingPage() {
  return (
    <>
      <Head>
        <title>Pricing — DentFlowAI</title>
        <meta name="description" content="Simple pricing for South African clinics. 7-day free trial." />
      </Head>

      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-12">
          <header className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">Simple pricing</h1>
            <p className="mt-2 text-slate-600">
              Built for South African clinics. <span className="font-medium">7-day free trial</span>, no card.
            </p>
          </header>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Starter */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Starter</h2>
              <p className="mt-1 text-slate-500">Solo practitioner</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">R399</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>• Online booking link</li>
                <li>• Dashboard + day picker</li>
                <li>• Email reminders & recalls</li>
                <li>• 1 practitioner</li>
              </ul>
              <div className="mt-6">
                <Link
                  href="/auth/signup"
                  className="inline-block w-full rounded-md bg-slate-900 px-4 py-2 text-center text-white hover:bg-slate-800"
                >
                  Start free trial
                </Link>
              </div>
            </div>

            {/* Clinic (Most popular) */}
            <div className="rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-md relative">
              <div className="absolute -top-3 right-4 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                Most popular
              </div>
              <h2 className="text-lg font-semibold">Clinic</h2>
              <p className="mt-1 text-slate-500">Growing practice</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">R899</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>• Everything in Starter</li>
                <li>• Up to 5 practitioners</li>
                <li>• Patient notes & files</li>
                <li>• Priority support</li>
              </ul>
              <div className="mt-6">
                <Link
                  href="/auth/signup"
                  className="inline-block w-full rounded-md bg-slate-900 px-4 py-2 text-center text-white hover:bg-slate-800"
                >
                  Start free trial
                </Link>
              </div>
            </div>

            {/* Group */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Group</h2>
              <p className="mt-1 text-slate-500">Multi-site or large team</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">R1 999</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>• Unlimited practitioners</li>
                <li>• Advanced recalls & exports</li>
                <li>• Custom domains & branding</li>
                <li>• SLA support</li>
              </ul>
              <div className="mt-6">
                <Link
                  href="/auth/signup"
                  className="inline-block w-full rounded-md bg-slate-900 px-4 py-2 text-center text-white hover:bg-slate-800"
                >
                  Start free trial
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold">POPIA-aware</h3>
              <p className="mt-1 text-sm text-slate-600">Access control per clinic. Data stored securely.</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold">Cancel anytime</h3>
              <p className="mt-1 text-sm text-slate-600">Month-to-month, no contracts.</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold">Priority support</h3>
              <p className="mt-1 text-sm text-slate-600">Fast help via email/WhatsApp.</p>
            </div>
          </div>

          <div className="mt-10 text-center text-sm text-slate-500">
            Prices include VAT where applicable. Need a custom plan?{" "}
            <Link href="/contact" className="underline">Contact us</Link>.
          </div>
        </section>
      </main>
    </>
  );
}
