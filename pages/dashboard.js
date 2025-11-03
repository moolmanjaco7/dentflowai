// pages/dashboard.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function DashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Leads state
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [leadsError, setLeadsError] = useState('')

  useEffect(() => {
    // ensure auth (optional for /dashboard right now)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
      if (!data.session) {
        router.push('/auth/login')
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s)
      if (!s) router.push('/auth/login')
    })
    return () => listener.subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    const fetchLeads = async () => {
      setLeadsLoading(true)
      setLeadsError('')
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) setLeadsError(error.message)
      else setLeads(data || [])
      setLeadsLoading(false)
    }
    fetchLeads()

    // Optional: live updates via polling every 20s
    const id = setInterval(fetchLeads, 20000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <h1 className="text-xl font-bold text-blue-800">DentFlow AI – Clinic Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {session?.user?.email}
          </span>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/auth/login')
            }}
            className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 grid gap-6 md:grid-cols-3">
        <div className="col-span-2 bg-white rounded-2xl p-6 border">
          <h2 className="font-semibold mb-3">Today’s Appointments</h2>
          <p className="text-sm text-gray-500 mb-4">
            This will show the AI-optimized schedule for the day.
          </p>
          <div className="border rounded-lg p-4 text-sm text-gray-500 bg-slate-50">
            No appointments yet. Connect your clinic or add a patient.
          </div>
        </div>

        {/* Leads panel */}
        <div className="bg-white rounded-2xl p-6 border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Latest Leads</h2>
            <button
              onClick={async () => {
                // manual refresh
                const { data, error } = await supabase
                  .from('leads')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .limit(20)
                if (!error) setLeads(data || [])
              }}
              className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200"
            >
              Refresh
            </button>
          </div>

          {leadsLoading && (
            <p className="text-sm text-gray-500">Loading leads…</p>
          )}
          {leadsError && (
            <p className="text-sm text-red-600">Error: {leadsError}</p>
          )}

          {!leadsLoading && !leadsError && leads.length === 0 && (
            <p className="text-sm text-gray-500">No leads yet.</p>
          )}

          <ul className="divide-y">
            {leads.map((l) => (
              <li key={l.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {l.clinic_name || 'Unknown clinic'}
                      <span className="text-gray-400"> — {l.clinic_type || 'N/A'}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {l.contact_name || 'No contact'} • {l.email}
                      {l.phone ? ` • ${l.phone}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
                {l.message && (
                  <p className="text-xs text-gray-600 mt-2">{l.message}</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-6 border md:col-span-3">
          <h2 className="font-semibold mb-3">Quick Actions</h2>
          <div className="flex gap-3 flex-wrap">
            <button className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800">
              Add Appointment
            </button>
            <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
              Add Patient
            </button>
            <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
              Invite Staff
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
