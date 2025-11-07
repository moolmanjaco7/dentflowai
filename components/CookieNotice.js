// components/CookieNotice.js
import { useEffect, useState } from 'react'

export default function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // show banner only if not previously accepted
    const ok = localStorage.getItem('cookie-ok')
    if (!ok) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-4 max-w-md">
      <p className="text-sm text-slate-700">
        We use basic cookies/analytics to improve DentFlow. By using the site, you agree to this.
        See our <a className="underline" href="/privacy">Privacy Policy</a>.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => { localStorage.setItem('cookie-ok','1'); setVisible(false) }}
          className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-sm hover:bg-blue-800"
        >
          OK
        </button>
        <a href="/privacy" className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50">Learn more</a>
      </div>
    </div>
  )
}
