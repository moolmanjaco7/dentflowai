// pages/patients/new.js
"use client";
import * as React from "react";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generatePatientCode } from "@/lib/patientCode";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewPatientPage() {
  const router = useRouter();
  const [full_name, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [date_of_birth, setDob] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function save() {
    try {
      setErr("");
      if (!full_name.trim()) throw new Error("Please enter the patient's full name");
      setSaving(true);

      const patient_code = await generatePatientCode(supabase, full_name.trim());

      const { data, error } = await supabase
        .from("patients")
        .insert({
          full_name: full_name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          date_of_birth: date_of_birth || null,
          patient_code
        })
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Patient created", type: "success" } }));
      }

      router.push(`/patients/${data.id}`);
    } catch (e) {
      setErr(e.message || "Failed to create patient");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head><title>New Patient — DentFlowAI</title></Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Add new patient</h1>
            <Button variant="outline" onClick={() => router.back()}>Back</Button>
          </div>

          <div className="rounded-2xl border bg-white p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1">
                <Label>Full name</Label>
                <Input value={full_name} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. John Smith" />
              </div>
              <div className="grid gap-1">
                <Label>Date of birth (optional)</Label>
                <Input type="date" value={date_of_birth} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Email (optional)</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@clinic.com" />
              </div>
              <div className="grid gap-1">
                <Label>Phone (optional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 ..." />
              </div>
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving || !full_name.trim()}>
                {saving ? "Saving…" : "Create patient"}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
