import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 text-gray-800">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 shadow-sm bg-white/80 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-blue-700">
          DentFlow<span className="text-gray-900">AI</span>
        </h1>
        <div className="space-x-2">
          <a href="#features" className="px-3 py-2 rounded-lg hover:bg-blue-50">
            Features
          </a>
          <a href="#pricing" className="px-3 py-2 rounded-lg hover:bg-blue-50">
            Pricing
          </a>
          <a href="#contact" className="px-3 py-2 rounded-lg hover:bg-blue-50">
            Contact
          </a>
          <a
            href="#lead"
            className="px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800"
          >
            Start Free Trial
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center py-24 px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-extrabold text-blue-800 mb-4"
        >
          Smart Bookings. Healthy Growth.
        </motion.h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          AI-powered scheduling and workflow automation for clinics, dentists, and wellness
          centers.
        </p>
        <a
          id="trial"
          href="#lead"
          className="inline-block mt-6 bg-blue-700 text-white hover:bg-blue-800 px-6 py-3 text-lg rounded-xl shadow"
        >
          Start 7-Day Free Trial
        </a>
      </section>

      {/* Features */}
      <section id="features" className="grid md:grid-cols-4 gap-6 px-8 py-12">
        {[
          { title: 'AI Scheduling', desc: 'Optimized appointment flow and reduced no-shows.' },
          { title: 'Automated Reminders', desc: 'Email notifications for patients.' },
          { title: 'Clinic Dashboard', desc: 'Track visits, revenue, and performance metrics.' },
          { title: 'Multi-Location Support', desc: 'Manage multiple clinics from one dashboard.' },
        ].map((f, i) => (
          <div key={i} className="rounded-2xl border bg-white p-6 hover:shadow-lg transition">
            <div className="flex justify-center text-blue-700 mb-3 text-3xl">📅</div>
            <h3 className="font-semibold text-lg mb-2 text-center">{f.title}</h3>
            <p className="text-sm text-gray-600 text-center">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-8 py-12">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              name: 'Starter',
              price: 'R399/mo',
              points: ['Single practitioner', 'Basic scheduling', 'Email reminders'],
            },
            {
              name: 'Pro',
              price: 'R799/mo',
              points: ['Up to 5 practitioners', 'Advanced rules', 'Analytics dashboard'],
            },
            {
              name: 'Clinic+',
              price: 'Custom',
              points: ['Multi-location', 'Priority support', 'Onboarding & training'],
            },
          ].map((p, i) => (
            <div key={i} className="rounded-2xl bg-white border p-6 hover:shadow-lg">
              <h4 className="text-xl font-bold">{p.name}</h4>
              <p className="text-3xl font-extrabold my-2">{p.price}</p>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                {p.points.map((pt, j) => (
                  <li key={j}>• {pt}</li>
                ))}
              </ul>
              <a
                href="#lead"
                className="inline-block px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800"
              >
                Choose plan
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Lead Capture Form */}
      <section id="lead" className="px-8 py-12">
        <div className="max-w-3xl mx-auto bg-white border rounded-2xl p-6 shadow-sm">
          <h3 className="text-2xl font-bold mb-2 text-blue-800">Request a Demo / Start Trial</h3>
          <p className="text-sm text-gray-600 mb-6">
            Tell us a bit about your clinic and we’ll reach out from{' '}
            <b>info@dentflowai.co.za</b> with next steps.
          </p>

          {/* IMPORTANT: POST + absolute redirect */}
          <form
  action="/api/lead"
  method="POST"
  className="grid md:grid-cols-2 gap-4"
>

            {/* FormSubmit options */}
            <input type="hidden" name="_subject" value="DentFlow AI – New Lead" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />
            {/* redirect to your LIVE domain */}
            <input
              type="hidden"
              name="_next"
              value="https://www.dentflowai.co.za/thanks"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Clinic Name</label>
              <input
                name="clinic_name"
                required
                placeholder="e.g., SmileCare Dental"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Contact Person</label>
              <input
                name="contact_name"
                required
                placeholder="Your name"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                required
                placeholder="name@clinic.co.za"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Phone</label>
              <input
                name="phone"
                placeholder="+27 ..."
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Clinic Type</label>
              <select
                name="clinic_type"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option>Dental</option>
                <option>Medical Practice</option>
                <option>Physio</option>
                <option>Chiro</option>
                <option>Wellness</option>
                <option>Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700"># Practitioners</label>
              <input
                name="practitioners"
                type="number"
                min="1"
                placeholder="e.g., 3"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-sm text-gray-700">Notes</label>
              <textarea
                name="message"
                rows="4"
                placeholder="Anything we should know?"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                By submitting, you agree to be contacted about DentFlow AI.
              </p>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Contact fallback */}
      <section id="contact" className="px-8 py-12">
        <div className="max-w-xl mx-auto bg-white border rounded-2xl p-6">
          <h3 className="text-2xl font-bold mb-2 text-blue-800">Prefer Email?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Click below to open your email client with our address pre-filled.
          </p>
          <a
            href="mailto:info@dentflowai.co.za?subject=DentFlow%20AI%20-%20Demo%20Request"
            className="inline-block px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800"
          >
            Email info@dentflowai.co.za
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-10 text-gray-500 border-t">
        <p>© 2025 DentFlow AI | Powered by DentFlow⚪️</p>
        <p className="text-sm">info@dentflowai.co.za • @DentFlow_AI</p>
      </footer>
    </div>
  )
}
