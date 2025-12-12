// lib/sendBookingConfirmationEmail.js
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_API_TOKEN;

let resend = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn(
    "[DentFlowAI] RESEND_API_KEY (or RESEND_API_TOKEN) is not set. Emails will be skipped."
  );
}

export async function sendBookingConfirmationEmail({
  to,
  patientName,
  date,
  time,
  clinicName,
  clinicAddress,
  manageUrl,
}) {
  if (!resend) return { ok: false, skipped: true, reason: "missing_resend_key" };
  if (!to) return { ok: false, skipped: true, reason: "missing_to" };

  const from =
    process.env.BOOKING_FROM_EMAIL ||
    "DentFlowAI <onboarding@resend.dev>"; // safe default for testing

  const debugBcc = process.env.EMAIL_DEBUG_BCC || null;

  const subject = `Your appointment is booked${clinicName ? " – " + clinicName : ""}`;
  const safeName = patientName && patientName.trim().length ? patientName : "there";

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; color:#0f172a; line-height:1.5">
      <h2 style="margin:0 0 8px">Hi ${safeName},</h2>
      <p style="margin:0 0 12px">Your appointment has been <strong>booked successfully</strong>.</p>

      <div style="border-radius:10px;border:1px solid #e2e8f0;padding:12px;background:#f8fafc;margin-bottom:12px">
        <p style="margin:0 0 4px"><strong>Date:</strong> ${date}</p>
        <p style="margin:0 0 4px"><strong>Time:</strong> ${time} (clinic local time)</p>
        ${clinicName ? `<p style="margin:0 0 4px"><strong>Clinic:</strong> ${clinicName}</p>` : ""}
        ${clinicAddress ? `<p style="margin:0"><strong>Address:</strong> ${clinicAddress}</p>` : ""}
      </div>

      ${
        manageUrl
          ? `<p style="margin:0 0 8px">Manage your booking:<br/><a href="${manageUrl}" style="color:#2563eb">Open link</a></p>`
          : ""
      }

      <p style="margin:12px 0 4px">If you didn’t make this booking, please contact the clinic.</p>
      <p style="margin:4px 0 0;color:#64748b;font-size:12px">Sent by DentFlowAI on behalf of the clinic.</p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      ...(debugBcc ? { bcc: debugBcc } : {}),
    });

    console.log("[DentFlowAI] Resend result:", result);
    return { ok: true, id: result?.id || null };
  } catch (err) {
    console.error("[DentFlowAI] Resend send error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
}
