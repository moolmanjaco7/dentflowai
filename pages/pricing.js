export default function Pricing() {
  return (
    <main className="min-h-screen bg-white text-gray-800 px-6 py-12">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6 text-blue-700">DentFlow Pricing</h1>
        <p className="mb-10 text-lg">
          Simple, transparent pricing. Start free for 7 days – no credit card required.
        </p>

        <div className="border rounded-2xl p-8 shadow-md">
          <h2 className="text-2xl font-semibold mb-2">DentFlow Starter</h2>
          <p className="text-4xl font-bold text-blue-700 mb-4">R499 / month</p>
          <ul className="text-left list-disc list-inside mb-6">
            <li>Full access to dashboard, leads & patient module</li>
            <li>Appointment management & reminders</li>
            <li>Email/WhatsApp notifications</li>
            <li>South-African-based support</li>
          </ul>
          <a
            href="/auth/login"
            className="inline-block bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800"
          >
            Start Free Trial
          </a>
        </div>
      </div>
    </main>
  )
}
