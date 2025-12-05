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
      subject: `Your Appointment is Confirmed | ${clinicName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.5;">
          <h2>Your Appointment is Confirmed</h2>
          <p>Hi ${patientName},</p>
          <p>Your appointment has been successfully booked.</p>

          <h3>Appointment Details</h3>
          <p><strong>Practitioner:</strong> ${practitionerName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>

          <br/>
          <p>We look forward to seeing you.</p>
          <p><strong>${clinicName}</strong></p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Email Send Error:", error);
    return { success: false, error };
  }
}
