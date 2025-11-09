// pages/api/booking/slots.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const TZ = 'Africa/Johannesburg'
const SLOT_MINUTES = 30 // slot length

export default async function handler(req, res) {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ ok: false, error: 'Missing date (YYYY-MM-DD)' })

    const day = new Date(`${date}T00:00:00`)
    const weekday = day.getDay() // 0..6

    // 1) Blackout?
    const { data: blackout } = await supabaseAdmin
      .from('blackout_dates')
      .select('date')
      .eq('date', date)
      .maybeSingle()
    if (blackout) return res.json({ ok: true, slots: [] })

    // 2) Working hours for weekday
    const { data: spans, error: avErr } = await supabaseAdmin
      .from('availability')
      .select('start_time, end_time')
      .eq('weekday', weekday)

    if (avErr) return res.status(500).json({ ok: false, error: avErr.message })
    if (!spans?.length) return res.json({ ok: true, slots: [] })

    // 3) Generate slots
    const slots = []
    for (const span of spans) {
      const [sh, sm] = span.start_time.split(':').map(Number)
      const [eh, em] = span.end_time.split(':').map(Number)
      let cursor = new Date(`${date}T${pad(sh)}:${pad(sm)}:00`)
      const end = new Date(`${date}T${pad(eh)}:${pad(em)}:00`)
      while (cursor < end) {
        const next = new Date(cursor.getTime() + SLOT_MINUTES * 60000)
        if (next <= end) slots.push(new Date(cursor))
        cursor = next
      }
    }

    // 4) Remove past times for "today"
    const nowTZ = new Date(new Date().toLocaleString('en-ZA', { timeZone: TZ }))
    const slotsFuture = slots.filter(s => s > nowTZ)

    // 5) Remove slots overlapping existing appointments (not canceled)
    const { data: appts, error: apErr } = await supabaseAdmin
      .from('appointments')
      .select('starts_at, ends_at, status, created_by')
      .or("status.eq.scheduled,status.eq.confirmed,status.eq.completed") // treat these as blocking
      .gte('starts_at', `${date}T00:00:00`)
      .lt('starts_at', `${date}T23:59:59`)

    if (apErr) return res.status(500).json({ ok: false, error: apErr.message })

    const free = slotsFuture.filter(slot => {
      const slotEnd = new Date(slot.getTime() + SLOT_MINUTES * 60000)
      return !appts?.some(a => {
        const as = new Date(a.starts_at)
        const ae = new Date(a.ends_at)
        // overlap test: (slot < ae) && (slotEnd > as)
        return slot < ae && slotEnd > as
      })
    })

    res.json({ ok: true, slots: free.map(s => s.toISOString()) })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}

function pad(n) { return String(n).padStart(2, '0') }
