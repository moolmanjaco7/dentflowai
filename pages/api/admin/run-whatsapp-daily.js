// pages/api/admin/run-whatsapp-daily.js
export default async function handler(req, res) {
  try {
    const expected = process.env.DIAGNOSTICS_SECRET || "";
    const key = String(req.headers["x-admin-key"] || req.query.key || "");
    if (!expected || key !== expected) return res.status(401).json({ error: "Unauthorized" });

    const dailyKey = process.env.WHATSAPP_DAILY_SECRET || "";
    if (!dailyKey) return res.status(400).json({ error: "Missing WHATSAPP_DAILY_SECRET" });

    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = (req.headers["x-forwarded-proto"] || "https").toString();
    const base = `${proto}://${host}`;

    const url = `${base}/api/whatsapp/daily-run?key=${encodeURIComponent(dailyKey)}`;
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));

    return res.status(r.ok ? 200 : r.status).json({
      ok: r.ok,
      status: r.status,
      result: j,
    });
  } catch (err) {
    console.error("admin/run-whatsapp-daily error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
