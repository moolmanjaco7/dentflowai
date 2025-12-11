// lib/sendBookingConfirmationEmail.js
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_API_TOKEN;

let resend = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn(
    "[DentFlowAI] RESEND_API_KEY (or RESEND_API_TOKEN) is not set. Booking confirmation emails will be skipped."
  );
}

/**
 * Send a booking confirmation email to the patient.
 * This is deliberately tolerant: if email fails, the booking still succeeds.
 */
export async function sendBookingConfirmationEmail({
  to,
  patientName,
  date,
  time,
  clinicName,
  clinicAddress,
  manageUrl,
}) {
  if (!resend) {
    // No API key configured – just no-op.
    return;
  }

  if (!to) {
    console.warn("[DentFlowAI] Missing 'to' email in sendBookingConfirmationEmail.");
    return;
  }

  const from =
    process.env.BOOKING_FROM_EMAIL ||
    "DentFlowAI Bookings <no-reply@dentflowai.app>";

  const subject = `Your appointment is booked${
    clinicName ? " – " + clinicName : ""
  }`;

  const safeName = patientName && patientName.trim().length > 0 ? patientName : "there";

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">Hi ${safeName},</h2>
      <p style="margin-top: 0; margin-bottom: 12px;">
        Your appointment has been <strong>booked successfully</strong>.
      </p>

      <div style="border-radius: 8px; border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 12px; background: #f8fafc;">
        <p style="margin: 0 0 4px 0;">
          <strong>Date:</strong> ${date}
        </p>
        <p style="margin: 0 0 4px 0;">
          <strong>Time:</strong> ${time} (clinic local time)
        </p>
        ${
          clinicName
            ? `<p style="margin: 0 0 4px 0;"><strong>Clinic:</strong> ${clinicName}</p>`
            : ""
        }
        ${
          clinicAddress
            ? `<p style="margin: 0;"><strong>Address:</strong> ${clinicAddress}</p>`
            : ""
        }
      </div>

      ${
        manageUrl
          ? `<p style="margin-top: 0; margin-bottom: 8px;">
              If you need to reschedule or cancel, you can manage your booking here:<br/>
              <a href="${manageUrl}" style="color: #2563eb;">Manage my appointment</a>
            </p>`
          : ""
      }

      <p style="margin-top: 12px; margin-bottom: 4px;">
        If you didn’t make this booking, please contact the clinic.
      </p>

      <p style="margin-top: 4px; color: #64748b; font-size: 12px;">
        Sent by DentFlowAI on behalf of the clinic.
      </p>
    </div>
  `;

  const text = `
Hi ${safeName},

Your appointment has been booked successfully.

Date: ${date}
Time: ${time}${clinicName ? `\nClinic: ${clinicName}` : ""}${
    clinicAddress ? `\nAddress: ${clinicAddress}` : ""
  }${
    manageUrl
      ? `\n\nManage your booking: ${manageUrl}`
      : ""
  }

If you didn’t make this booking, please contact the clinic.

Sent by DentFlowAI on behalf of the clinic.
  `.trim();

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    console.log("[DentFlowAI] Booking confirmation email sent:", result?.id);
  } catch (err) {
    console.error(
      "[DentFlowAI] Failed to send booking confirmation email:",
      err
    );
  }
}
