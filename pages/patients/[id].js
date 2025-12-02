// pages/patients/[id].js
"use client";

import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import PatientNotes from "@/components/PatientNotes";
import PatientHistory from "@/components/PatientHistory";
import InlineEditField from "@/components/InlineEditField";
import PatientQuickAdd from "@/components/PatientQuickAdd";
import PatientFilesCard from "@/components/PatientFilesCard";
import { baseFromName } from "@/lib/patientCode";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PatientDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [patient, setPatient] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, email, phone, date_of_birth, patient_code")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      setPatient(data);
    } catch (e) {
      setErr(e.message || "Failed to load patient");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function updateField(field, value) {
    if (!patient) return;
    const prev = patient;
    setPatient({ ...patient, [field]: value });
    const { error } = await supabase
      .from("patients")
      .update({ [field]: value })
      .eq("id", patient.id);
    if (error) {
      setPatient(prev);
      alert(error.message);
    }
  }

  return (
    <>
      <Head>
        <title>Patient — DentFlowAI</title>
      </Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">
                <Link href="/patients" className="underline">
                  Patients
                </Link>{" "}
                / Details
              </div>
              <h1 className="text-2xl font-bold text-slate-900 truncate">
                {patient?.full_name || "Patient"}
                {patient && (
                  <span className="ml-2 text-sm font-medium text-slate-500">
                    ·{" "}
                    {patient.patient_code ||
                      (patient.full_name ? baseFromName(patient.full_name) : "")}
                  </span>
                )}
              </h1>
            </div>
            <Link href="/patients">
              <button className="border rounded-md px-3 py-2 text-sm hover:bg-slate-50">
                Back
              </button>
            </Link>
          </div>

          <Separator className="my-4" />

          {loading ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : !patient ? (
            <p className="text-sm text-slate-600">Patient not found.</p>
          ) : (
            <>
              {/* Top: Quick Info + Inline edits */}
              <div className="grid lg:grid-cols-3 gap-4">
                <Card className="p-4 lg:col-span-2">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <InlineEditField
                      label="Full name"
                      value={patient.full_name || ""}
                      onSave={(v) => updateField("full_name", v)}
                      placeholder="John Smith"
                    />
                    <InlineEditField
                      label="Patient tag"
                      value={patient.patient_code || ""}
                      onSave={(v) => updateField("patient_code", v)}
                      placeholder="JohnS"
                    />
                    <InlineEditField
                      label="Email"
                      value={patient.email || ""}
                      onSave={(v) => updateField("email", v || null)}
                      placeholder="name@clinic.com"
                    />
                    <InlineEditField
                      label="Phone"
                      value={patient.phone || ""}
                      onSave={(v) => updateField("phone", v || null)}
                      placeholder="+27 ..."
                    />
                    <InlineEditField
                      label="Date of birth"
                      type="date"
                      value={patient.date_of_birth || ""}
                      onSave={(v) => updateField("date_of_birth", v || null)}
                    />
                  </div>
                </Card>

                {/* Quick actions (e.g., add appointment for this patient) */}
                <Card className="p-4">
                  <PatientQuickAdd
                    patientId={patient.id}
                    patientName={patient.full_name}
                  />
                </Card>
              </div>

              {/* Files & Documents */}
              <div className="mt-6">
                <PatientFilesCard
                  patientId={patient.id}
                  patientTag={
                    patient.patient_code ||
                    (patient.full_name ? baseFromName(patient.full_name) : "")
                  }
                />
              </div>

              {/* Notes + History */}
              <div className="mt-6 grid lg:grid-cols-2 gap-4">
                <Card className="p-4">
                  <PatientNotes patientId={patient.id} />
                </Card>
                <Card className="p-4">
                  <PatientHistory patientId={patient.id} />
                </Card>
              </div>

              {/* Quick Procedure → creates recall via rule */}
              <div className="mt-6 rounded-2xl border bg-white p-4">
                <h2 className="text-sm font-semibold">
                  Log procedure (creates recall)
                </h2>
                <div className="grid sm:grid-cols-3 gap-2 mt-3">
                  <select
                    id="rule"
                    className="border rounded-md px-2 py-1 text-sm"
                  >
                    <option value="6M_CHECKUP">6-month check-up</option>
                    <option value="12M_CHECKUP">12-month check-up</option>
                  </select>
                  <input
                    id="performed"
                    type="date"
                    className="border rounded-md px-2 py-1 text-sm"
                  />
                  <button
                    className="border rounded-md px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={async () => {
                      const rule = document.getElementById("rule").value;
                      const performed =
                        document.getElementById("performed").value;
                      if (!performed) {
                        alert("Pick a date");
                        return;
                      }
                      const { error } = await supabase
                        .from("patient_procedures")
                        .insert({
                          patient_id: patient.id,
                          rule_code: rule,
                          performed_on: performed,
                        });
                      if (error) return alert(error.message);
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("toast", {
                            detail: {
                              title: "Procedure logged",
                              type: "success",
                            },
                          })
                        );
                      }
                    }}
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  A recall will be created automatically based on the rule (6 or
                  12 months).
                </p>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
