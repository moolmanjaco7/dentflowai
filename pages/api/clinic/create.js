// pages/api/clinic/create.js
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing Supabase env vars");
  return createClient(url, service);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });
    const token = authHeader.replace("Bearer ", "").trim();

    const admin = getAdminClient();
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid token" });
    const user = userData.user;

    const { clinic_name, open_time, close_time, practitioners_count } = req.body || {};
    if (!clinic_name || !open_time || !close_time) {
      return res.status(400).json({ error: "Missing clinic_name/open_time/close_time" });
    }

    // Create clinic row (adjust columns if your clinics table differs)
    const insertClinic = {
      name: clinic_name,
      open_time,
      close_time,
      practitioners_count: Number(practitioners_count || 1),
      created_at: new Date().toISOString(),
    };

    const { data: clinic, error: cErr } = await admin
      .from("clinics")
      .insert(insertClinic)
      .select("*")
      .single();

    if (cErr) return res.status(400).json({ error: cErr.message });

    // Upsert profile → link user to clinic
    const { error: pErr } = await admin.from("profiles").upsert({
      id: user.id,
      clinic_id: clinic.id,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    if (pErr) return res.status(400).json({ error: pErr.message });

    return res.status(200).json({ ok: true, clinic });
  } catch (e) {
    console.error("clinic/create error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}
