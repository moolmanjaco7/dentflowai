// pages/api/appointments/update.js
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing Supabase env vars");
  return createClient(url, service);
}

export default async function handler(req, res) {
  try {
    const expected = process.env.APPT_UPDATE_SECRET || "";
    const key = String(req.query.key || "");
    if (!expected || key !== expected) return res.status(401).json({ error: "Unauthorized" });

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { appointment_id, starts_at, ends_at, notes } = req.body || {};
    if (!appointment_id) return res.status(400).json({ error: "Missing appointment_id" });

    const patch = {};
    if (starts_at) patch.starts_at = starts_at;
    if (ends_at) patch.ends_at = ends_at;
    if (typeof notes === "string") patch.notes = notes;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("appointments")
      .update(patch)
      .eq("id", appointment_id)
      .select("*")
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ ok: true, appointment: data });
  } catch (err) {
    console.error("appointments/update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
