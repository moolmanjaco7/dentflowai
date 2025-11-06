// pages/terms.js
import Head from 'next/head'
import Link from 'next/link'

export default function Terms() {
  return (
    <>
      <Head>
        <title>DentFlow AI — Terms of Service</title>
        <meta name="description" content="Terms of Service for using DentFlow AI." />
      </Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-3xl font-bold text-blue-800">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-500">Effective: {new Date().toLocaleDateString('en-ZA')}</p>

          <div className="mt-6 bg-white border rounded-2xl p-6 space-y-4 text-slate-700 leading-7">
            <p>These Terms govern your use of DentFlow AI (“Service”). By using the Service, you agree to these Terms.</p>

            <h2 className="text-xl font-semibold">1. The Service</h2>
            <p>
              DentFlow provides lead capture, patient records and appointment management for clinics.
              We may improve or modify features from time to time.
            </p>

            <h2 className="text-xl font-semibold">2. Accounts & Access</h2>
            <p>
              You are responsible for your login credentials and for actions under your account. You agree not to
              misuse the Service or attempt unauthorised access.
            </p>

            <h2 className="text-xl font-semibold">3. Subscription & Billing</h2>
            <p>
              The Starter plan is R499/month after a 7-day free trial. Month-to-month; cancel anytime to stop future
              charges. We may change pricing with reasonable notice.
            </p>

            <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
            <ul className="list-disc ml-5">
              <li>No unlawful, harmful, or abusive content.</li>
              <li>No spamming or unauthorised bulk messaging.</li>
              <li>Only upload data you have the right to process.</li>
            </ul>

            <h2 className="text-xl font-semibold">5. Data Protection</h2>
            <p>
              We handle personal information in line with our <Link className="underline" href="/privacy">Privacy Policy</Link>.
              You are responsible for your own compliance with POPIA and other laws regarding your patients and staff data.
            </p>

            <h2 className="text-xl font-semibold">6. Availability</h2>
            <p>
              We aim for high availability but do not guarantee uninterrupted service. We are not liable for outages or
              data loss beyond what is required under applicable law.
            </p>

            <h2 className="text-xl font-semibold">7. Warranties & Liability</h2>
            <p>
              The Service is provided “as is.” To the fullest extent permitted by law, we disclaim implied warranties and
              limit liability for indirect or consequential damages.
            </p>

            <h2 className="text-xl font-semibold">8. Termination</h2>
            <p>
              You may cancel at any time. We may suspend or terminate accounts that violate these Terms. Upon termination,
              your access will cease; you may request a data export within a reasonable period.
            </p>

            <h2 className="text-xl font-semibold">9. Governing Law</h2>
            <p>These Terms are governed by the laws of South Africa.</p>

            <h2 className="text-xl font-semibold">10. Contact</h2>
            <p>
              Questions? <a href="mailto:info@dentflowai.co.za" className="underline">info@dentflowai.co.za</a>
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
