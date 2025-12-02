// pages/api/recalls/send-queued.js
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const ok = req.query.token && process.env.CRON_SECRET && req.query.token === process.env.CRON_SECRET;
  if (!ok) return res.status(401).json({ ok: false, error: "unauthorized" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!url || !service || !resendKey) {
    return res.status(500).json({ ok: false, error: "Missing env" });
  }

  const db = createClient(url, service, { auth: { persistSession: false } });
  const resend = new Resend(resendKey);

  // fetch queued EMAIL notifications
  const { data: queued, error } = await db
    .from("recall_notifications")
    .select("id, recall_id, payload, channel")
    .eq("channel", "email")
    .eq("status", "queued")
    .limit(100);
  if (error) return res.status(500).json({ ok: false, error: error.message });

  let sent = 0, failed = 0;

  for (const n of queued || []) {
    const to = n?.payload?.to;
    const subject = n?.payload?.subject || "Appointment reminder";
    const body = n?.payload?.body || "This is a reminder from your clinic.";
    if (!to) { // no email → mark failed
      await db.from("recall_notifications").update({ status: "failed" }).eq("id", n.id);
      failed++; continue;
    }

    try {
      await resend.emails.send({
        from: "DentFlowAI <notifications@yourdomain.com>", // set a verified domain in Resend
        to,
        subject,
        text: body,
      });

      await db.from("recall_notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", n.id);
      sent++;
    } catch (e) {
      await db.from("recall_notifications").update({ status: "failed" }).eq("id", n.id);
      failed++;
    }
  }

  return res.json({ ok: true, sent, failed });
}
