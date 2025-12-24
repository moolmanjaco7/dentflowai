// pages/api/whatsapp/daily-run.js
export default async function handler(req, res) {
  const expected = process.env.WHATSAPP_DAILY_SECRET;
  const key = String(req.query.key || "");
  if (!expected || key !== expected) return res.status(401).json({ error: "Unauthorized" });

  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dentflowai.co.za";

    // 1) Queue reminders (tomorrow)
    const queueUrl = `${base}/api/whatsapp/queue-reminders?key=${encodeURIComponent(
      process.env.WHATSAPP_QUEUE_SECRET || ""
    )}`;

    const qRes = await fetch(queueUrl);
    const qJson = await qRes.json().catch(() => ({}));

    // 2) Send queued messages (process in batches)
    const sendKey = process.env.WHATSAPP_SEND_SECRET || "";
    let totalSent = 0;
    let loops = 0;

    while (loops < 20) {
      loops += 1;

      const sendUrl = `${base}/api/whatsapp/send-queued?key=${encodeURIComponent(sendKey)}&limit=50`;
      const sRes = await fetch(sendUrl);
      const sJson = await sRes.json().catch(() => ({}));

      // support common response shapes
      const sentNow =
        Number(sJson?.sent || 0) ||
        Number(sJson?.processed || 0) ||
        Number(sJson?.count || 0) ||
        0;

      totalSent += sentNow;

      // if nothing sent, break
      if (!sentNow) break;
    }

    return res.status(200).json({
      ok: true,
      queued: qJson,
      totalSent,
      loops,
    });
  } catch (err) {
    console.error("daily-run error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
