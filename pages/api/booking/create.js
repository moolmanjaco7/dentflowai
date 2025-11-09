// pages/api/booking/create.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js'

const TZ = 'Africa/Johannesburg'
const SLOT_MINUTES = 30

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  try {
    const { name, email, phone, date, time, notes } = req.body || {}
    if (!name || !email || !date || !time) {
      return res.status(400).json({ ok: false, error: 'Missing name, email, date, or time' })
    }

    const OWNER = process.env.BOOKING_OWNER_EMAIL || 'demo@dentflowai.co.za'
    const startISO = new Date(`${date}T${time}:00`).toISOString()
    const endISO = new Date(new Date(startISO).getTime() + SLOT_MINUTES * 60000).toISOString()

    // 1) Ensure patient
    let { data: patient, error: pErr } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('email', email)
      .eq('created_by', OWNER)
      .maybeSingle()

    if (pErr && pErr.code !== 'PGRST116') return res.status(500).json({ ok: false, error: pErr.message })

    if (!patient) {
      const { data, error } = await supabaseAdmin
        .from('patients')
        .insert([{ full_name: name, phone, email, created_by: OWNER }])
        .select('id')
        .single()
      if (error) return res.status(500).json({ ok: false, error: error.message })
      patient = data
    }

    // 2) Check conflict again just-in-time
    const { data: appts, error: apErr } = await supabaseAdmin
      .from('appointments')
      .select('id, starts_at, ends_at, status')
      .gte('starts_at', `${date}T00:00:00`)
      .lt('starts_at', `${date}T23:59:59`)
    if (apErr) return res.status(500).json({ ok: false, error: apErr.message })

    const start = new Date(startISO)
    const end = new Date(endISO)
    const conflict = appts?.some(a => {
      const as = new Date(a.starts_at)
      const ae = new Date(a.ends_at)
      return start < ae && end > as
    })
    if (conflict) return res.status(409).json({ ok: false, error: 'Time slot already booked. Pick another.' })

    // 3) Create appointment
    const { data: created, error: cErr } = await supabaseAdmin
      .from('appointments')
      .insert([{
        title: 'Online Booking',
        starts_at: startISO,
        ends_at: endISO,
        status: 'scheduled',
        notes: notes || 'Booked via public page',
        patient_id: patient.id,
        created_by: OWNER
      }])
      .select('id')
      .single()
    if (cErr) return res.status(500).json({ ok: false, error: cErr.message })

    // (Optional) TODO later: send emails using SMTP

    return res.json({ ok: true, id: created.id })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
