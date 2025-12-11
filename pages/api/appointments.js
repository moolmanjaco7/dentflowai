// pages/api/appointments.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl) {
  console.warn("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!supabaseServiceKey) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is not set");
}

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
        },
      })
    : null;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseAdmin) {
    return res
      .status(500)
      .json({ error: "Supabase admin client is not configured" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select(
        `
        id,
        clinic_id,
        patient_id,
        starts_at,
        ends_at,
        status,
        notes
      `
      )
      .order("starts_at", { ascending: true })
      .limit(500);

    if (error) {
      console.error("Supabase appointments error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ appointments: data || [] });
  } catch (err) {
    console.error("Appointments API error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
