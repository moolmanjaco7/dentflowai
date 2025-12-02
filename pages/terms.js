// pages/terms.js
import Head from "next/head";
import Link from "next/link";

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service — DentFlowAI</title>
        <meta name="description" content="DentFlowAI Terms of Service" />
      </Head>

      <main className="min-h-screen bg-slate-50">
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-ZA")}</p>

          <div className="prose prose-slate mt-6">
            <h2>1. Agreement</h2>
            <p>
              These Terms of Service (“Terms”) govern your access to and use of the DentFlowAI platform
              (“Service”). By using the Service, you agree to these Terms.
            </p>

            <h2>2. Eligibility</h2>
            <p>
              You must be authorised to act on behalf of your clinic or business. You are responsible for
              ensuring compliance with all applicable laws and professional regulations.
            </p>

            <h2>3. Accounts</h2>
            <p>
              You are responsible for safeguarding your account credentials and for all activities under your
              account. Notify us immediately of any unauthorised use.
            </p>

            <h2>4. Use of the Service</h2>
            <ul>
              <li>Do not misuse, reverse engineer, or disrupt the Service.</li>
              <li>Do not upload unlawful, harmful, or infringing content.</li>
              <li>You retain ownership of your data; you grant us a limited licence to operate the Service.</li>
            </ul>

            <h2>5. Patient Data & POPIA</h2>
            <p>
              You are the Responsible Party for patient personal information under POPIA. DentFlowAI acts as an
              Operator processing data on your behalf. You must obtain any required consent from patients for
              booking, reminders, and recalls. We implement reasonable technical and organisational measures to
              protect personal information.
            </p>

            <h2>6. Payments & Trials</h2>
            <p>
              Paid plans are billed monthly in ZAR. Trials may be offered and can be cancelled before renewal.
              Fees are non-refundable except where required by law.
            </p>

            <h2>7. Availability & Support</h2>
            <p>
              We aim for high availability but do not guarantee uninterrupted service. Support is provided via
              email/WhatsApp during business hours.
            </p>

            <h2>8. Termination</h2>
            <p>
              You may cancel at any time. We may suspend or terminate access for breach of these Terms or to
              prevent harm.
            </p>

            <h2>9. Disclaimers & Liability</h2>
            <p>
              The Service is provided “as is”. We exclude implied warranties to the extent permitted by law. We
              are not liable for indirect, incidental, or consequential damages. Our aggregate liability is
              limited to fees paid in the past 3 months.
            </p>

            <h2>10. Changes</h2>
            <p>
              We may update these Terms. Material changes will be notified by updating this page’s date or via
              email.
            </p>

            <h2>11. Contact</h2>
            <p>
              Questions? <Link href="/contact" className="underline">Contact us</Link>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
