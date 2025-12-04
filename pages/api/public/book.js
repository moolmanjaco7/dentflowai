// pages/api/public/book.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function makeDateInSA(dateStr, timeStr) {
  // dateStr = "2025-12-04", timeStr = "14:15"
  // Treat as Africa/Johannesburg (+02:00) and return Date
  return new Date(`${dateStr}T${timeStr}:00+02:00`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { full_name, email, phone, date, time, note } = req.body || {};

    if (!full_name || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 0) Get a clinic owner user_id (for multi-tenant you’ll later switch to clinic slug)
    const { data: clinicRow, error: clinicErr } = await supabaseAdmin
      .from("clinic_settings")
      .select("user_id")
      .limit(1)
      .maybeSingle();

    if (clinicErr) {
      console.error("clinic_settings error", clinicErr);
      return res.status(500).json({ error: "Clinic not configured." });
    }

    const ownerId = clinicRow?.user_id || null;

    // 1) Find or create patient
    let patientId = null;

    let patientQuery = supabaseAdmin
      .from("patients")
      .select("id")
      .ilike("full_name", full_name.trim())
      .limit(1);

    if (phone) {
      patientQuery = patientQuery.eq("phone", phone);
    }

    const { data: existing, error: existingErr } = await patientQuery.maybeSingle();

    if (existingErr) {
      console.error("existing patient lookup error", existingErr);
    }

    if (existing?.id) {
      patientId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("patients")
        .insert({
          full_name: full_name.trim(),
          email: email || null,
          phone: phone || null,
          user_id: ownerId, // important if NOT NULL / RLS uses this
        })
        .select("id")
        .maybeSingle();

      if (insertErr) {
        console.error("patient insert error", insertErr);
        return res.status(500).json({
          error: insertErr.message || "Could not create patient, please call the clinic.",
        });
      }
      patientId = inserted.id;
    }

    // 2) Build appointment times in UTC
    const startLocal = makeDateInSA(date, time);
    // For now: 30-minute default duration
    const endLocal = new Date(startLocal.getTime() + 30 * 60 * 1000);

    const startsAtIso = startLocal.toISOString();
    const endsAtIso = endLocal.toISOString();

    // 3) Simple overlap check for this window
    const { data: conflicts, error: conflictErr } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .lte("starts_at", endsAtIso)
      .gte("ends_at", startsAtIso)
      .limit(1);

    if (conflictErr) {
      console.error("conflict check error", conflictErr);
    }

    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({
        error: "Sorry, that time was just taken. Please pick another slot.",
      });
    }

    // 4) Insert appointment
    const { error: apptErr } = await supabaseAdmin.from("appointments").insert({
      title: `Online booking — ${full_name}`,
      patient_id: patientId,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      status: "booked", // matches your DB enum
      user_id: ownerId, // important if NOT NULL / RLS uses this
      // note: if your appointments table has extra NOT NULL columns, we’ll add them here
    });

    if (apptErr) {
      console.error("appointment insert error", apptErr);
      return res.status(500).json({
        error: apptErr.message || "Could not create appointment. Please call the clinic.",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("public booking error", e);
    return res
      .status(500)
      .json({ error: e.message || "Unexpected error. Please try again." });
  }
}
