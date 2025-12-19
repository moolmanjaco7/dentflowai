// pages/api/public/book.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

function clean(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });

  try {
    const {
      clinic_id,
      full_name,
      email,
      phone,
      starts_at,
      ends_at,
      notes,

      // WhatsApp fields (NEW)
      whatsapp_opt_in = true, // ✅ default ON
      whatsapp_number,
    } = req.body || {};

    if (!clinic_id || !full_name || !starts_at || !ends_at) {
      return res.status(400).json({ error: "Missing clinic_id, full_name, starts_at, or ends_at" });
    }

    const safeEmail = clean(email);
    const safePhone = clean(phone);
    const waOptIn = Boolean(whatsapp_opt_in);
    const waNumber = clean(whatsapp_number) || safePhone;
        const [whatsappOptIn, setWhatsappOptIn] = useState(true);
    <label className="flex items-start gap-2 text-xs text-slate-300">
  <input
    type="checkbox"
    checked={whatsappOptIn}
    onChange={(e) => setWhatsappOptIn(e.target.checked)}
  />
  <span>
    Send me WhatsApp reminders and allow me to confirm/cancel my appointment via WhatsApp.
  </span>
</label>


    // 1) Find or create patient
    // Prefer email match; fallback phone match
    let patient = null;

    if (safeEmail) {
      const { data } = await supabaseAdmin
        .from("patients")
        .select("*")
        .eq("email", safeEmail)
        .limit(1)
        .maybeSingle();
      patient = data || null;
    }

    if (!patient && safePhone) {
      const { data } = await supabaseAdmin
        .from("patients")
        .select("*")
        .eq("phone", safePhone)
        .limit(1)
        .maybeSingle();
      patient = data || null;
    }

    if (!patient) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("patients")
        .insert([
          {
            full_name: clean(full_name),
            email: safeEmail,
            phone: safePhone,

            // WhatsApp
            whatsapp_number: waNumber,
            whatsapp_opt_in: waOptIn,
            whatsapp_opt_in_at: waOptIn ? new Date().toISOString() : null,
          },
        ])
        .select("*")
        .single();

      if (createErr) return res.status(500).json({ error: createErr.message });
      patient = created;
    } else {
      // Update patient details (keep existing if missing)
      const updatePayload = {
        full_name: clean(full_name) || patient.full_name,
        email: safeEmail || patient.email,
        phone: safePhone || patient.phone,
      };

      // WhatsApp updates:
      // - If user opted in, ensure wa fields are set
      // - If opted out, store opt_in false (and keep number if we already have it)
      updatePayload.whatsapp_opt_in = waOptIn;
      updatePayload.whatsapp_number = waNumber || patient.whatsapp_number || safePhone;
      updatePayload.whatsapp_opt_in_at = waOptIn
        ? (patient.whatsapp_opt_in_at || new Date().toISOString())
        : null;

      const { error: updErr } = await supabaseAdmin
        .from("patients")
        .update(updatePayload)
        .eq("id", patient.id);

      if (updErr) return res.status(500).json({ error: updErr.message });
    }

    // 2) Create appointment
    const { data: appt, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .insert([
        {
          clinic_id,
          patient_id: patient.id,
          starts_at,
          ends_at,
          status: "booked",
          notes: clean(notes),

          // WhatsApp workflow fields (NEW)
          reminder_status: waOptIn ? "scheduled" : "not_scheduled",
          confirmation_status: "unconfirmed",
        },
      ])
      .select("*")
      .single();

    if (apptErr) return res.status(500).json({ error: apptErr.message });

    return res.status(200).json({ ok: true, appointment: appt, patient });
  } catch (err) {
    console.error("public/book error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
