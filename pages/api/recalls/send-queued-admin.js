// pages/api/recalls/send-queued-admin.js
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!url || !service || !resendKey) {
    return res.status(500).json({ ok: false, error: "Missing env vars" });
  }
  if (!bearer) return res.status(401).json({ ok: false, error: "Missing auth token" });

  // Admin client (service role) to validate the end-user JWT and access DB
  const admin = createClient(url, service, { auth: { persistSession: false } });

  // Verify the logged-in user from the JWT provided by the client
  const { data: userRes, error: userErr } = await admin.auth.getUser(bearer);
  if (userErr || !userRes?.user) {
    return res.status(401).json({ ok: false, error: "Invalid user" });
  }

  // (Optional) Gate by email domain or allow-list if you want:
  // if (!userRes.user.email?.endsWith("@yourclinic.co.za")) { ... }

  const resend = new Resend(resendKey);

  // Fetch queued email notifications
  const { data: queued, error: qErr } = await admin
    .from("recall_notifications")
    .select("id, payload, channel")
    .eq("channel", "email")
    .eq("status", "queued")
    .limit(100);

  if (qErr) return res.status(500).json({ ok: false, error: qErr.message });

  let sent = 0, failed = 0;

  for (const n of queued || []) {
    const to = n?.payload?.to;
    const subject = n?.payload?.subject || "Appointment reminder";
    const body = n?.payload?.body || "This is a reminder from your clinic.";

    if (!to) {
      await admin.from("recall_notifications").update({ status: "failed" }).eq("id", n.id);
      failed++;
      continue;
    }

    try {
      await resend.emails.send({
        from: "DentFlowAI <notifications@yourdomain.com>", // use your verified domain
        to,
        subject,
        text: body
      });

      await admin
        .from("recall_notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", n.id);

      sent++;
    } catch {
      await admin.from("recall_notifications").update({ status: "failed" }).eq("id", n.id);
      failed++;
    }
  }

  return res.json({ ok: true, sent, failed });
}
