// pages/api/admin/diagnostics.js
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing Supabase env vars");
  return createClient(url, service);
}

export default async function handler(req, res) {
  try {
    const expected = process.env.DIAGNOSTICS_SECRET || "";
    const key = String(req.headers["x-admin-key"] || req.query.key || "");
    if (!expected || key !== expected) return res.status(401).json({ error: "Unauthorized" });

    const supabase = getAdminClient();

    // Counts (fast)
    const clinicsCountPromise = supabase.from("clinics").select("id", { count: "exact", head: true });
    const patientsCountPromise = supabase.from("patients").select("id", { count: "exact", head: true });
    const apptsCountPromise = supabase.from("appointments").select("id", { count: "exact", head: true });

    const [clinicsCountRes, patientsCountRes, apptsCountRes] = await Promise.all([
      clinicsCountPromise,
      patientsCountPromise,
      apptsCountPromise,
    ]);

    const clinicsCount = clinicsCountRes.count ?? null;
    const patientsCount = patientsCountRes.count ?? null;
    const appointmentsCount = apptsCountRes.count ?? null;

    // Latest appointments
    const { data: appts, error: apptErr } = await supabase
      .from("appointments")
      .select("id, clinic_id, patient_id, starts_at, ends_at, status, notes, created_at, confirmation_status")
      .order("starts_at", { ascending: false })
      .limit(25);

    if (apptErr) return res.status(400).json({ error: apptErr.message });

    const patientIds = Array.from(new Set((appts || []).map((a) => a.patient_id).filter(Boolean)));
    let patientsById = {};

    if (patientIds.length) {
      const { data: pats, error: patErr } = await supabase
        .from("patients")
        .select("id, full_name, email, phone, patient_code, created_at")
        .in("id", patientIds);

      if (!patErr && Array.isArray(pats)) {
        patientsById = Object.fromEntries(pats.map((p) => [p.id, p]));
      }
    }

    const latestAppointments = (appts || []).map((a) => ({
      ...a,
      patient: patientsById[a.patient_id] || null,
    }));

    // Quick env checks (no secrets returned)
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_DEFAULT_CLINIC_ID: !!process.env.NEXT_PUBLIC_DEFAULT_CLINIC_ID,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      WHATSAPP_DAILY_SECRET: !!process.env.WHATSAPP_DAILY_SECRET,
      WHATSAPP_QUEUE_SECRET: !!process.env.WHATSAPP_QUEUE_SECRET,
      WHATSAPP_SEND_SECRET: !!process.env.WHATSAPP_SEND_SECRET,
      DIAGNOSTICS_SECRET: !!process.env.DIAGNOSTICS_SECRET,
    };

    return res.status(200).json({
      ok: true,
      serverTime: new Date().toISOString(),
      env,
      counts: { clinicsCount, patientsCount, appointmentsCount },
      latestAppointments,
    });
  } catch (err) {
    console.error("admin/diagnostics error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
