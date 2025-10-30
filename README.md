# DentFlow AI – Landing (Next.js + Tailwind) with Lead Capture

Minimal, production-ready landing with a working lead form via FormSubmit.

## Quickstart
1. Install Node 18+.
2. `npm install`
3. `npm run dev` (http://localhost:3000)

## Deploy to Vercel
- Push to GitHub, then import the repo in Vercel.
- Add your custom domain `dentflowai.co.za` in Vercel → Settings → Domains.

## DNS for Custom Domain
- Apex/root (`dentflowai.co.za`): A record → `76.76.21.21`
- `www` subdomain: CNAME → `cname.vercel-dns.com`

## Lead Capture (FormSubmit)
This project ships with a working lead form that POSTS to FormSubmit:
- Action: https://formsubmit.co/info@dentflowai.co.za
- First submission triggers a one-time verification email to confirm the address.
- After submit, users are redirected to `/thanks`.

If you prefer Formspree/Web3Forms or Supabase:
- Replace the `<form action>` URL and add your keys as needed.
