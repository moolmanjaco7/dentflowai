// pages/api/reminder.js
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' })
  const { apptId } = req.body || {}
  if (!apptId) return res.status(400).json({ ok:false, error:'Missing apptId' })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: appt, error: e1 } = await supabase.from('appointments').select('*').eq('id', apptId).single()
  if (e1 || !appt) return res.status(404).json({ ok:false, error:'Appointment not found' })

  let patient = null
  if (appt.patient_id) {
    const { data: p, error: e2 } = await supabase.from('patients').select('*').eq('id', appt.patient_id).single()
    if (!e2) patient = p
  }

  const title = appt.title || 'Appointment'
  const when = appt.starts_at ? new Date(appt.starts_at).toLocaleString('en-ZA') : ''
  const clinicName = 'DentFlow Clinic'
  const emailTo = patient?.email || ''

  let emailOk = false

  try {
    if (emailTo && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || 'true') === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: emailTo,
        subject: `Reminder: ${title}`,
        html: `
          <p>Hi ${escapeHtml(patient?.full_name || '')},</p>
          <p>This is a friendly reminder of your appointment <b>${escapeHtml(title)}</b> at <b>${escapeHtml(when)}</b>.</p>
          <p>Clinic: ${escapeHtml(clinicName)}</p>
          <p>If you need to reschedule, reply to this email.</p>
        `,
      })
      emailOk = true
    }
  } catch (e) {
    console.warn('SMTP reminder failed:', e?.message || e)
  }

  return res.json({ ok:true, emailOk })
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
