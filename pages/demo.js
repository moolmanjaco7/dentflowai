// pages/demo.js
import Head from 'next/head'
import { useEffect, useState } from 'react'

function fmtDate(d) {
  return d.toISOString().slice(0,10)
}
function toLocalHM(iso) {
  const dt = new Date(iso)
  return dt.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

export default function Demo() {
  const today = new Date()
  const [date, setDate] = useState(fmtDate(today))
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({ name:'', email:'', phone:'', notes:'' })
  const [msg, setMsg] = useState('')

  const fetchSlots = async (d) => {
    setLoading(true); setSlots([]); setSel(null); setMsg('')
    const r = await fetch(`/api/booking/slots?date=${d}`)
    const j = await r.json()
    setLoading(false)
    if (!j.ok) { setMsg(j.error || 'Failed to load slots'); return }
    setSlots(j.slots)
  }

  useEffect(() => { fetchSlots(date) }, [date])

  const submit = async () => {
    setMsg(''); if (!sel) { setMsg('Please select a time slot.'); return }
    if (!form.name || !form.email) { setMsg('Name and Email are required.'); return }
    const time = new Date(sel).toISOString().slice(11,16) // HH:MM
    const r = await fetch('/api/booking/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, date, time })
    })
    const j = await r.json()
    if (!j.ok) { setMsg(j.error || 'Failed to book'); return }
    setMsg('✅ Booked! We’ll confirm by email.'); setSel(null)
  }

  return (
    <>
      <Head>
        <title>Book a DentFlow Demo</title>
        <meta name="description" content="Choose a time for a live DentFlow AI demo." />
      </Head>

      <main className="min-h-screen bg-slate-50">
        <section className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-extrabold text-slate-900">Book a Live Demo</h1>
            <p className="mt-2 text-slate-600">Pick a date and time that suits you. We’ll walk you through the dashboard and answer questions.</p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
          {/* Left: Picker & slots */}
          <div className="lg:col-span-2 bg-white border rounded-2xl p-5">
            <label className="block text-sm text-slate-600 mb-2">Choose a date</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2"
              value={date}
              min={fmtDate(today)}
              onChange={(e)=>setDate(e.target.value)}
            />

            <div className="mt-4">
              {loading ? <p className="text-sm text-slate-500">Loading slots…</p> : (
                slots.length ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {slots.map(s => (
                      <button
                        key={s}
                        onClick={()=>setSel(s)}
                        className={`px-3 py-2 rounded-xl border text-sm ${sel===s ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-slate-50'}`}
                      >
                        {toLocalHM(s)}
                      </button>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-500">No available slots for this date.</p>
              )}
            </div>
          </div>

          {/* Right: Contact form */}
          <div className="bg-white border rounded-2xl p-5">
            <h3 className="font-semibold text-slate-900">Your details</h3>
            <input className="mt-3 w-full border rounded-lg p-2" placeholder="Full name"
              value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))}/>
            <input className="mt-2 w-full border rounded-lg p-2" placeholder="Email"
              value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))}/>
            <input className="mt-2 w-full border rounded-lg p-2" placeholder="Phone (optional)"
              value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))}/>
            <textarea className="mt-2 w-full border rounded-lg p-2" rows="3" placeholder="Notes (optional)"
              value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))}/>
            {msg && <p className={`mt-2 text-sm ${msg.startsWith('✅')?'text-emerald-600':'text-red-600'}`}>{msg}</p>}
            <button onClick={submit}
              className="mt-3 w-full rounded-xl bg-blue-700 text-white py-2 hover:bg-blue-800">
              Book this demo
            </button>
          </div>
        </section>
      </main>
    </>
  )
}
