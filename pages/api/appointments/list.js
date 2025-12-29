// pages/api/appointments/list.js
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing Supabase env vars");
  return createClient(url, service);
}

async function getUserAndClinic(req, admin) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return { error: "Missing token" };

  const token = authHeader.replace("Bearer ", "").trim();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return { error: "Invalid token" };

  const user = userData.user;

  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("clinic_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) return { error: profErr.message };
  if (!profile?.clinic_id) return { error: "Clinic not set. Complete onboarding." };

  return { user, clinic_id: profile.clinic_id, role: profile.role || "user" };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const admin = getAdminClient();
    const ctx = await getUserAndClinic(req, admin);
    if (ctx.error) return res.status(401).json({ error: ctx.error });

    const clinicId = ctx.clinic_id;

    // Optional range filters
    const from = req.query.from ? new Date(String(req.query.from)).toISOString() : null;
    const to = req.query.to ? new Date(String(req.query.to)).toISOString() : null;

    let q = admin
      .from("appointments")
      .select("id, clinic_id, patient_id, starts_at, ends_at, status, confirmation_status, notes, created_at")
      .eq("clinic_id", clinicId)
      .order("starts_at", { ascending: false })
      .limit(1000);

    if (from) q = q.gte("starts_at", from);
    if (to) q = q.lte("starts_at", to);

    const { data: appts, error: apptErr } = await q;
    if (apptErr) return res.status(400).json({ error: apptErr.message });

    const patientIds = Array.from(new Set((appts || []).map((a) => a.patient_id).filter(Boolean)));
    let patientsById = {};

    if (patientIds.length) {
      const { data: pats } = await admin
        .from("patients")
        .select("id, clinic_id, full_name, email, phone, patient_code, date_of_birth")
        .eq("clinic_id", clinicId)
        .in("id", patientIds);

      if (Array.isArray(pats)) {
        patientsById = Object.fromEntries(pats.map((p) => [p.id, p]));
      }
    }

    const enriched = (appts || []).map((a) => ({
      ...a,
      patient: patientsById[a.patient_id] || null,
    }));

    return res.status(200).json({ ok: true, clinic_id: clinicId, appointments: enriched });
  } catch (e) {
    console.error("api/appointments/list error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}
