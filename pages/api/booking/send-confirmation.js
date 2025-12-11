// pages/api/booking/send-confirmation.js

import { sendBookingConfirmationEmail } from "../../../lib/sendBookingConfirmationEmail";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, name, date, time, clinicName, clinicAddress, manageUrl } =
      req.body || {};

    if (!email || !name || !date || !time) {
      return res
        .status(400)
        .json({ error: "Missing email, name, date or time" });
    }

    await sendBookingConfirmationEmail({
      to: email,
      patientName: name,
      date,
      time,
      clinicName,
      clinicAddress,
      manageUrl,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(
      "[DentFlowAI] /api/booking/send-confirmation error:",
      err
    );
    // We still return 200-ish style so the receptionist flow doesn't break on email issues:
    return res
      .status(500)
      .json({ error: "Failed to send booking confirmation email" });
  }
}
