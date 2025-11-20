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
import PatientQuickAdd from "@/components/PatientQuickAdd";
import PatientFiles from "@/components/PatientFiles";
import PatientFilesCard from "@/components/PatientFilesCard";
import { baseFromName } from "@/lib/patientCode";
import { createClient } from "@supabase/supabase-js";



const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const validateEmail = (v) => (!v ? null : /^\S+@\S+\.\S+$/.test(v) ? null : "Invalid email");
const validatePhone = (v) => {
  if (!v) return null;
  const d = (v || "").replace(/\D/g, "");
  return d.length >= 7 ? null : "Phone looks too short";
};

export default function PatientDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [patient, setPatient] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [tab, setTab] = React.useState("details"); // details | notes | history | files

  React.useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (typeof window !== "undefined") window.location.href = "/auth/login";
          return;
        }

        // Probe for DOB
        let columns = "id, full_name, email, phone";
        const { error: probeErr } = await supabase.from("patients").select("date_of_birth").limit(1);
        if (!probeErr) columns += ", date_of_birth";

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
    const prev = patient;
    setPatient((p) => ({ ...p, [field]: value }));

    const { error } = await supabase
      .from("patients")
      .update({ [field]: value })
      .eq("id", patient.id)
      .select("id")
      .maybeSingle();

    if (error) {
      setPatient(prev);
      const msg = /column .* does not exist/i.test(error.message)
        ? `Column "${field}" does not exist.`
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
      <Head><title>{patient.full_name} — Patient</title></Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold text-slate-900">{patient.full_name}</h1>
            <div className="flex gap-2">
              <Link href="/patients" className="text-sm underline">All patients</Link>
              <Link href="/dashboard" className="text-sm underline">Dashboard</Link>
            </div>
          </div>

          {/* Quick add card */}
          <PatientQuickAdd
            patientId={patient.id}
            onCreated={() => {
              // refresh history if you're on that tab
              if (tab === "history") {
                // simple event: patient history component can listen and reload
                window.dispatchEvent(new CustomEvent("patient-history-refresh", { detail: { patientId: patient.id } }));
              }
            }}
          />
{/* Files & Documents */}
<div className="mt-6">
  <PatientFilesCard
    patientId={patient.id}
    patientTag={patient.patient_code || (patient.full_name ? baseFromName(patient.full_name) : "")}
  />
</div>
{/* Quick Procedure → creates a recall via rule */}
<div className="mt-6 rounded-2xl border bg-white p-4">
  <h2 className="text-sm font-semibold">Log procedure (creates recall)</h2>
  <div className="grid sm:grid-cols-3 gap-2 mt-3">
    <select id="rule" className="border rounded-md px-2 py-1 text-sm">
      <option value="6M_CHECKUP">6-month check-up</option>
      <option value="12M_CHECKUP">12-month check-up</option>
    </select>
    <input id="performed" type="date" className="border rounded-md px-2 py-1 text-sm" />
    <button
      className="border rounded-md px-3 py-2 text-sm hover:bg-slate-50"
      onClick={async () => {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        const rule = document.getElementById("rule").value;
        const performed = document.getElementById("performed").value;
        if (!performed) { alert("Pick a date"); return; }
        const { error } = await supabase
          .from("patient_procedures")
          .insert({ patient_id: patient.id, rule_code: rule, performed_on: performed });
        if (error) return alert(error.message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Procedure logged", type: "success" } }));
        }
      }}
    >
      Save
    </button>
  </div>
  <p className="text-xs text-slate-500 mt-2">A recall will be created automatically based on the rule (6 or 12 months).</p>
</div>


          <Card className="p-4">
            {/* Tabs */}
            <div className="flex gap-2">
              {["details", "notes", "history", "files"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-sm px-3 py-2 rounded-md border ${
                    tab === t ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <Separator className="my-3" />

            {tab === "details" && (
              <div className="grid gap-2 text-sm">
                <InlineEditField label="Full name" value={patient.full_name} onSave={(v) => updateField("full_name", v)} />
                <InlineEditField label="Email" type="email" value={patient.email} validate={validateEmail} onSave={(v) => updateField("email", v)} />
                <InlineEditField label="Phone" type="tel" value={patient.phone} validate={validatePhone} onSave={(v) => updateField("phone", v)} />
                {"date_of_birth" in patient && (
                  <InlineEditField label="Date of birth" type="date" value={patient.date_of_birth || ""} onSave={(v) => updateField("date_of_birth", v)} />
                )}
                <div className="flex items-center justify-between border rounded-lg bg-white p-3">
  <div className="text-slate-600">Patient tag</div>
  <div className="font-medium break-all text-right">
    {patient.patient_code || (patient.full_name ? (patient.full_name.split(/\s+/)[0] + (patient.full_name.split(/\s+/).slice(-1)[0]?.[0] || "")).replace(/[^A-Za-z]/g,"") : "—")}
  </div>
</div>
              </div>
            )}

            {tab === "notes" && <PatientNotes patientId={patient.id} />}

            {tab === "history" && <PatientHistory patientId={patient.id} />}

            {tab === "files" && <PatientFiles patientId={patient.id} />}
            <div className="mt-8">
  <PatientFiles patientId={patient.id} />
</div>

          </Card>
        </section>
      </main>
    </>
  );
}
