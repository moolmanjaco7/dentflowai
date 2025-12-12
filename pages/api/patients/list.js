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
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin client not configured" });

  try {
    // 1) Fetch patients
    const { data: patients, error: pErr } = await supabaseAdmin
      .from("patients")
      .select(
        "id, full_name, email, phone, created_at, created_by, date_of_birth, patient_code"
      )
      .order("created_at", { ascending: false })
      .limit(3000);

    if (pErr) {
      console.error("Patients list error:", pErr);
      return res.status(500).json({ error: pErr.message });
    }

    const rows = patients || [];
    if (rows.length === 0) return res.status(200).json({ patients: [] });

    // 2) Fetch appointments (only fields needed)
    const { data: appts, error: aErr } = await supabaseAdmin
      .from("appointments")
      .select("patient_id, starts_at")
      .not("patient_id", "is", null)
      .order("starts_at", { ascending: true })
      .limit(20000);

    if (aErr) {
      console.error("Appointments summary error:", aErr);
      // Return patients anyway (without summary)
      return res.status(200).json({
        patients: rows.map((p) => ({ ...p, appointment_count: 0, last_visit: null })),
      });
    }

    // 3) Build summary map
    const summary = {};
    (appts || []).forEach((a) => {
      const pid = a.patient_id;
      if (!pid) return;
      if (!summary[pid]) summary[pid] = { appointment_count: 0, last_visit: null };

      summary[pid].appointment_count += 1;
      summary[pid].last_visit = a.starts_at; // since sorted asc, last assignment becomes latest
    });

    // 4) Merge into patients
    const merged = rows.map((p) => {
      const s = summary[p.id] || { appointment_count: 0, last_visit: null };
      return { ...p, ...s };
    });

    return res.status(200).json({ patients: merged });
  } catch (err) {
    console.error("Patients list API error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
