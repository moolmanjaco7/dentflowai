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
    const { patientId, force } = req.body || {};
    if (!patientId) return res.status(400).json({ error: "Missing patientId" });

    // Count appointments
    const { count, error: countErr } = await supabaseAdmin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId);

    if (countErr) {
      console.error("Count appointments error:", countErr);
      return res.status(500).json({ error: "Failed to validate patient appointments" });
    }

    const apptCount = count || 0;

    // If appointments exist and not forcing, block delete
    if (apptCount > 0 && !force) {
      return res.status(409).json({
        error: `This patient has ${apptCount} appointment(s). Tick "Delete appointments too" to delete anyway.`,
        appointmentCount: apptCount,
      });
    }

    // If forcing, delete appointments first
    if (apptCount > 0 && force) {
      const { error: delApptsErr } = await supabaseAdmin
        .from("appointments")
        .delete()
        .eq("patient_id", patientId);

      if (delApptsErr) {
        console.error("Delete appointments error:", delApptsErr);
        return res.status(500).json({ error: "Failed to delete appointments for this patient." });
      }
    }

    // Delete patient
    const { error: delPatientErr } = await supabaseAdmin
      .from("patients")
      .delete()
      .eq("id", patientId);

    if (delPatientErr) {
      console.error("Delete patient error:", delPatientErr);
      return res.status(500).json({ error: delPatientErr.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Delete patient API error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
