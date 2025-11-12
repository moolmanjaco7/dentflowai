// components/SiteFooter.js
import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 text-xs sm:text-sm text-slate-500 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-slate-600">
          Powered by DentFlow AI
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="underline">Pricing</Link>
          <Link href="/privacy" className="underline">Privacy</Link>
          <Link href="/terms" className="underline">Terms</Link>
          <Link
            href="/demo"
            className="ml-2 inline-flex items-center px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700"
          >
            Book a Demo
          </Link>
          <div className="text-xs text-slate-500">
  Build: {(process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0,7) || "dev"}
</div>

        </div>
      </div>
    </footer>
  )
}
