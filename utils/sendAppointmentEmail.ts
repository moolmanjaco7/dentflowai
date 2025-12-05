import { resend } from "@/lib/resend";

type BookingEmailPayload = {
  to: string;
  patientName: string;
  practitionerName: string;
  date: string;
  time: string;
  clinicName: string;
};

export async function sendBookingConfirmationEmail({
  to,
  patientName,
  practitionerName,
  date,
  time,
  clinicName,
}: BookingEmailPayload) {
  try {
    await resend.emails.send({
      from: "DentFlowAI <no-reply@dentflow.ai>",
      to,
      subject: `Your appointment is confirmed | ${clinicName}`,
      html: buildAppointmentHtml({
        patientName,
        practitionerName,
        date,
        time,
        clinicName,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("Email Send Error:", error);
    return { success: false, error };
  }
}

function buildAppointmentHtml({
  patientName,
  practitionerName,
  date,
  time,
  clinicName,
}: {
  patientName: string;
  practitionerName: string;
  date: string;
  time: string;
  clinicName: string;
}) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Appointment Confirmation</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 25px rgba(15,23,42,0.08);">
            
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#1d4ed8,#22c55e); padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="left">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="display:inline-block; width:32px; height:32px; border-radius:999px; background-color:rgba(255,255,255,0.12); text-align:center; line-height:32px; font-size:18px; color:#ffffff;">
                          🦷
                        </span>
                        <span style="color:#ffffff; font-size:18px; font-weight:600;">
                          DentFlowAI
                        </span>
                      </div>
                    </td>
                    <td align="right" style="color:#dbeafe; font-size:12px;">
                      Appointment Confirmation
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <p style="margin:0 0 12px 0; font-size:14px; color:#6b7280;">Hi ${patientName},</p>
                <p style="margin:0 0 16px 0; font-size:16px; color:#111827; font-weight:500;">
                  Your appointment has been <span style="color:#16a34a;">successfully booked</span>.
                </p>
                <p style="margin:0 0 16px 0; font-size:14px; color:#4b5563;">
                  Below are your appointment details. If anything looks incorrect, please contact the clinic as soon as possible.
                </p>
              </td>
            </tr>

            <!-- Appointment Card -->
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:12px; border:1px solid #e5e7eb; background-color:#f9fafb;">
                  <tr>
                    <td style="padding:16px 16px 8px 16px;">
                      <p style="margin:0; font-size:14px; font-weight:600; color:#111827;">
                        Appointment Summary
                      </p>
                      <p style="margin:4px 0 0 0; font-size:12px; color:#6b7280;">
                        ${clinicName}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 16px 16px 16px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td width="50%" style="padding:8px 0; font-size:13px; color:#4b5563;">
                            <strong style="display:block; font-size:12px; text-transform:uppercase; color:#9ca3af; letter-spacing:0.04em;">Date</strong>
                            ${date}
                          </td>
                          <td width="50%" style="padding:8px 0; font-size:13px; color:#4b5563;">
                            <strong style="display:block; font-size:12px; text-transform:uppercase; color:#9ca3af; letter-spacing:0.04em;">Time</strong>
                            ${time}
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" style="padding:8px 0; font-size:13px; color:#4b5563;">
                            <strong style="display:block; font-size:12px; text-transform:uppercase; color:#9ca3af; letter-spacing:0.04em;">Practitioner</strong>
                            ${practitionerName}
                          </td>
                          <td width="50%" style="padding:8px 0; font-size:13px; color:#4b5563;">
                            <strong style="display:block; font-size:12px; text-transform:uppercase; color:#9ca3af; letter-spacing:0.04em;">Patient</strong>
                            ${patientName}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Info / next steps -->
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <p style="margin:0 0 8px 0; font-size:14px; color:#111827; font-weight:500;">
                  What to bring
                </p>
                <ul style="margin:0 0 16px 18px; padding:0; font-size:13px; color:#4b5563;">
                  <li>Valid ID or medical aid card (if applicable).</li>
                  <li>Any recent dental records or x-rays (if you have them).</li>
                  <li>Arrive 5–10 minutes early to complete any forms.</li>
                </ul>

                <p style="margin:0 0 4px 0; font-size:13px; color:#6b7280;">
                  If you need to cancel or reschedule, please contact the clinic directly.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 24px 20px 24px; border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 4px 0; font-size:12px; color:#9ca3af;">
                  Sent securely via <span style="color:#2563eb; font-weight:500;">DentFlowAI</span>.
                </p>
                <p style="margin:0; font-size:11px; color:#9ca3af;">
                  This is an automated message. Please do not reply.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
