// pages/dashboard.js
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import DayAppointments from "@/components/DayAppointments";
import QuickActions from "@/components/QuickActions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [appointments, setAppointments] = useState([]); // today list for the “Today’s Appointments” section
  const [patients, setPatients] = useState([]);
  const [showPatients, setShowPatients] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (typeof window !== "undefined") window.location.href = "/auth/login";
          return;
        }
        setSession(session);

        // Load a small "today" list just for this static summary card
        const tz = "Africa/Johannesburg";
        const now = new Date(new Date().toLocaleString("en-ZA", { timeZone: tz }));
        const start = new Date(now); start.setHours(0,0,0,0);
        const end = new Date(now);   end.setHours(23,59,59,999);
        const startISO = start.toISOString();
        const endISO = end.toISOString();

        const { data: appts } = await supabase
          .from("appointments")
          .select("id,title,starts_at,ends_at,status,patient_id")
          .gte("starts_at", startISO)
          .lte("starts_at", endISO)
          .order("starts_at", { ascending: true });
        setAppointments(Array.isArray(appts) ? appts : []);

        const { data: pats } = await supabase
          .from("patients")
          .select("id,full_name,phone,email")
          .order("full_name", { ascending: true })
          .limit(50);
        setPatients(Array.isArray(pats) ? pats : []);
      } catch (e) {
        setErr(e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
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
        <title>DentFlow AI — Dashboard</title>
      </Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-8 space-y-4">
          {/* Quick Actions */}
          <QuickActions />

          {/* Day picker & list */}
          <DayAppointments />

          {/* --- Patients panel (collapsible) --- */}
          <div className="mt-6">
            <button
              className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-slate-100"
              onClick={() => setShowPatients((v)=>!v)}
            >
              <span className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Patients
              </span>
              <span className="text-slate-600">
                {showPatients ? "▾" : "▸"}
              </span>
            </button>

            {showPatients && (
              <>
                {patients.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No patients yet.</p>
                ) : (
                  <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {patients.map(p => (
                      <div key={p.id} className="bg-white border rounded-2xl p-4 hover:shadow-sm transition">
                        <div className="font-semibold">{p.full_name}</div>
                        <div className="text-sm text-slate-600">{p.email || '—'}</div>
                        <div className="text-sm text-slate-600">{p.phone || '—'}</div>
                        <a href={`/patients/${p.id}`} className="text-sm underline mt-2 inline-block">
                          Open details →
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <a href="/patients" className="text-sm underline">Open full patients page</a>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
