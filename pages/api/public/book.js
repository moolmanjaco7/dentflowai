// pages/api/public/book.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role to bypass RLS in server-only route
);

// build ISO from local SA date+time
function toStartsAtISO(dateYmd, timeHm) {
  // dateYmd: "2025-12-03", timeHm: "14:28"
  // SA time is UTC+02:00 (no DST). Append offset so it converts correctly to UTC.
  return `${dateYmd}T${timeHm}:00+02:00`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      date,                // "YYYY-MM-DD"
      time,                // "HH:mm"
      name,                // patient full name
      email,               // optional but recommended
      phone,               // optional
      practitioner_id,     // nullable
      title,               // optional appointment title
      duration_minutes,    // optional, default 30
      note                 // NEW: internal note saved on the appointment
    } = req.body || {};

    if (!date || !time || !name) {
      return res.status(400).json({ ok: false, error: "Missing date, time or name" });
    }

    const startsAtISO = toStartsAtISO(date, time);
    const duration = Number(duration_minutes) > 0 ? Number(duration_minutes) : 30;
    const endsAt = new Date(startsAtISO);
    endsAt.setMinutes(endsAt.getMinutes() + duration);

    // 1) Find or create patient (prefer email, then phone)
    let patient = null;

    if (email) {
      const { data, error } = await supabaseAdmin
        .from("patients")
        .select("*")
        .eq("email", email)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      patient = data || null;
    }

    if (!patient && phone) {
      const { data, error } = await supabaseAdmin
        .from("patients")
        .select("*")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      patient = data || null;
    }

    if (!patient) {
      const { data, error } = await supabaseAdmin
        .from("patients")
        .insert({
          full_name: name,
          email: email || null,
          phone: phone || null
        })
        .select("*")
        .single();
      if (error) throw error;
      patient = data;
    }

    // 2) Create appointment
    const { data: appointment, error: aErr } = await supabaseAdmin
      .from("appointments")
      .insert({
        title: title || "Appointment",
        patient_id: patient.id,
        practitioner_id: practitioner_id || null,
        starts_at: new Date(startsAtISO).toISOString(),
        ends_at: endsAt.toISOString(),
        status: "booked",
        note: note || null // <— save the internal note
      })
      .select("id")
      .single();

    if (aErr) throw aErr;

    return res.status(200).json({ ok: true, id: appointment.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
