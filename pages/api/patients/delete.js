// pages/api/patients/delete.js
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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin client not configured" });

  try {
    const { patientId } = req.body || {};
    if (!patientId) return res.status(400).json({ error: "Missing patientId" });

    // Optional safety: block delete if patient has appointments
    const { count, error: countErr } = await supabaseAdmin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId);

    if (countErr) {
      console.error("Count appointments error:", countErr);
      return res.status(500).json({ error: "Failed to validate patient appointments" });
    }

    if ((count || 0) > 0) {
      return res.status(409).json({
        error: "This patient has appointments and cannot be deleted. Cancel/delete appointments first.",
      });
    }

    const { error } = await supabaseAdmin.from("patients").delete().eq("id", patientId);
    if (error) {
      console.error("Delete patient error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Delete patient API error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
