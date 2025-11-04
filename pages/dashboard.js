// pages/dashboard.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

/* ---------- Helpers ---------- */

// SA time day range (local midnight to 23:59:59, converted to ISO/UTC)
function getDayRangeISO(dateLike = new Date()) {
  const d = new Date(dateLike)
  if (isNaN(d)) {
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth(), day = now.getDate()
    const startLocal = new Date(y, m, day, 0, 0, 0)
    const endLocal   = new Date(y, m, day, 23, 59, 59)
    return { startISO: startLocal.toISOString(), endISO: endLocal.toISOString() }
  }
  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate()
  const startLocal = new Date(y, m, day, 0, 0, 0)
  const endLocal   = new Date(y, m, day, 23, 59, 59)
  return { startISO: startLocal.toISOString(), endISO: endLocal.toISOString() }
}
function formatTime(dt) {
  const d = new Date(dt)
  if (isNaN(d)) return ''
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

// Status chip metadata
const STATUS_META = {
  scheduled: { label: 'Scheduled', cls: 'bg-slate-100 text-slate-700' },
  confirmed: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  no_show:   { label: 'No-show',   cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700' },
}
function StatusChip({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.scheduled
  return <span className={`text-xs px-2 py-1 rounded-lg ${meta.cls}`}>{meta.label}</span>
}

/* ---------- Page ---------- */

export default function DashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Leads
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [leadsError, setLeadsError] = useState('')

  // Patients
  const [patients, setPatients] = useState([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [patientsErr, setPatientsErr] = useState('')

  // Appointments
  const [day, setDay] = useState(new Date())
  const [appts, setAppts] = useState([])
  const [apptsLoading, setApptsLoading] = useState(true)
  const [apptsErr, setApptsErr] = useState('')

  // Lead form
  const [formLead, setFormLead] = useState({
    clinic_name: '', contact_name: '', email: '', phone: '',
    clinic_type: 'Dental', practitioners: '', message: ''
  })
  const [leadSaving, setLeadSaving] = useState(false)
  const [leadMsg, setLeadMsg] = useState('')

  // -------- Auth --------
  useEffect(() => {
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

  // -------- Fetchers --------
  const fetchLeads = async () => {
    setLeadsLoading(true); setLeadsError('')
    const { data, error } = await supabase.from('leads')
      .select('*').order('created_at', { ascending: false }).limit(20)
    if (error) setLeadsError(error.message); else setLeads(data || [])
    setLeadsLoading(false)
  }
  const fetchPatients = async () => {
    setPatientsLoading(true); setPatientsErr('')
    const { data, error } = await supabase.from('patients')
      .select('*').order('created_at', { ascending: false }).limit(200)
    if (error) setPatientsErr(error.message); else setPatients(data || [])
    setPatientsLoading(false)
  }
  async function fetchAppointments(targetDate = day) {
    setApptsLoading(true); setApptsErr('')
    const { startISO, endISO } = getDayRangeISO(targetDate)
    const { data, error } = await supabase.from('appointments')
      .select('*').gte('starts_at', startISO).lte('starts_at', endISO)
      .order('starts_at', { ascending: true })
    if (error) setApptsErr(error.message); else setAppts(data || [])
    setApptsLoading(false)
  }

  useEffect(() => {
    fetchLeads(); fetchPatients(); fetchAppointments(day)
    const id = setInterval(() => fetchAppointments(day), 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  // -------- Lead add --------
  const onLeadChange = (e) => setFormLead(f => ({ ...f, [e.target.name]: e.target.value }))
  const addLead = async (e) => {
    e.preventDefault()
    setLeadSaving(true); setLeadMsg('')
    try {
      const payload = {
        ...formLead,
        practitioners: formLead.practitioners ? Number(formLead.practitioners) : null,
        created_by: session?.user?.email || null,
      }
      const { error } = await supabase.from('leads').insert([payload])
      if (error) throw error
      setLeadMsg('Lead added ✅')
      setFormLead({ clinic_name:'', contact_name:'', email:'', phone:'', clinic_type:'Dental', practitioners:'', message:'' })
      fetchLeads()
    } catch (err) {
      setLeadMsg(`Error: ${err.message}`)
    } finally {
      setLeadSaving(false); setTimeout(()=>setLeadMsg(''), 3500)
    }
  }

  // Join helper
  const patientName = (id) => patients.find(p => p.id === id)?.full_name || 'Unknown'

  // -------- Status update (with optimistic UI) --------
  async function updateAppointmentStatus(id, nextStatus) {
    const prev = [...appts]
    setAppts(appts.map(a => a.id === id ? { ...a, status: nextStatus } : a))
    const { error } = await supabase.from('appointments').update({ status: nextStatus }).eq('id', id)
    if (error) { setAppts(prev); alert(`Failed to update: ${error.message}`) }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading dashboard...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <h1 className="text-xl font-bold text-blue-800">DentFlow AI – Clinic Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session?.user?.email}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
            className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-6 grid gap-6 md:grid-cols-3">
        {/* Latest Leads */}
        <div className="bg-white rounded-2xl p-6 border order-2 md:order-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Latest Leads</h2>
            <button onClick={fetchLeads} className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200">Refresh</button>
          </div>
          {leadsLoading && <p className="text-sm text-gray-500">Loading leads…</p>}
          {leadsError && <p className="text-sm text-red-600">Error: {leadsError}</p>}
          {!leadsLoading && !leadsError && leads.length === 0 && <p className="text-sm text-gray-500">No leads yet.</p>}
          <ul className="divide-y">
            {leads.map(l => (
              <li key={l.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {l.clinic_name || 'Unknown clinic'}<span className="text-gray-400"> — {l.clinic_type || 'N/A'}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {l.contact_name || 'No contact'} • {l.email}{l.phone ? ` • ${l.phone}` : ''}{l.created_by ? ` • by ${l.created_by}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                {l.message && <p className="text-xs text-gray-600 mt-1">{l.message}</p>}
              </li>
            ))}
          </ul>
        </div>

        {/* Add Lead */}
        <div className="bg-white rounded-2xl p-6 border order-1 md:order-2">
          <h2 className="font-semibold mb-3">Add Lead</h2>
          <form onSubmit={addLead} className="grid md:grid-cols-2 gap-3">
            <input name="clinic_name" value={formLead.clinic_name} onChange={onLeadChange} placeholder="Clinic name" className="border rounded-lg px-3 py-2" />
            <input name="contact_name" value={formLead.contact_name} onChange={onLeadChange} placeholder="Contact person" className="border rounded-lg px-3 py-2" />
            <input name="email" value={formLead.email} onChange={onLeadChange} placeholder="Email" type="email" className="border rounded-lg px-3 py-2" />
            <input name="phone" value={formLead.phone} onChange={onLeadChange} placeholder="Phone" className="border rounded-lg px-3 py-2" />
            <select name="clinic_type" value={formLead.clinic_type} onChange={onLeadChange} className="border rounded-lg px-3 py-2">
              <option>Dental</option><option>Medical Practice</option><option>Physio</option><option>Chiro</option><option>Wellness</option><option>Other</option>
            </select>
            <input name="practitioners" value={formLead.practitioners} onChange={onLeadChange} placeholder="# Practitioners" type="number" min="1" className="border rounded-lg px-3 py-2" />
            <textarea name="message" value={formLead.message} onChange={onLeadChange} placeholder="Notes" rows={3} className="md:col-span-2 border rounded-lg px-3 py-2" />
            <div className="md:col-span-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">{leadMsg}</span>
              <button disabled={leadSaving} className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800">{leadSaving ? 'Saving…' : 'Save Lead'}</button>
            </div>
          </form>
        </div>

        {/* Patients (add + list) */}
        <div className="bg-white rounded-2xl p-6 border order-3 md:order-3">
          <h2 className="font-semibold mb-3">Add Patient</h2>
          <AddPatientForm email={session?.user?.email} onSaved={fetchPatients} />
          <p className="text-xs text-gray-500 mt-3">Patients listed below will appear in the appointment selector.</p>
          {patientsLoading ? (
            <p className="text-sm text-gray-500 mt-3">Loading patients…</p>
          ) : patientsErr ? (
            <p className="text-sm text-red-600 mt-3">Error: {patientsErr}</p>
          ) : (
            <ul className="divide-y mt-3 max-h-60 overflow-auto">
              {patients.map(p => (
                <li key={p.id} className="py-2 text-sm">
                  {p.full_name} {p.phone ? `• ${p.phone}` : ''} {p.email ? `• ${p.email}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Today’s Appointments */}
        <div className="col-span-2 bg-white rounded-2xl p-6 border md:col-span-3 order-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Today’s Appointments</h2>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={new Date(day).toISOString().slice(0,10)}
                onChange={(e)=>setDay(new Date(e.target.value+'T00:00:00'))}
                className="border rounded-lg px-3 py-1 text-sm"
              />
              <button onClick={()=>fetchAppointments(day)} className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200">Refresh</button>
            </div>
          </div>

          <AddAppointmentForm
            day={day}
            onSaved={() => fetchAppointments(day)}
            email={session?.user?.email}
            patients={patients}
          />

          {apptsLoading && <p className="text-sm text-gray-500 mt-3">Loading…</p>}
          {apptsErr && <p className="text-sm text-red-600 mt-3">Error: {apptsErr}</p>}

          {!apptsLoading && !apptsErr && appts.length === 0 && (
            <div className="border rounded-lg p-4 text-sm text-gray-500 bg-slate-50 mt-3">
              No appointments for this date.
            </div>
          )}

          <ul className="divide-y mt-2">
            {appts.map(a => (
              <li key={a.id} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {a.title || 'Appointment'}
                      {a.patient_id ? ` — ${patientName(a.patient_id)}` : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTime(a.starts_at)}–{formatTime(a.ends_at)} {a.created_by ? `• by ${a.created_by}` : ''}
                    </p>
                    {a.notes && <p className="text-xs text-gray-600 mt-1">{a.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusChip status={a.status} />
                    {a.status !== 'confirmed' && (
                      <button onClick={() => updateAppointmentStatus(a.id, 'confirmed')}
                        className="text-xs px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Confirm</button>
                    )}
                    {a.status !== 'completed' && (
                      <button onClick={() => updateAppointmentStatus(a.id, 'completed')}
                        className="text-xs px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Complete</button>
                    )}
                    {a.status !== 'no_show' && (
                      <button onClick={() => updateAppointmentStatus(a.id, 'no_show')}
                        className="text-xs px-2 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700">No-show</button>
                    )}
                    {a.status !== 'cancelled' && (
                      <button onClick={() => updateAppointmentStatus(a.id, 'cancelled')}
                        className="text-xs px-2 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700">Cancel</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </main>
    </div>
  )
}

/* ---------- Subcomponents ---------- */

function AddPatientForm({ email, onSaved }) {
  const [full_name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pemail, setPemail] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setSaving(true); setMsg('')
    try {
      const payload = { full_name, phone, email: pemail, created_by: email || null }
      const { error } = await supabase.from('patients').insert([payload])
      if (error) throw error
      setMsg('Patient added ✅')
      setName(''); setPhone(''); setPemail('')
      onSaved?.()
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    } finally {
      setSaving(false); setTimeout(()=>setMsg(''), 3500)
    }
  }

  return (
    <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
      <input value={full_name} onChange={e=>setName(e.target.value)} placeholder="Full name" required className="border rounded-lg px-3 py-2" />
      <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone" className="border rounded-lg px-3 py-2" />
      <input value={pemail} onChange={e=>setPemail(e.target.value)} placeholder="Email" type="email" className="md:col-span-2 border rounded-lg px-3 py-2" />
      <div className="md:col-span-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">{msg}</span>
        <button disabled={saving} className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800">
          {saving ? 'Saving…' : 'Save Patient'}
        </button>
      </div>
    </form>
  )
}

function AddAppointmentForm({ day, onSaved, email, patients }) {
  const [title, setTitle] = useState('Consult')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('09:30')
  const [patient_id, setPatientId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const toISO = (dateObj, timeHHMM) => {
    const [hh, mm] = timeHHMM.split(':').map(Number)
    const d = new Date(dateObj); d.setHours(hh, mm ?? 0, 0, 0)
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
        patient_id: patient_id || null,
        created_by: email || null,
      }
      const { error } = await supabase.from('appointments').insert([payload])
      if (error) throw error
      setMsg('Appointment added ✅')
      setTitle('Consult'); setStart('09:00'); setEnd('09:30'); setPatientId(''); setNotes('')
      onSaved?.()
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    } finally {
      setSaving(false); setTimeout(()=>setMsg(''), 3500)
    }
  }

  return (
    <form onSubmit={save} className="grid md:grid-cols-4 gap-3 mb-4">
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="border rounded-lg px-3 py-2" />
      <input type="time" value={start} onChange={e=>setStart(e.target.value)} className="border rounded-lg px-3 py-2" />
      <input type="time" value={end} onChange={e=>setEnd(e.target.value)} className="border rounded-lg px-3 py-2" />
      <select value={patient_id} onChange={e=>setPatientId(e.target.value)} className="border rounded-lg px-3 py-2">
        <option value="">Select patient (optional)</option>
        {Array.isArray(patients) && patients.map(p => (
          <option key={p.id} value={p.id}>{p.full_name}</option>
        ))}
      </select>
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes" rows={2} className="md:col-span-4 border rounded-lg px-3 py-2" />
      <div className="md:col-span-4 flex items-center justify-between">
        <span className="text-xs text-gray-500">{msg}</span>
        <button disabled={saving} className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800">
          {saving ? 'Saving…' : 'Save Appointment'}
        </button>
      </div>
    </form>
  )
}
