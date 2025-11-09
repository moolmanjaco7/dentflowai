// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client using the Service Role key (NEVER expose on client)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
