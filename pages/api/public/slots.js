// pages/api/public/slots.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// CONFIG: business hours + duration (minutes)
const OPEN_HOUR = 8;  // 08:00
const CLOSE_HOUR = 17; // 17:00
const STEP_MIN = 15;   // 15-min slots
const TZ = "Africa/Johannesburg";

export default async function handler(req, res) {
  const { date } = req.query;
  if (!date) return res.status(400).json({ slots: [] });

  // Compute all slots for day
  const slots = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += STEP_MIN) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }

  // Convert selected day to UTC range
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  // Fetch existing appointments for the day
  const { data: appts, error } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .gte("starts_at", start.toISOString())
    .lte("starts_at", end.toISOString());

  if (error) return res.status(200).json({ slots }); // on error, show all (fail-open)

  // Build a set of taken start times (rounded to STEP_MIN)
  const taken = new Set(
    (appts || []).map(a => {
      const d = new Date(a.starts_at);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    })
  );

  // Filter out taken
  const free = slots.filter(s => !taken.has(s));
  res.json({ slots: free });
}
