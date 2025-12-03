// pages/api/public/book.js
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // server-only!
  { auth: { persistSession: false } }
);

// Basic honeypot
function isBot(body) {
  return typeof body?.website === "string" && body.website.length > 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { date, time, name, email, phone, practitioner_id, service_id, website } = req.body || {};
  if (isBot(req.body)) return res.status(200).json({ ok: true });

  if (!date || !time || !name || !email) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }

  try {
    // 1) Find or create patient (SERVICE ROLE bypasses RLS)
    let patientId = null;
    const { data: existing } = await admin
      .from("patients")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      patientId = existing.id;
    } else {
      const { data: pNew, error: pErr } = await admin
        .from("patients")
        .insert({ full_name: name, email, phone })
        .select("id")
        .single();
      if (pErr) throw pErr;
      patientId = pNew.id;
    }

    // 2) Create appointment
    const starts = new Date(`${date}T${time}:00`);
    const ends = new Date(starts.getTime() + 30 * 60 * 1000);

    // Avoid exact-start clash for this practitioner (if provided)
    const q = admin.from("appointments").select("id").eq("starts_at", starts.toISOString()).limit(1);
    if (practitioner_id) q.eq("practitioner_id", practitioner_id);
    const { data: clash } = await q;
    if (clash && clash.length) {
      return res.status(409).json({ ok: false, error: "Time just got taken. Pick another slot." });
    }

    const { error: aErr } = await admin.from("appointments").insert({
      title: "Online booking",
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status: "booked",
      patient_id: patientId,
      practitioner_id: practitioner_id || null,
      service_id: service_id || null,
    });
    if (aErr) throw aErr;

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
