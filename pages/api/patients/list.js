// pages/api/patients/list.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
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
      .from("patients")
      .select(
        `
        id,
        full_name,
        email,
        phone,
        created_at,
        created_by,
        date_of_birth,
        patient_code
      `
      )
      .order("created_at", { ascending: false })
      .limit(2000);

    if (error) {
      console.error("Supabase patients list error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ patients: data || [] });
  } catch (err) {
    console.error("Patients list API error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
