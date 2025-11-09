// components/SiteHeader.js
import Link from 'next/link'

export default function SiteHeader() {
  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* ✅ Clickable logo that always goes home */}
        <Link href="https://www.dentflowai.co.za" className="text-xl font-extrabold text-brand-800 hover:text-brand-700">
          DentFlow <span className="text-brand-600">AI</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-600">
          <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
          <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-900">Terms</Link>
          <Link href="/auth/login" className="px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700">
            Dashboard Login
          </Link>
        </nav>
      </div>
    </header>
  )
}
