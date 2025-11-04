// pages/dashboard.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

// SA timezone helper (Africa/Johannesburg, UTC+2, no DST)
// We compute the start/end of "local" day and then convert to UTC ISO.
function getDayRangeISO(dateLike = new Date()) {
  // Build a local date in SA time by offsetting from UTC
  // Simpler approach: make a Date from year/month/day in local, then get UTC ISO bounds.
  const d = new Date(dateLike)
  const y = d.getFullYear()
  const m = d.getMonth()
  const day = d.getDate()

  const startLocal = new Date(y, m, day, 0, 0, 0)   // local midnight
  const endLocal   = new Date(y, m, day, 23, 59, 59)

  // Convert to ISO (UTC) for Supabase timestamptz compare
  return {
    startISO: startLocal.toISOString(),
    endISO: endLocal.toISOString()
  }
}

function formatTime(dt) {
  const d = new Date(dt)
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

// inside component:
const [day, setDay] = useState(new Date())
const [appts, setAppts] = useState([])
const [apptsLoading, setApptsLoading] = useState(true)
const [apptsErr, setApptsErr] = useState('')

async function fetchAppointments(targetDate = day) {
  setApptsLoading(true)
  setApptsErr('')
  const { startISO, endISO } = getDayRangeISO(targetDate)
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .gte('starts_at', startISO)
    .lte('starts_at', endISO)
    .order('starts_at', { ascending: true })

  if (error) setApptsErr(error.message)
  else setAppts(data || [])
  setApptsLoading(false)
}

useEffect(() => {
  fetchAppointments(day)
  // optional refetch every 30s
  const id = setInterval(() => fetchAppointments(day), 30000)
  return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [day])


export default function DashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
{/* Add Appointment */}
<div className="bg-white rounded-2xl p-6 border">
  <h2 className="font-semibold mb-3">Add Appointment</h2>
  <AddAppointmentForm day={day} onSaved={() => fetchAppointments(day)} email={session?.user?.email} />
</div>

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
{/* Today’s Appointments */}
<div className="col-span-2 bg-white rounded-2xl p-6 border md:col-span-3">
  <div className="flex items-center justify-between mb-3">
    <h2 className="font-semibold">Today’s Appointments</h2>
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={new Date(day).toISOString().slice(0,10)}
        onChange={(e) => {
          const d = new Date(e.target.value + 'T00:00:00')
          setDay(d)
        }}
        className="border rounded-lg px-3 py-1 text-sm"
      />
      <button
        onClick={() => fetchAppointments(day)}
        className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200"
      >
        Refresh
      </button>
    </div>
  </div>

  {apptsLoading && <p className="text-sm text-gray-500">Loading…</p>}
  {apptsErr && <p className="text-sm text-red-600">Error: {apptsErr}</p>}

  {!apptsLoading && !apptsErr && appts.length === 0 && (
    <div className="border rounded-lg p-4 text-sm text-gray-500 bg-slate-50">
      No appointments for this date.
    </div>
  )}

  <ul className="divide-y">
    {appts.map(a => (
      <li key={a.id} className="py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{a.title || 'Appointment'}</p>
            <p className="text-xs text-gray-500">
              {formatTime(a.starts_at)}–{formatTime(a.ends_at)} • {a.status}
              {a.created_by ? ` • by ${a.created_by}` : ''}
            </p>
            {a.notes && <p className="text-xs text-gray-600 mt-1">{a.notes}</p>}
          </div>
        </div>
      </li>
    ))}
  </ul>
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
function AddAppointmentForm({ day, onSaved, email }) {
  const [title, setTitle] = useState('Consult')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('09:30')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const toISO = (dateObj, timeHHMM) => {
    const [hh, mm] = timeHHMM.split(':').map(Number)
    const d = new Date(dateObj)
    d.setHours(hh, mm ?? 0, 0, 0)
    return d.toISOString()
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true); setMsg('')
    try {
      const payload = {
        title,
        starts_at: toISO(day, start),
        ends_at: toISO(day, end),
        status: 'scheduled',
        notes,
        created_by: email || null,
      }
      const { error } = await supabase.from('appointments').insert([payload])
      if (error) throw error
      setMsg('Saved ✅')
      setTitle('Consult'); setStart('09:00'); setEnd('09:30'); setNotes('')
      onSaved?.()
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 3500)
    }
  }

  return (
    <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
      <input value={title} onChange={e=>setTitle(e.target.value)}
             placeholder="Title" className="border rounded-lg px-3 py-2" />
      <input type="time" value={start} onChange={e=>setStart(e.target.value)}
             className="border rounded-lg px-3 py-2" />
      <input type="time" value={end} onChange={e=>setEnd(e.target.value)}
             className="border rounded-lg px-3 py-2" />
      <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                placeholder="Notes" rows={3}
                className="md:col-span-2 border rounded-lg px-3 py-2" />
      <div className="md:col-span-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">{msg}</span>
        <button disabled={saving}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
