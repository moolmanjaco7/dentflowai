// pages/patients.js
import Head from "next/head";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Toasts from "@/components/Toast";
import NewPatientModal from "@/components/NewPatientModal";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PatientsPage(){
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState("");

  async function load(){
    setLoading(true); setErr("");
    try{
      const { data: { session } } = await supabase.auth.getSession();
      if(!session){
        if (typeof window !== "undefined") window.location.href="/auth/login";
        return;
      }
      setSession(session);

      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, email, phone")
        .order("full_name",{ ascending:true })
        .limit(500);
      if(error) throw error;
      setPatients(Array.isArray(data)?data:[]);
    }catch(e){
      setErr(e?.message||"Failed to load patients");
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); },[]);

  const filtered = patients.filter(p=>{
    if(!q) return true;
    const s = q.toLowerCase();
    return (p.full_name||"").toLowerCase().includes(s)
      || (p.email||"").toLowerCase().includes(s)
      || (p.phone||"").toLowerCase().includes(s);
  });

  return (
    <>
      <Head><title>DentFlow AI — Patients</title></Head>
      <Toasts />

      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search name, email, phone"
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                className="max-w-[260px]"
              />
              <NewPatientModal onCreated={load} />
            </div>
          </div>

          <Card className="p-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                Loading…
              </div>
            ) : err ? (
              <div className="text-sm text-red-600">{err}</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-slate-600">No patients found.</div>
            ) : (
              <ul className="divide-y">
                {filtered.map((p)=>(
                  <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{p.full_name}</div>
                      <div className="text-xs text-slate-600">
                        {p.email || "—"} · {p.phone || "—"}
                      </div>
                    </div>
                    {/* Link placeholder to future patient details page */}
                    <Link href="#" className="text-xs underline text-slate-700 hover:text-slate-900">
                      View record
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </main>
    </>
  );
}
