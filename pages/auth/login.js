// pages/auth/login.js (replace the form handler)
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setErr(error.message); return }
    window.location.href = '/dashboard'  // let dashboard run its client-side guard
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="bg-white border rounded-2xl p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold">Login</h1>
        <input className="mt-4 w-full border rounded-lg p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="mt-2 w-full border rounded-lg p-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <button disabled={loading} className="mt-4 w-full rounded-lg bg-blue-700 text-white py-2 hover:bg-blue-800">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
