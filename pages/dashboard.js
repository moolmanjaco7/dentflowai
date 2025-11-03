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

  // Add Lead form state
  const [form, setForm] = useState({
    clinic_name: '',
    contact_name: '',
    email: '',
    phone: '',
    clinic_type: 'Dental',
    practitioners: '',
    message: ''
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    // Auth guard
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
      if (!data.session) router.push('/auth/login')
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s)
      if (!s) router.push('/auth/login')
    })
    return () => listener.subscription.unsubscribe()
  }, [router])

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

  useEffect(() => {
    fetchLeads()
    const id = setInterval(fetchLeads, 20000)
    return () => clearInterval(id)
  }, [])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const addLead = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    try {
      const payload = {
        ...form,
        practitioners: form.practitioners ? Number(form.practitioners) : null,
        created_by: session?.user?.email || null,
      }
      const { error } = await supabase.from('leads').insert([payload])
      if (error) throw error
      setSaveMsg('Lead added ✅')
      setForm({
        clinic_name: '',
        contact_name: '',
        email: '',
        phone: '',
        clinic_type: 'Dental',
        practitioners: '',
        message: ''
      })
      fetchLeads()
    } catch (err) {
      setSaveMsg(`Error: ${err.message}`)
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3500)
    }
  }

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

        {/* Leads panel */}
        <div className="bg-white rounded-2xl p-6 border order-2 md:order-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Latest Leads</h2>
            <button
              onClick={fetchLeads}
              className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200"
            >
              Refresh
            </button>
          </div>

          {leadsLoading && <p className="text-sm text-gray-500">Loading leads…</p>}
          {leadsError && <p className="text-sm text-red-600">Error: {leadsError}</p>}
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
                      {l.created_by ? ` • by ${l.created_by}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
                {l.message && <p className="text-xs text-gray-600 mt-2">{l.message}</p>}
              </li>
            ))}
          </ul>
        </div>

        {/* Add Lead form */}
        <div className="bg-white rounded-2xl p-6 border order-1 md:order-2">
          <h2 className="font-semibold mb-3">Add Lead</h2>
          <form onSubmit={addLead} className="grid md:grid-cols-2 gap-3">
            <input name="clinic_name" value={form.clinic_name} onChange={onChange}
                   placeholder="Clinic name" className="border rounded-lg px-3 py-2" />
            <input name="contact_name" value={form.contact_name} onChange={onChange}
                   placeholder="Contact person" className="border rounded-lg px-3 py-2" />
            <input name="email" value={form.email} onChange={onChange}
                   placeholder="Email" type="email" className="border rounded-lg px-3 py-2" />
            <input name="phone" value={form.phone} onChange={onChange}
                   placeholder="Phone" className="border rounded-lg px-3 py-2" />
            <select name="clinic_type" value={form.clinic_type} onChange={onChange}
                    className="border rounded-lg px-3 py-2">
              <option>Dental</option>
              <option>Medical Practice</option>
              <option>Physio</option>
              <option>Chiro</option>
              <option>Wellness</option>
              <option>Other</option>
            </select>
            <input name="practitioners" value={form.practitioners} onChange={onChange}
                   placeholder="# Practitioners" type="number" min="1"
                   className="border rounded-lg px-3 py-2" />
            <textarea name="message" value={form.message} onChange={onChange}
                      placeholder="Notes" rows={3}
                      className="md:col-span-2 border rounded-lg px-3 py-2" />
            <div className="md:col-span-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">{saveMsg}</span>
              <button disabled={saving}
                      className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800">
                {saving ? 'Saving…' : 'Save Lead'}
              </button>
            </div>
          </form>
        </div>

        {/* Placeholder for Appointments panel */}
        <div className="col-span-2 bg-white rounded-2xl p-6 border md:col-span-3">
          <h2 className="font-semibold mb-3">Today’s Appointments</h2>
          <div className="border rounded-lg p-4 text-sm text-gray-500 bg-slate-50">
            Coming next…
          </div>
        </div>
      </main>
    </div>
  )
}
