// pages/api/lead.js
import { createClient } from '@supabase/supabase-js'

// Optional email notifications via Resend (free tier)
let resend = null
try {
  const { Resend } = require('resend')
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
} catch {}

export const config = {
  api: {
    // Keep default bodyParser ON (parses JSON & x-www-form-urlencoded)
    bodyParser: true,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  // Next.js with bodyParser=true will give us an object for both JSON and urlencoded.
  const body = req.body || {}

  const clinic_name = body.clinic_name ?? ''
  const contact_name = body.contact_name ?? ''
  const email = body.email ?? ''
  const phone = body.phone ?? ''
  const clinic_type = body.clinic_type ?? ''
  const practitioners = body.practitioners ? Number(body.practitioners) : null
  const message = body.message ?? ''

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars')
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

  // Fire-and-forget email (if RESEND_API_KEY is present)
  if (resend) {
    try {
      await resend.emails.send({
        from: 'DentFlow <notify@dentflowai.co.za>',
        to: ['info@dentflowai.co.za'],
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
    } catch (e) {
      console.warn('Email send failed (continuing):', e?.message || e)
    }
  }

  // Success → redirect to thank-you
  res.writeHead(302, { Location: 'https://www.dentflowai.co.za/thanks' })
  res.end()
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
