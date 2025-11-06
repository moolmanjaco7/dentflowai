// pages/api/_smtp_test.js
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  try {
    const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true', // true=465 SSL, false=STARTTLS/plain
  requireTLS: String(process.env.SMTP_REQUIRE_TLS || 'false') === 'true',
  ignoreTLS: String(process.env.SMTP_IGNORE_TLS || 'false') === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { minVersion: 'TLSv1.2' },       // safe default
  connectionTimeout: 15000,             // fail fast
})

    await transporter.verify()

    // send to yourself to confirm
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_TO || process.env.SMTP_USER,
      subject: 'DentFlow SMTP test',
      text: 'SMTP is working 🎉',
    })

    return res.json({ ok:true, message:'SMTP verified & test sent' })
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || 'Unknown error' })
  }
}
