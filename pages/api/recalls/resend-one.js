// pages/api/recalls/resend-one.js
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const { id } = req.body || {};

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!url || !service || !resendKey) return res.status(500).json({ ok: false, error: "Missing env vars" });
  if (!token) return res.status(401).json({ ok: false, error: "Missing auth token" });
  if (!id) return res.status(400).json({ ok: false, error: "Missing notification id" });

  const admin = createClient(url, service, { auth: { persistSession: false } });

  // Verify user
  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes?.user) return res.status(401).json({ ok: false, error: "Invalid user" });

  // Fetch the notification
  const { data: n, error: qErr } = await admin
    .from("recall_notifications")
    .select("id, channel, status, payload")
    .eq("id", id)
    .maybeSingle();
  if (qErr) return res.status(500).json({ ok: false, error: qErr.message });
  if (!n) return res.status(404).json({ ok: false, error: "Notification not found" });
  if (n.channel !== "email") return res.status(400).json({ ok: false, error: "Only email channel supported" });

  const to = n?.payload?.to;
  const subject = n?.payload?.subject || "Appointment reminder";
  const body = n?.payload?.body || "This is a reminder from your clinic.";
  if (!to) return res.status(400).json({ ok: false, error: "No destination email" });

  const resend = new Resend(resendKey);

  try {
    await resend.emails.send({
      from: "DentFlowAI <notifications@yourdomain.com>", // replace with your verified sender
      to,
      subject,
      text: body,
    });

    const { error: upErr } = await admin
      .from("recall_notifications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);
    if (upErr) throw upErr;

    return res.json({ ok: true, sent: 1, failed: 0 });
  } catch (e) {
    await admin.from("recall_notifications").update({ status: "failed" }).eq("id", id);
    return res.status(500).json({ ok: false, error: e.message || "Send failed" });
  }
}
