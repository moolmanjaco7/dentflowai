// pages/api/public/slots.js
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing Supabase env vars");
  return createClient(url, service);
}

async function resolveClinicId(req, admin) {
  // Supports:
  // /api/public/slots?clinic=<uuid>
  // /api/public/slots?slug=<text>
  const clinic = String(req.query.clinic || "").trim();
  const slug = String(req.query.slug || "").trim();

  if (clinic) return clinic; // assume uuid string; DB will reject if invalid

  if (slug) {
    const { data, error } = await admin.from("clinics").select("id").eq("slug", slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.id) throw new Error("Clinic not found for slug");
    return data.id;
  }

  // fallback (optional)
  const def = process.env.NEXT_PUBLIC_DEFAULT_CLINIC_ID;
  if (def) return def;

  throw new Error("Missing clinic. Provide ?clinic=<id> or ?slug=<slug>");
}

function timeToMinutes(t) {
  // expects "HH:MM:SS" or "HH:MM"
  if (!t) return null;
  const s = String(t);
  const parts = s.split(":").map((x) => parseInt(x, 10));
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

function minutesToTime(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const admin = getAdminClient();
    const clinicId = await resolveClinicId(req, admin);

    const date = String(req.query.date || "").trim(); // "YYYY-MM-DD"
    if (!date) return res.status(400).json({ error: "Missing date" });

    // Get clinic hours
    const { data: clinic, error: cErr } = await admin
      .from("clinics")
      .select("id, open_time, close_time")
      .eq("id", clinicId)
      .single();

    if (cErr) return res.status(400).json({ error: cErr.message });

    const openMin = timeToMinutes(clinic.open_time);
    const closeMin = timeToMinutes(clinic.close_time);
    if (openMin == null || closeMin == null || closeMin <= openMin) {
      return res.status(400).json({ error: "Clinic hours not configured" });
    }

    // Slot config (30 min)
    const step = 30;

    // Existing appointments for date
    const dayStart = new Date(`${date}T00:00:00.000`).toISOString();
    const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();

    const { data: appts, error: aErr } = await admin
      .from("appointments")
      .select("starts_at, ends_at, status")
      .eq("clinic_id", clinicId)
      .gte("starts_at", dayStart)
      .lte("starts_at", dayEnd);

    if (aErr) return res.status(400).json({ error: aErr.message });

    const taken = new Set(
      (appts || [])
        .filter((a) => (a.status || "").toLowerCase() !== "cancelled")
        .map((a) => new Date(a.starts_at))
        .filter((d) => !Number.isNaN(d.getTime()))
        .map((d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)
    );

    const slots = [];
    for (let m = openMin; m + step <= closeMin; m += step) {
      const t = minutesToTime(m);
      if (!taken.has(t)) slots.push(t);
    }

    return res.status(200).json({ ok: true, clinic_id: clinicId, date, slots });
  } catch (e) {
    console.error("public/slots error:", e);
    return res.status(400).json({ error: e.message || "Error" });
  }
}
