// pages/api/email/test-booking.js
import { sendBookingConfirmationEmail } from "../../../lib/sendBookingConfirmationEmail";

export default async function handler(req, res) {
  // Basic protection
  const key = req.query.key;
  const expected = process.env.EMAIL_TEST_SECRET;

  if (!expected) {
    return res.status(500).json({ error: "EMAIL_TEST_SECRET not set in env" });
  }
  if (key !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await sendBookingConfirmationEmail({
      to: process.env.EMAIL_TEST_TO || "moolmanjaco7@gmail.com",
      patientName: "Test Patient",
      date: "2025-12-12",
      time: "10:00",
      clinicName: "DentFlowAI Test Clinic",
      clinicAddress: "Johannesburg",
      manageUrl: "https://www.dentflowai.co.za",
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Test email error:", e);
    return res.status(500).json({ error: "Failed to send test email" });
  }
}
