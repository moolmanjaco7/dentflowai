// pages/privacy.js
import Head from 'next/head'
import Link from 'next/link'

export default function Privacy() {
  return (
    <>
      <Head>
        <title>DentFlow AI — Privacy Policy</title>
        <meta name="description" content="POPIA-aligned privacy policy for DentFlow AI." />
      </Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-3xl font-bold text-blue-800">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Effective: {new Date().toLocaleDateString('en-ZA')}</p>

          <div className="mt-6 bg-white border rounded-2xl p-6 space-y-4 text-slate-700 leading-7">
            <p>
              This Privacy Policy explains how DentFlow AI (“we”, “us”) collects and processes personal information
              in accordance with the Protection of Personal Information Act, 2013 (“POPIA”).
            </p>

            <h2 className="text-xl font-semibold">1. Responsible Party & Contact</h2>
            <p>
              DentFlow AI • Email: <a href="mailto:info@dentflowai.co.za" className="underline">info@dentflowai.co.za</a>
            </p>

            <h2 className="text-xl font-semibold">2. Information We Process</h2>
            <ul className="list-disc ml-5">
              <li>Clinic lead details submitted via the website (clinic name, contact person, email, phone, message).</li>
              <li>Patient and appointment details entered by clinic staff (name, contact info, appointment notes/status).</li>
              <li>Account/authentication data for users (email, session identifiers).</li>
              <li>Technical data (device/browser info, IP, basic analytics, error logs).</li>
            </ul>

            <h2 className="text-xl font-semibold">3. Purpose & Legal Basis</h2>
            <ul className="list-disc ml-5">
              <li>To provide and improve the DentFlow service (performance of a contract / legitimate interests).</li>
              <li>To communicate about leads, demos, and support (consent / legitimate interests).</li>
              <li>To secure accounts and prevent abuse (legitimate interests / legal obligations).</li>
            </ul>

            <h2 className="text-xl font-semibold">4. Sharing & Operators</h2>
            <p>
              We use trusted processors to run DentFlow (e.g., hosting, database, error monitoring, email). Some processing
              may occur outside South Africa. We require operators to implement appropriate security measures and to process
              personal information only under our instructions.
            </p>

            <h2 className="text-xl font-semibold">5. Cross-Border Transfers</h2>
            <p>
              Where personal information is transferred outside South Africa, we take steps to ensure it is protected by
              safeguards that are substantially similar to POPIA standards.
            </p>

            <h2 className="text-xl font-semibold">6. Security</h2>
            <p>
              We apply technical and organisational measures appropriate to the risk, including access controls, encryption
              in transit, and least-privilege practices.
            </p>

            <h2 className="text-xl font-semibold">7. Retention</h2>
            <p>
              We retain personal information only as long as necessary for the purposes above, or as required by law. You
              may request deletion where applicable.
            </p>

            <h2 className="text-xl font-semibold">8. Your Rights</h2>
            <p>
              You may request access, correction, deletion, or objection to processing. Contact{' '}
              <a href="mailto:info@dentflowai.co.za" className="underline">info@dentflowai.co.za</a>. We will verify your identity before acting on requests.
            </p>

            <h2 className="text-xl font-semibold">9. Cookies & Analytics</h2>
            <p>
              If we enable analytics or cookies, we will update this policy and, where required, request consent.
            </p>

            <h2 className="text-xl font-semibold">10. Updates</h2>
            <p>
              We may update this policy from time to time. Material changes will be posted here with a new “Effective” date.
            </p>

            <p className="text-sm text-slate-500">
              By using DentFlow, you agree to this Privacy Policy. For Terms, see <Link className="underline" href="/terms">Terms of Service</Link>.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
