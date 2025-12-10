// app/pricing/page.tsx

import Link from "next/link";

const plans = [
  {
    name: "Starter",
    tagline: "Perfect for solo practitioners or small rooms.",
    price: "R799",
    period: "per month",
    popular: false,
    features: [
      "Up to 1 clinic location",
      "Up to 2 practitioners",
      "Online bookings & dashboard",
      "Email confirmations & reminders",
      "Basic reporting",
      "Email support",
    ],
  },
  {
    name: "Growth",
    tagline: "For busy clinics with multiple chairs and practitioners.",
    price: "R1,499",
    period: "per month",
    popular: true,
    features: [
      "Up to 3 clinic locations",
      "Up to 10 practitioners",
      "Advanced calendar views",
      "Priority support",
      "Custom booking links per practitioner",
      "Early access to new features",
    ],
  },
  {
    name: "Enterprise",
    tagline: "Multi-site groups and larger organisations.",
    price: "Let’s talk",
    period: "",
    popular: false,
    features: [
      "Unlimited locations & practitioners",
      "Custom onboarding & training",
      "Dedicated account manager",
      "Custom integrations (on request)",
      "SLA & security reviews",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-16">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
              Simple pricing for modern clinics
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              No contracts. No hidden fees. Upgrade or downgrade anytime as
              your practice grows.
            </p>
          </div>

          <div className="mb-6 text-center text-xs text-slate-400">
            All prices in ZAR. VAT exclusive. Month-to-month.
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-2xl border bg-slate-900/70 p-5 ${
                  plan.popular
                    ? "border-blue-500 shadow-lg shadow-blue-500/20"
                    : "border-slate-800"
                }`}
              >
                {plan.popular && (
                  <div className="mb-2 inline-flex items-center justify-center rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-300">
                    Most popular
                  </div>
                )}

                <h2 className="text-sm font-semibold text-slate-50">
                  {plan.name}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {plan.tagline}
                </p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-slate-50">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-xs text-slate-400">
                      / {plan.period}
                    </span>
                  )}
                </div>

                <ul className="mt-4 flex-1 space-y-2 text-xs text-slate-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.name === "Enterprise" ? (
                  <Link
                    href="/contact"
                    className="mt-5 inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 hover:border-slate-400 hover:bg-slate-800"
                  >
                    Contact sales
                  </Link>
                ) : (
                  <Link
                    href="/signup"
                    className={`mt-5 inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold ${
                      plan.popular
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                    }`}
                  >
                    Start free trial
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-xs text-slate-300">
            <p>
              Need a custom quote for multiple locations or a group practice?{" "}
              <span className="font-medium text-blue-300">
                Chat to us and we’ll tailor DentFlowAI to your workflow.
              </span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
