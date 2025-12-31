// pages/api/public/book.js
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing Supabase env vars");
  return createClient(url, service);
}

async function resolveClinicIdFromBodyOrQuery(req, admin) {
  const clinic = String(req.body?.clinic_id || req.query?.clinic || "").trim();
  const slug = String(req.body?.clinic_slug || req.query?.slug || "").trim();

  if (clinic) return clinic;

  if (slug) {
    const { data, error } = await admin.from("clinics").select("id").eq("slug", slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.id) throw new Error("Clinic not found for slug");
    return data.id;
  }

  const def = process.env.NEXT_PUBLIC_DEFAULT_CLINIC_ID;
  if (def) return def;

  throw new Error("Missing clinic. Provide clinic_id/clinic_slug (or ?clinic= / ?slug=).");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const admin = getAdminClient();
    const clinicId = await resolveClinicIdFromBodyOrQuery(req, admin);

    const { name, email, phone, date, time, notes } = req.body || {};
    if (!name || !email || !date || !time) {
      return res.status(400).json({ error: "Missing name, email, date, or time" });
    }

    // Find/create patient (scoped to clinic)
    const { data: existing, error: findErr } = await admin
      .from("patients")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("email", String(email).trim().toLowerCase())
      .maybeSingle();

    if (findErr) return res.status(400).json({ error: findErr.message });

    let patientId = existing?.id;

    if (!patientId) {
      const { data: patient, error: pErr } = await admin
        .from("patients")
        .insert({
          clinic_id: clinicId,
          full_name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          phone: String(phone || "").trim(),
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (pErr) return res.status(400).json({ error: pErr.message });
      patientId = patient.id;
    }

    // Build timestamps in local time (ZA) but stored as ISO
    const startsLocal = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsLocal.getTime())) return res.status(400).json({ error: "Invalid date/time" });

    const endsLocal = new Date(startsLocal.getTime() + 30 * 60 * 1000);

    const { data: appt, error: aErr } = await admin
      .from("appointments")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        starts_at: startsLocal.toISOString(),
        ends_at: endsLocal.toISOString(),
        status: "booked",
        notes: notes ? String(notes) : null,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (aErr) return res.status(400).json({ error: aErr.message });

    return res.status(200).json({ ok: true, clinic_id: clinicId, appointment: appt });
  } catch (e) {
    console.error("public/book error:", e);
    return res.status(400).json({ error: e.message || "Unexpected error" });
  }
}
