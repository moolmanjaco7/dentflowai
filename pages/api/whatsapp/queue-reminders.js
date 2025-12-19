// pages/api/whatsapp/queue-reminders.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

function fmtDateZA(d) {
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function fmtTimeZA(d) {
  return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

function firstName(fullName) {
  if (!fullName) return "there";
  const s = String(fullName).trim();
  if (!s) return "there";
  return s.split(" ")[0];
}

// Protected endpoint: add WHATSAPP_QUEUE_SECRET in Vercel
export default async function handler(req, res) {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });

  const key = String(req.query.key || "");
  const expected = process.env.WHATSAPP_QUEUE_SECRET;
  if (!expected) return res.status(500).json({ error: "WHATSAPP_QUEUE_SECRET not set" });
  if (key !== expected) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Queue window: appointments happening "tomorrow"
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Load appointments that need WhatsApp reminders
    const { data: appts, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .select("id, clinic_id, patient_id, starts_at, ends_at, status, reminder_status, confirmation_status")
      .gte("starts_at", tomorrowStart.toISOString())
      .lte("starts_at", tomorrowEnd.toISOString())
      .eq("reminder_status", "scheduled")
      .eq("confirmation_status", "unconfirmed")
      .not("status", "eq", "cancelled");

    if (apptErr) return res.status(500).json({ error: apptErr.message });

    if (!appts || appts.length === 0) {
      return res.status(200).json({ ok: true, queued: 0 });
    }

    // Load patients and clinics for templating
    const patientIds = [...new Set(appts.map((a) => a.patient_id))];
    const clinicIds = [...new Set(appts.map((a) => a.clinic_id))];

    const [{ data: patients, error: pErr }, { data: clinics, error: cErr }] = await Promise.all([
      supabaseAdmin
        .from("patients")
        .select("id, full_name, whatsapp_opt_in, whatsapp_number")
        .in("id", patientIds),
      supabaseAdmin
        .from("clinics")
        .select("id, name")
        .in("id", clinicIds),
    ]);

    if (pErr) return res.status(500).json({ error: pErr.message });
    if (cErr) return res.status(500).json({ error: cErr.message });

    const patientMap = new Map((patients || []).map((p) => [p.id, p]));
    const clinicMap = new Map((clinics || []).map((c) => [c.id, c]));

    let queued = 0;

    for (const a of appts) {
      const p = patientMap.get(a.patient_id);
      const c = clinicMap.get(a.clinic_id);

      if (!p || !p.whatsapp_opt_in || !p.whatsapp_number) {
        // Patient not opted in -> mark not scheduled
        await supabaseAdmin
          .from("appointments")
          .update({ reminder_status: "not_scheduled" })
          .eq("id", a.id);

        continue;
      }

      const dt = new Date(a.starts_at);
      const msg = `Hi ${firstName(p.full_name)}, this is DentFlowAI on behalf of ${c?.name || "the clinic"}.\n` +
        `Reminder: Your appointment is on ${fmtDateZA(dt)} at ${fmtTimeZA(dt)}.\n` +
        `Reply YES to confirm or NO to cancel.`;

      // Insert outbound message into queue table (sending will be implemented later)
      const { error: insErr } = await supabaseAdmin
        .from("whatsapp_messages")
        .insert([{
          clinic_id: a.clinic_id,
          patient_id: a.patient_id,
          appointment_id: a.id,
          direction: "outbound",
          channel: "whatsapp",
          provider: process.env.WHATSAPP_PROVIDER || "unknown",
          to_number: p.whatsapp_number,
          template_name: "appointment_reminder_24h",
          message_body: msg,
          status: "queued"
        }]);

      if (!insErr) {
        queued += 1;
        // Mark appointment reminder as sent-to-queue (not delivered yet)
        await supabaseAdmin
          .from("appointments")
          .update({ reminder_status: "sent" })
          .eq("id", a.id);
      } else {
        await supabaseAdmin
          .from("appointments")
          .update({ reminder_status: "failed" })
          .eq("id", a.id);
      }
    }

    return res.status(200).json({ ok: true, queued });
  } catch (err) {
    console.error("queue-reminders error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
