// pages/api/public/slots.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

function buildLocalISO(dateStr, minuteOfDay) {
  // dateStr: YYYY-MM-DD, minuteOfDay: 0..1439
  const [y, m, d] = dateStr.split("-").map(Number);
  const hh = Math.floor(minuteOfDay / 60);
  const mm = minuteOfDay % 60;
  // Local time (serverless runs UTC, but Date(y,m,d,hh,mm) creates a "local" date object in runtime tz)
  // We intentionally construct by components then convert to ISO for consistency.
  const dt = new Date(y, (m || 1) - 1, d || 1, hh, mm, 0, 0);
  return dt.toISOString();
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export default async function handler(req, res) {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });

  try {
    const clinic_id = String(req.query.clinic_id || "").trim();
    const date = String(req.query.date || "").trim(); // YYYY-MM-DD

    if (!clinic_id || !date) {
      return res.status(400).json({ error: "Missing clinic_id or date" });
    }

    // 1) Get clinic hours
    const { data: clinic, error: clinicErr } = await supabaseAdmin
      .from("clinics")
      .select("id, open_minute, close_minute, slot_minutes")
      .eq("id", clinic_id)
      .single();

    if (clinicErr) return res.status(500).json({ error: clinicErr.message });

    const openMin = Number.isFinite(clinic?.open_minute) ? clinic.open_minute : 480;
    const closeMin = Number.isFinite(clinic?.close_minute) ? clinic.close_minute : 1020;
    const step = Number.isFinite(clinic?.slot_minutes) ? clinic.slot_minutes : 30;

    // 2) Load existing appointments for the day (exclude cancelled)
    const dayStartISO = buildLocalISO(date, 0);
    const dayEndISO = buildLocalISO(date, 1439);

    const { data: appts, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .select("starts_at, ends_at, status")
      .eq("clinic_id", clinic_id)
      .gte("starts_at", dayStartISO)
      .lte("starts_at", dayEndISO)
      .not("status", "eq", "cancelled");

    if (apptErr) return res.status(500).json({ error: apptErr.message });

    const busy = (appts || [])
      .map((a) => ({
        start: new Date(a.starts_at).getTime(),
        end: new Date(a.ends_at).getTime(),
      }))
      .filter((x) => Number.isFinite(x.start) && Number.isFinite(x.end));

    // 3) Generate slots
    const slots = [];
    for (let t = openMin; t + step <= closeMin; t += step) {
      const starts_at = buildLocalISO(date, t);
      const ends_at = buildLocalISO(date, t + step);

      const s = new Date(starts_at).getTime();
      const e = new Date(ends_at).getTime();
      if (!Number.isFinite(s) || !Number.isFinite(e)) continue;

      const isBusy = busy.some((b) => overlaps(s, e, b.start, b.end));
      if (!isBusy) slots.push({ starts_at, ends_at });
    }

    return res.status(200).json({ slots });
  } catch (err) {
    console.error("public/slots error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
