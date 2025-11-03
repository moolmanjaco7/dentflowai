// pages/api/lead.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  // Basic spam guard (simple, can expand with captcha later)
  const referer = req.headers.referer || ''
  if (!referer.includes('dentflowai.co.za')) {
    // still allow localhost for dev
    if (!referer.includes('localhost:3000')) {
      return res.status(400).json({ ok: false, error: 'Invalid referer' })
    }
  }

  const {
    clinic_name,
    contact_name,
    email,
    phone,
    clinic_type,
    practitioners,
    message
  } = req.body || {}

  if (!email) {
    return res.status(400).json({ ok: false, error: 'Email required' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // server-only
  )

  const { error } = await supabase.from('leads').insert([{
    clinic_name,
    contact_name,
    email,
    phone,
    clinic_type,
    practitioners: practitioners ? Number(practitioners) : null,
    message,
    source: 'website'
  }])

  if (error) {
    console.error('Insert lead error:', error)
    return res.status(500).json({ ok: false, error: 'Failed to save lead' })
  }

  // success: redirect to thank-you
  const redirectTo = 'https://www.dentflowai.co.za/thanks'
  res.writeHead(302, { Location: redirectTo })
  res.end()
}
