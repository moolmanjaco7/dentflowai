// pages/api/whatsapp/stats.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfTodayISO() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

// Optional: protect stats endpoint (recommended)
// If you don't want protection, just comment out the key checks.
export default async function handler(req, res) {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });

  const expected = process.env.WHATSAPP_STATS_SECRET;
  if (expected) {
    const key = String(req.query.key || "");
    if (key !== expected) return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const todayStart = startOfTodayISO();
    const todayEnd = endOfTodayISO();

    // queued total (all time)
    const { count: queuedTotal, error: qErr } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued");

    if (qErr) return res.status(500).json({ error: qErr.message });

    // sent today
    const { count: sentToday, error: sErr } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd);

    if (sErr) return res.status(500).json({ error: sErr.message });

    // failed today
    const { count: failedToday, error: fErr } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd);

    if (fErr) return res.status(500).json({ error: fErr.message });

    return res.status(200).json({
      ok: true,
      queuedTotal: queuedTotal || 0,
      sentToday: sentToday || 0,
      failedToday: failedToday || 0,
    });
  } catch (err) {
    console.error("whatsapp/stats error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
