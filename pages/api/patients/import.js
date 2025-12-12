// pages/api/patients/import.js
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

function clean(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin client not configured" });

  try {
    const { rows } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows provided" });
    }

    if (rows.length > 2000) {
      return res.status(400).json({ error: "Too many rows. Limit is 2000." });
    }

    const payload = rows
      .map((r) => ({
        full_name: clean(r.full_name || r.name),
        email: clean(r.email),
        phone: clean(r.phone),
        date_of_birth: clean(r.date_of_birth || r.dob),
        patient_code: clean(r.patient_code || r.code),
      }))
      .filter((r) => r.full_name); // require name

    if (payload.length === 0) {
      return res.status(400).json({ error: "No valid rows (full_name required)" });
    }

    const { error } = await supabaseAdmin.from("patients").insert(payload);

    if (error) {
      console.error("Import patients error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, imported: payload.length });
  } catch (err) {
    console.error("Import patients API error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
