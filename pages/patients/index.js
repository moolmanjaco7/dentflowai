// pages/patients/index.js
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

{/* at the top bar of patients index page */}
<div className="flex items-center justify-between mb-4">
  <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
  <a href="/patients/new">
    <button className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-slate-50">+ Add patient</button>
  </a>
</div>


export default function PatientsIndex() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (typeof window !== "undefined") window.location.href = "/auth/login";
          return;
        }
        const { data, error } = await supabase
          .from("patients")
          .select("id, full_name, email, phone")
          .order("full_name", { ascending: true });
        if (error) throw error;
        setPatients(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message || "Failed to load patients");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = patients.filter(p => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      (p.full_name || "").toLowerCase().includes(needle) ||
      (p.email || "").toLowerCase().includes(needle) ||
      (p.phone || "").toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <Head><title>DentFlow AI — Patients</title></Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
            <Input
              placeholder="Search name, email, phone…"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              className="w-64"
            />
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-600">No patients found.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(p => (
                <Card key={p.id} className="p-4">
                  <div className="font-semibold">{p.full_name}</div>
                  <div className="text-sm text-slate-600">{p.email || "—"}</div>
                  <div className="text-sm text-slate-600">{p.phone || "—"}</div>
                  <Link
                    href={`/patients/${p.id}`}
                    className="inline-block mt-2 text-sm underline"
                  >
                    View details →
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
