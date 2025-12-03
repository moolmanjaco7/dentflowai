// pages/api/public/slots.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-only
);

// Helpers
const TZ_OFFSET = "+02:00"; // Africa/Johannesburg, no DST
function toISO(dateYmd, timeHm) { return `${dateYmd}T${timeHm}:00${TZ_OFFSET}`; }

// minutes <-> "HH:mm"
function mmToHm(mm){ const h = Math.floor(mm/60), m = mm%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }
function hmToMm(hm){ const [h,m] = hm.split(":").map(Number); return h*60+m; }

export default async function handler(req, res) {
  try {
    const { date, practitioner_id } = req.query || {};
    if (!date) return res.status(400).json({ ok:false, error:"Missing date" });

    // 1) Check clinic closed
    const { data: closed } = await supabase
      .from("clinic_closed_dates").select("date").eq("date", date).maybeSingle();
    if (closed) return res.status(200).json({ ok:true, slots: [] });

    // 2) Load slot config
    const { data: config } = await supabase
      .from("slot_config").select("slot_minutes, buffer_minutes").eq("id",1).maybeSingle();
    const slotMinutes = config?.slot_minutes || 15;
    const bufferMinutes = config?.buffer_minutes || 0;

    // 3) Practitioner hours (or default business hours if none)
    let dow = new Date(`${date}T00:00:00${TZ_OFFSET}`).getDay(); // 0=Sun..6=Sat
    dow = (dow + 6) % 7; // make Monday=0 … Sunday=6

    let hours = null;
    if (practitioner_id) {
      const { data: ph } = await supabase
        .from("practitioner_hours")
        .select("start_minute,end_minute")
        .eq("practitioner_id", practitioner_id)
        .eq("dow", dow)
        .maybeSingle();
      hours = ph || null;
    }
    // default hours if missing: 09:00–17:00 Mon–Fri only
    if (!hours) {
      if (dow >= 0 && dow <= 4) {
        hours = { start_minute: 9*60, end_minute: 17*60 };
      } else {
        return res.status(200).json({ ok:true, slots: [] });
      }
    }

    // 4) Generate candidate slots for the day
    const candidates = [];
    for (let t = hours.start_minute; t + slotMinutes <= hours.end_minute; t += slotMinutes) {
      candidates.push(mmToHm(t));
    }

    // 5) Load existing appointments for overlap filtering
    const dayStartISO = toISO(date, "00:00");
    const dayEndISO   = toISO(date, "23:59");

    let q = supabase
      .from("appointments")
      .select("starts_at, ends_at, practitioner_id")
      .gte("starts_at", new Date(dayStartISO).toISOString())
      .lte("starts_at", new Date(dayEndISO).toISOString());
    if (practitioner_id) q = q.eq("practitioner_id", practitioner_id);
    const { data: appts } = await q;

    // 6) Build a fast overlap checker
    const blocks = (appts || []).map(a => ({
      s: new Date(a.starts_at).getUTCHours()*60 + new Date(a.starts_at).getUTCMinutes(),
      e: new Date(a.ends_at).getUTCHours()*60 + new Date(a.ends_at).getUTCMinutes(),
    }));

    // Convert local HH:mm to UTC minutes-of-day for compare (add TZ offset 120 min)
    const OFFSET_MIN = 120;

    const free = candidates.filter(hm => {
      const startLocal = hmToMm(hm);
      const endLocal   = startLocal + slotMinutes + bufferMinutes;

      const startUTC = startLocal - OFFSET_MIN;
      const endUTC   = endLocal   - OFFSET_MIN;

      // overlap if NOT (end<=s || start>=e)
      for (const b of blocks) {
        if (!(endUTC <= b.s || startUTC >= b.e)) return false;
      }
      return true;
    });

    return res.status(200).json({ ok:true, slots: free });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:e.message || "Server error" });
  }
}
