// pages/dashboard.js
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import DayAppointments from "../components/DayAppointments"; // static import = simple & reliable

// Supabase client (browser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Get session (DON'T redirect if missing — page remains accessible)
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(session || null);

        // Only fetch protected data if logged in
        if (session) {
          const tz = "Africa/Johannesburg";
          const now = new Date(new Date().toLocaleString("en-ZA", { timeZone: tz }));
          const start = new Date(now); start.setHours(0, 0, 0, 0);
          const end = new Date(now);   end.setHours(23, 59, 59, 999);

          const { data: appts, error: aErr } = await supabase
            .from("appointments")
            .select("id,title,starts_at,ends_at,status,patient_id")
            .gte("starts_at", start.toISOString())
            .lte("starts_at", end.toISOString())
            .order("starts_at", { ascending: true });
          if (aErr) throw aErr;
          setAppointments(Array.isArray(appts) ? appts : []);

          const { data: pats, error: pErr } = await supabase
            .from("patients")
            .select("id,full_name,phone,email")
            .order("full_name", { ascending: true })
            .limit(50);
          if (pErr) throw pErr;
          setPatients(Array.isArray(pats) ? pats : []);
        }
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load data");
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

  return (
    <>
      <Head><title>DentFlowAI — Dashboard</title></Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-8 space-y-10">

          {!session && (
            <div className="rounded-xl border bg-white p-4">
              <p className="text-sm text-slate-700">
                You’re not signed in. Data may be limited.{" "}
                <Link href="/auth/login" className="underline">Log in</Link>
              </p>
            </div>
          )}

          {/* Calendar + day view (works whether logged in or not; will show errors nicely if RLS blocks) */}
          <div>
            <h2 className="text-xl font-bold mb-3">Choose a Day</h2>
            <DayAppointments />
          </div>

          {/* Today’s appointments (only if logged in) */}
          {session && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Today’s Appointments</h1>
              {appointments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No appointments today.</p>
              ) : (
                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  {appointments.map((a) => (
                    <div key={a.id} className="bg-white border rounded-2xl p-4">
                      <div className="text-sm text-slate-500">
                        {new Date(a.starts_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(a.ends_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="font-semibold">{a.title || "Appointment"}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{a.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Patients (only if logged in) */}
          {session && (
            <div>
              <div className="mt-10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Patients</h2>
                <Link href="/auth/login" className="text-sm underline">Switch account</Link>
              </div>
              {patients.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No patients yet.</p>
              ) : (
                <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {patients.map((p) => (
                    <div key={p.id} className="bg-white border rounded-2xl p-4">
                      <div className="font-semibold">{p.full_name}</div>
                      <div className="text-sm text-slate-600">{p.email || "—"}</div>
                      <div className="text-sm text-slate-600">{p.phone || "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
