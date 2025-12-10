// pages/dashboard.js
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import DashboardCalendar, {
  CalendarAppointment,
} from "@/components/dashboard/DashboardCalendar";

const DayAppointments = dynamic(() => import("@/components/DayAppointments"), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (!session) {
          window.location.href = "/auth/login";
          return;
        }
        setSession(session);

        // Load a page of patients for the right-side list
        const { data: pats, error: pErr } = await supabase
          .from("patients")
          .select("id,full_name,phone,email")
          .order("full_name", { ascending: true })
          .limit(50);
        if (pErr) throw pErr;
        setPatients(Array.isArray(pats) ? pats : []);
      } catch (e) {
        setErr(e.message || "Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-slate-600">Loading dashboard…</p>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border rounded-2xl p-6 max-w-lg">
          <h1 className="text-xl font-bold text-slate-900">Dashboard error</h1>
          <p className="mt-2 text-sm text-red-600">{err}</p>
          <p className="mt-2 text-sm text-slate-600">Try refreshing or log in again.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>DentFlowAI — Dashboard</title>
      </Head>

      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-8">
          {/* ONE source of truth for appointments (includes calendar + list) */}
          <DayAppointments />

          {/* Patients block */}
          <div className="mt-10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Patients</h2>
            <Link href="/patients" className="text-sm underline">Open patients</Link>
          </div>
          {patients.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No patients yet.</p>
          ) : (
            <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {patients.map(p => (
                <Link key={p.id} href={`/patients/${p.id}`} className="bg-white border rounded-2xl p-4 hover:bg-slate-50">
                  <div className="font-semibold">{p.full_name}</div>
                  <div className="text-sm text-slate-600">{p.email || "—"}</div>
                  <div className="text-sm text-slate-600">{p.phone || "—"}</div>
                </Link>
              ))}
            </div>
          )}

          {/* If you render RecallsCard, it can stay below */}
          {/* <div className="mt-8"><RecallsCard /></div> */}
        </section>
      </main>
    </>
  );
}
