// pages/api/appointments/update-status.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

const ALLOWED_STATUS = new Set(["booked", "confirmed", "cancelled", "completed", "no_show"]);
const ALLOWED_CONFIRM = new Set(["unconfirmed", "confirmed", "cancelled"]);

export default async function handler(req, res) {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Optional protection (recommended)
  // Add APPT_UPDATE_SECRET in Vercel to enforce.
  const expected = process.env.APPT_UPDATE_SECRET;
  if (expected) {
    const key = String(req.query.key || "");
    if (key !== expected) return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { appointment_id, status, confirmation_status } = req.body || {};

    if (!appointment_id) return res.status(400).json({ error: "Missing appointment_id" });

    const patch = {};
    if (status) {
      const s = String(status);
      if (!ALLOWED_STATUS.has(s)) return res.status(400).json({ error: "Invalid status" });
      patch.status = s;
    }
    if (confirmation_status) {
      const c = String(confirmation_status);
      if (!ALLOWED_CONFIRM.has(c)) return res.status(400).json({ error: "Invalid confirmation_status" });
      patch.confirmation_status = c;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .update(patch)
      .eq("id", appointment_id)
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true, appointment: data });
  } catch (err) {
    console.error("update-status error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
