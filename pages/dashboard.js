// pages/dashboard.js
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (!session) {
          // no session → go to login
          window.location.href = '/auth/login'
          return
        }
        setSession(session)

        // Load data for "today" in SA time
        const tz = 'Africa/Johannesburg'
        const now = new Date(new Date().toLocaleString('en-ZA', { timeZone: tz }))
        const start = new Date(now); start.setHours(0,0,0,0)
        const end = new Date(now);   end.setHours(23,59,59,999)

        const startISO = start.toISOString()
        const endISO = end.toISOString()

        // Appointments
        const { data: appts, error: aErr } = await supabase
          .from('appointments')
          .select('id,title,starts_at,ends_at,status,patient_id')
          .gte('starts_at', startISO)
          .lte('starts_at', endISO)
          .order('starts_at', { ascending: true })

        if (aErr) throw aErr
        setAppointments(Array.isArray(appts) ? appts : [])

        // Patients (limit to a page)
        const { data: pats, error: pErr } = await supabase
          .from('patients')
          .select('id,full_name,phone,email')
          .order('full_name', { ascending: true })
          .limit(50)

        if (pErr) throw pErr
        setPatients(Array.isArray(pats) ? pats : [])
      } catch (e) {
        console.error(e)
        setErr(e.message || 'Failed to load data')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-slate-600">Loading dashboard…</p>
      </main>
    )
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
    )
  }

  return (
    <>
      <Head>
        <title>DentFlow AI — Dashboard</title>
      </Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-slate-900">Today’s Appointments</h1>
          {appointments.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No appointments today.</p>
          ) : (
            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {appointments.map(a => (
                <div key={a.id} className="bg-white border rounded-2xl p-4">
                  <div className="text-sm text-slate-500">{new Date(a.starts_at).toLocaleTimeString('en-ZA', {hour:'2-digit', minute:'2-digit'})} – {new Date(a.ends_at).toLocaleTimeString('en-ZA', {hour:'2-digit', minute:'2-digit'})}</div>
                  <div className="font-semibold">{a.title || 'Appointment'}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{a.status}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Patients</h2>
            <Link href="/auth/login" className="text-sm underline">Switch account</Link>
          </div>
          {patients.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No patients yet.</p>
          ) : (
            <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {patients.map(p => (
                <div key={p.id} className="bg-white border rounded-2xl p-4">
                  <div className="font-semibold">{p.full_name}</div>
                  <div className="text-sm text-slate-600">{p.email || '—'}</div>
                  <div className="text-sm text-slate-600">{p.phone || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
