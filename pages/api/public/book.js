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

    // 1) Find or create patient
    let patientId = null;

    // Try match by phone + name (simple heuristic)
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("patients")
      .select("id")
      .ilike("full_name", full_name.trim())
      .eq("phone", phone || null)
      .limit(1)
      .maybeSingle();

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
          // You already have patient_code logic elsewhere; we can leave this null here.
        })
        .select("id")
        .maybeSingle();

      if (insertErr) {
        console.error("patient insert error", insertErr);
        return res
          .status(500)
          .json({ error: "Could not create patient, please call the clinic." });
      }
      patientId = inserted.id;
    }

    // 2) Build appointment times in UTC
    const startLocal = makeDateInSA(date, time);
    // Use 30-minute default duration for public bookings
    const endLocal = new Date(startLocal.getTime() + 30 * 60 * 1000);

    const startsAtIso = startLocal.toISOString();
    const endsAtIso = endLocal.toISOString();

    // Optional: simple overlap check for the same time window
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
        error:
          "Sorry, that time was just taken. Please pick another slot.",
      });
    }

    // 3) Insert appointment
    const { error: apptErr } = await supabaseAdmin.from("appointments").insert({
      title: `Online booking — ${full_name}`,
      patient_id: patientId,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      status: "booked", // matches your DB enum (booked/confirmed/…)
      // If you have a field like source/type, you can set it here (e.g. source: 'public')
      public_note: note || null, // only if you have this column; if not, remove
    });

    if (apptErr) {
      console.error("appointment insert error", apptErr);
      return res
        .status(500)
        .json({ error: "Could not create appointment. Please call the clinic." });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("public booking error", e);
    return res
      .status(500)
      .json({ error: e.message || "Unexpected error. Please try again." });
  }
}
