// pages/api/lead.js
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = req.body || {}
  const clinic_name = body.clinic_name ?? ''
  const contact_name = body.contact_name ?? ''
  const email = body.email ?? ''
  const phone = body.phone ?? ''
  const clinic_type = body.clinic_type ?? ''
  const practitioners = body.practitioners ? Number(body.practitioners) : null
  const message = body.message ?? ''

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured' })
  }
  if (!email) {
    return res.status(400).json({ ok: false, error: 'Email required' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await supabase.from('leads').insert([{
    clinic_name,
    contact_name,
    email,
    phone,
    clinic_type,
    practitioners,
    message,
    source: 'website',
  }])

  if (error) {
    console.error('Insert lead error:', error)
    return res.status(500).json({ ok: false, error: 'Failed to save lead' })
  }

  // Send email via SMTP (optional if env present)
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || 'true') === 'true', // true for 465, false for 587
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.SMTP_TO || process.env.SMTP_USER,
        subject: 'New DentFlow Lead',
        html: `
          <h2>New Lead</h2>
          <p><b>Clinic:</b> ${escapeHtml(clinic_name)}</p>
          <p><b>Contact:</b> ${escapeHtml(contact_name)}</p>
          <p><b>Email:</b> ${escapeHtml(email)}</p>
          <p><b>Phone:</b> ${escapeHtml(phone)}</p>
          <p><b>Type:</b> ${escapeHtml(clinic_type)}</p>
          <p><b>Practitioners:</b> ${practitioners ?? ''}</p>
          <p><b>Notes:</b><br/>${escapeHtml(message)}</p>
        `.trim(),
      })
    }
  } catch (e) {
    console.warn('SMTP send failed (continuing):', e?.message || e)
  }

  // Success → redirect to thank-you
  res.writeHead(302, { Location: 'https://www.dentflowai.co.za/thanks' })
  res.end()
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
