// pages/api/public/book.js
import { createClient } from "@supabase/supabase-js";

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Basic honeypot for bots
function isBot(body) {
  return typeof body?.website === "string" && body.website.length > 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const { date, time, name, email, phone, website } = req.body || {};

  if (isBot(req.body)) return res.status(200).json({ ok: true }); // silently ignore bots
  if (!date || !time || !name || !email) return res.status(400).json({ ok: false, error: "Missing fields" });

  try {
    // 1) Find or create patient
    let patientId = null;
    const { data: existing } = await anon.from("patients").select("id").ilike("email", email).limit(1).maybeSingle();
    if (existing?.id) {
      patientId = existing.id;
    } else {
      const { data: pNew, error: pErr } = await anon
        .from("patients")
        .insert({ full_name: name, email, phone })
        .select("id")
        .single();
      if (pErr) throw pErr;
      patientId = pNew.id;
    }

    // 2) Compute starts/ends in UTC
    const starts = new Date(`${date}T${time}:00`);
    const ends = new Date(starts.getTime() + 30 * 60 * 1000); // 30-min default appointment

    // Check overlap (simple: same start time exists)
    const { data: clash } = await anon
      .from("appointments")
      .select("id")
      .eq("starts_at", starts.toISOString())
      .limit(1);
    if (clash && clash.length) {
      return res.status(409).json({ ok: false, error: "Time just got taken. Pick another slot." });
    }

    // 3) Create appointment
    const { error: aErr } = await anon.from("appointments").insert({
      title: "Online booking",
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status: "booked",
      patient_id: patientId,
    });
    if (aErr) throw aErr;

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
