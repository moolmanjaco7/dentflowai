// pages/api/recalls/sweep.js
import { createClient } from "@supabase/supabase-js";

const TZ = "Africa/Johannesburg";
const todaySA = () => new Date(new Date().toLocaleString("en-ZA", { timeZone: TZ }));

export default async function handler(req, res) {
  const token = process.env.CRON_SECRET;
  if (!token || req.query.token !== token) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return res.status(500).json({ ok: false, error: "Missing Supabase server env" });
  }

  const server = createClient(url, serviceKey, { auth: { persistSession: false } });

  const today = new Date(todaySA().toISOString().slice(0,10));
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
  const todayStr = today.toISOString().slice(0,10);
  const in7Str = in7.toISOString().slice(0,10);

  // Find pending/snoozed recalls due within 7 days (and not recently notified)
  const { data: recalls, error } = await server
    .from("recalls")
    .select("id, patient_id, rule_code, due_on, status, last_notified_at, patients:patient_id(full_name, email, phone, patient_code)")
    .or("status.eq.pending,status.eq.snoozed")
    .gte("due_on", todayStr)
    .lte("due_on", in7Str);

  if (error) return res.status(500).json({ ok: false, error: error.message });

  const now = new Date().toISOString();
  let queued = 0;

  for (const r of (recalls || [])) {
    // only once every 7 days
    if (r.last_notified_at) {
      const last = new Date(r.last_notified_at);
      if ((Date.now() - last.getTime()) < 7*24*3600*1000) continue;
    }
    const name = r.patients?.full_name || "Patient";
    const tag = r.patients?.patient_code || "";
    const toEmail = r.patients?.email || null;
    const toPhone = r.patients?.phone || null;

    // Prefer email if available, else sms if phone exists
    const channel = toEmail ? "email" : (toPhone ? "sms" : "email");
    const payload = channel === "email"
      ? { to: toEmail, subject: "Friendly check-up reminder", body: `Hi ${name}, it’s time to book your ${r.rule_code} around ${r.due_on}. Reply or book via your clinic.` , tag }
      : { to: toPhone, text: `Reminder: ${r.rule_code} due ~ ${r.due_on}. Reply to book.` , tag };

    await server.from("recall_notifications").insert({
      recall_id: r.id,
      channel,
      payload
    });

    await server.from("recalls").update({
      status: "notified",
      last_notified_at: now,
      updated_at: now
    }).eq("id", r.id);

    queued++;
  }

  return res.json({ ok: true, queued });
}
