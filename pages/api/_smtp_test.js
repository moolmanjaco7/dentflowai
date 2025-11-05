// pages/api/_smtp_test.js
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  try {
    const required = ['SMTP_HOST','SMTP_USER','SMTP_PASS']
    for (const k of required) {
      if (!process.env[k]) return res.status(500).json({ ok:false, error:`Missing env ${k}` })
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || 'true') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
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
