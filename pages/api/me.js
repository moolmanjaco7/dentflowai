// pages/api/me.js
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing Supabase env vars");
  return createClient(url, service);
}

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

    const token = authHeader.replace("Bearer ", "").trim();
    const admin = getAdminClient();

    // Validate token → user
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid token" });

    const user = userData.user;

    // Load profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, clinic_id, role, created_at")
      .eq("id", user.id)
      .maybeSingle();

    return res.status(200).json({
      ok: true,
      user: { id: user.id, email: user.email },
      profile: profile || null,
    });
  } catch (e) {
    console.error("api/me error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}
