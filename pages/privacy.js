// pages/privacy.js
import Head from "next/head";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy — DentFlowAI</title>
        <meta name="description" content="DentFlowAI Privacy Policy (POPIA-aware)" />
      </Head>

      <main className="min-h-screen bg-slate-50">
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-ZA")}</p>

          <div className="prose prose-slate mt-6">
            <h2>Overview</h2>
            <p>
              DentFlowAI respects your privacy. This Policy explains how we process personal information for
              clinics and their patients in accordance with the Protection of Personal Information Act, 2013
              (“POPIA”).
            </p>

            <h2>Roles under POPIA</h2>
            <ul>
              <li>
                <strong>Clinic:</strong> Responsible Party determining the purpose and means of processing.
              </li>
              <li>
                <strong>DentFlowAI:</strong> Operator processing information on the Clinic’s behalf to provide
                the Service.
              </li>
            </ul>

            <h2>Information We Process</h2>
            <ul>
              <li>Clinic account details (name, email, phone, billing info).</li>
              <li>Patient details submitted by the clinic (name, contact info, booking details, notes/files you upload).</li>
              <li>Technical data (device, IP, cookies/analytics for product improvement and security).</li>
            </ul>

            <h2>How We Use Information</h2>
            <ul>
              <li>To provide the booking, reminders, recalls, and patient management features.</li>
              <li>To communicate about service updates, security notices, and support.</li>
              <li>To maintain security, prevent abuse, and improve functionality.</li>
            </ul>

            <h2>Sharing</h2>
            <p>
              We use reputable sub-processors (e.g., hosting, email delivery) under agreements with appropriate
              safeguards. We do not sell personal information.
            </p>

            <h2>Security</h2>
            <p>
              We implement reasonable technical and organisational measures, including access controls, encryption
              in transit, and least-privilege principles.
            </p>

            <h2>Retention</h2>
            <p>
              We retain information for as long as necessary to provide the Service and comply with legal
              obligations. Clinics may request export or deletion of their data, subject to lawful requirements.
            </p>

            <h2>Your Rights</h2>
            <p>
              Under POPIA, data subjects may request access, correction, or deletion of personal information
              (subject to exceptions). Clinics should route patient requests through their own processes. We assist
              the Clinic as Operator where appropriate.
            </p>

            <h2>International Transfers</h2>
            <p>
              Data may be processed in data centres outside South Africa with appropriate safeguards in place.
            </p>

            <h2>Cookies & Analytics</h2>
            <p>
              We use essential cookies for authentication and optional analytics to improve the product. You can
              manage analytics via browser settings and our cookie notice.
            </p>

            <h2>Changes</h2>
            <p>
              We may update this Policy to reflect changes to the Service or law. We will update the “Last
              updated” date and may notify Clinics of material changes.
            </p>

            <h2>Contact</h2>
            <p>
              Questions? <Link href="/contact" className="underline">Contact us</Link>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
