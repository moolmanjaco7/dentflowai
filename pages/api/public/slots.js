// pages/api/public/slots.js
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // server-only
  { auth: { persistSession: false } }
);

const OPEN_HOUR = 8;
const CLOSE_HOUR = 17;
const STEP_MIN = 15;

export default async function handler(req, res) {
  const { date, practitioner_id } = req.query;
  if (!date) return res.status(400).json({ slots: [] });

  // Build raw slots
  const slots = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += STEP_MIN) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }

  // Range for day
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  // Read busy times for the practitioner (or all if not specified)
  let q = admin
    .from("appointments")
    .select("starts_at")
    .gte("starts_at", start.toISOString())
    .lte("starts_at", end.toISOString());

  if (practitioner_id) q = q.eq("practitioner_id", practitioner_id);

  const { data: appts, error } = await q;
  if (error) return res.json({ slots }); // fail-open

  const taken = new Set(
    (appts || []).map(a => {
      const d = new Date(a.starts_at);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    })
  );

  const free = slots.filter(s => !taken.has(s));
  res.json({ slots: free });
}
