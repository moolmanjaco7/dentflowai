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
    // 1) Get appointments
    const { data: appts, error: apptError } = await supabaseAdmin
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

    if (apptError) {
      console.error("Supabase appointments error:", apptError);
      return res.status(500).json({ error: apptError.message });
    }

    const appointments = appts || [];

    // 2) Collect unique patient IDs
    const patientIds = Array.from(
      new Set(
        appointments
          .map((a) => a.patient_id)
          .filter((id) => id !== null && id !== undefined)
      )
    );

    let patientMap = {};

    if (patientIds.length > 0) {
      // 3) Fetch patients
      const { data: patients, error: patientError } = await supabaseAdmin
        .from("patients")
        .select("id, full_name");

      if (patientError) {
        console.error("Supabase patients error:", patientError);
        // We still return appointments, just without names
      } else {
        patientMap = (patients || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || null;
          return acc;
        }, {});
      }
    }

    // 4) Attach patient_name to each appointment
    const normalized = appointments.map((a) => ({
      ...a,
      patient_name:
        (a.patient_id && patientMap[a.patient_id]) || null,
    }));

    return res.status(200).json({ appointments: normalized });
  } catch (err) {
    console.error("Appointments API error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
