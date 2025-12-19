// pages/api/whatsapp/send-queued.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

// ---- Provider: Meta WhatsApp Cloud API (optional) ----
async function sendViaMeta({ to, body }) {
  const token = process.env.WHATSAPP_META_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_META_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      ok: false,
      error: "Meta provider selected but WHATSAPP_META_TOKEN or WHATSAPP_META_PHONE_NUMBER_ID missing",
    };
  }

  // WhatsApp Cloud API expects E.164 format without spaces, e.g. 27821234567
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    return {
      ok: false,
      error: json?.error?.message || `Meta send failed (${resp.status})`,
      raw: json,
    };
  }

  const msgId = json?.messages?.[0]?.id || null;

  return { ok: true, provider_message_id: msgId, raw: json };
}

// ---- Provider: Stub (safe MVP) ----
async function sendViaStub({ to, body }) {
  // No real send — used for testing pipeline
  console.log("[WhatsApp STUB] to:", to, "body:", body);
  return { ok: true, provider_message_id: `stub_${Date.now()}` };
}

function normalizeNumber(n) {
  if (!n) return "";
  // remove spaces, plus signs, hyphens
  return String(n).replace(/[^\d]/g, "");
}

// Protected endpoint: add WHATSAPP_SEND_SECRET in Vercel
export default async function handler(req, res) {
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });

  const key = String(req.query.key || "");
  const expected = process.env.WHATSAPP_SEND_SECRET;
  if (!expected) return res.status(500).json({ error: "WHATSAPP_SEND_SECRET not set" });
  if (key !== expected) return res.status(401).json({ error: "Unauthorized" });

  const provider = (process.env.WHATSAPP_PROVIDER || "stub").toLowerCase();
  const limit = Math.min(parseInt(String(req.query.limit || "25"), 10) || 25, 100);

  try {
    // Pull queued messages oldest-first
    const { data: msgs, error: qErr } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id, to_number, message_body, provider, status")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (qErr) return res.status(500).json({ error: qErr.message });

    if (!msgs || msgs.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, failed: 0, provider });
    }

    let sent = 0;
    let failed = 0;

    for (const m of msgs) {
      const to = normalizeNumber(m.to_number);
      const body = String(m.message_body || "").trim();

      if (!to || !body) {
        failed += 1;
        await supabaseAdmin
          .from("whatsapp_messages")
          .update({ status: "failed", error: "Missing to_number or message_body" })
          .eq("id", m.id);
        continue;
      }

      // Choose provider
      let result;
      try {
        if (provider === "meta") {
          result = await sendViaMeta({ to, body });
        } else {
          // default safe testing mode
          result = await sendViaStub({ to, body });
        }
      } catch (e) {
        result = { ok: false, error: String(e?.message || e) };
      }

      if (result.ok) {
        sent += 1;
        await supabaseAdmin
          .from("whatsapp_messages")
          .update({
            status: "sent",
            provider: provider,
            provider_message_id: result.provider_message_id || null,
            error: null,
          })
          .eq("id", m.id);
      } else {
        failed += 1;
        await supabaseAdmin
          .from("whatsapp_messages")
          .update({
            status: "failed",
            provider: provider,
            error: result.error || "Send failed",
          })
          .eq("id", m.id);
      }
    }

    return res.status(200).json({ ok: true, provider, processed: msgs.length, sent, failed });
  } catch (err) {
    console.error("send-queued error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
