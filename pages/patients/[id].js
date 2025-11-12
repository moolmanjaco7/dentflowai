// pages/patients/[id].js
import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PatientNotes from "@/components/PatientNotes";
import PatientHistory from "@/components/PatientHistory";
import InlineEditField from "@/components/InlineEditField";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// light validators
const validateEmail = (v) => {
  if (!v) return null; // allow empty
  return /^\S+@\S+\.\S+$/.test(v) ? null : "Invalid email format";
};
const validatePhone = (v) => {
  if (!v) return null;
  const digits = (v || "").replace(/\D/g, "");
  return digits.length >= 7 ? null : "Phone number looks too short";
};

export default function PatientDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [patient, setPatient] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [tab, setTab] = React.useState("details"); // details | notes | history

  React.useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (typeof window !== "undefined") window.location.href = "/auth/login";
          return;
        }

        // Try to fetch optional DOB if it exists, but don't require it
        let columns = "id, full_name, email, phone";
        // We'll probe if date_of_birth exists, otherwise ignore
        const { data: probe, error: probeErr } = await supabase
          .from("patients")
          .select("date_of_birth")
          .limit(1);
        const hasDob = !probeErr; // if no error, column exists
        if (hasDob) columns += ", date_of_birth";

        const { data, error } = await supabase
          .from("patients")
          .select(columns)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        setPatient(data);
      } catch (e) {
        setErr(e.message || "Failed to load patient");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function updateField(field, value) {
    if (!patient) return;
    // optimistic UI
    const prev = patient;
    setPatient((p) => ({ ...p, [field]: value }));

    // Try update; if column is missing (e.g., date_of_birth), catch and rollback
    const { error } = await supabase
      .from("patients")
      .update({ [field]: value })
      .eq("id", patient.id)
      .select("id")
      .maybeSingle();

    if (error) {
      setPatient(prev);
      // helpful message if column missing
      const msg = /column .* does not exist/i.test(error.message)
        ? `Column "${field}" does not exist. Add it first (or skip editing this field).`
        : error.message;
      throw new Error(msg);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-slate-600">Loading patient…</p>
      </main>
    );
  }

  if (err || !patient) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border rounded-2xl p-6 max-w-lg">
          <h1 className="text-xl font-bold text-slate-900">Patient error</h1>
          <p className="mt-2 text-sm text-red-600">{err || "Patient not found"}</p>
          <Link href="/dashboard" className="mt-3 inline-block underline text-sm">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>{patient.full_name} — Patient</title>
      </Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold text-slate-900">{patient.full_name}</h1>
            <div className="flex gap-2">
              <Link href="/patients" className="text-sm underline">All patients</Link>
              <Link href="/dashboard" className="text-sm underline">Dashboard</Link>
            </div>
          </div>

          <Card className="p-4">
            {/* Tabs */}
            <div className="flex gap-2">
              {["details", "notes", "history"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-sm px-3 py-2 rounded-md border ${
                    tab === t ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {t === "details" ? "Details" : t === "notes" ? "Notes" : "History"}
                </button>
              ))}
            </div>

            <Separator className="my-3" />

            {tab === "details" && (
              <div className="grid gap-2 text-sm">
                <InlineEditField
                  label="Full name"
                  value={patient.full_name}
                  onSave={(v) => updateField("full_name", v)}
                />
                <InlineEditField
                  label="Email"
                  type="email"
                  value={patient.email}
                  validate={validateEmail}
                  onSave={(v) => updateField("email", v)}
                />
                <InlineEditField
                  label="Phone"
                  type="tel"
                  value={patient.phone}
                  validate={validatePhone}
                  onSave={(v) => updateField("phone", v)}
                />
                {/* DOB: only show editor if the column is present on this record */}
                {"date_of_birth" in patient && (
                  <InlineEditField
                    label="Date of birth"
                    type="date"
                    value={patient.date_of_birth || ""}
                    onSave={(v) => updateField("date_of_birth", v)}
                  />
                )}
                <div className="flex items-center justify-between border rounded-lg bg-white p-3">
                  <div className="text-slate-600">Patient ID</div>
                  <div className="font-medium break-all text-right">{patient.id}</div>
                </div>
              </div>
            )}

            {tab === "notes" && <PatientNotes patientId={patient.id} />}

            {tab === "history" && <PatientHistory patientId={patient.id} />}
          </Card>
        </section>
      </main>
    </>
  );
}
