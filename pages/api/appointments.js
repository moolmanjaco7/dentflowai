// pages/api/appointments.js

import supabaseAdmin from "../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // You can add filters later (clinic_id, date range, etc.)
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
