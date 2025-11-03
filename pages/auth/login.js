// pages/auth/login.js
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50 px-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 border">
        <h1 className="text-2xl font-bold text-blue-800 mb-1">DentFlow AI</h1>
        <p className="text-gray-500 mb-6 text-sm">Clinic Admin Login</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-gray-700">Email</label>
            <input type="email" required value={email}
                   onChange={e=>setEmail(e.target.value)}
                   className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200" />
          </div>

          <div>
            <label className="text-sm text-gray-700">Password</label>
            <input type="password" required value={password}
                   onChange={e=>setPassword(e.target.value)}
                   className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
                  className="w-full bg-blue-700 text-white py-2 rounded-lg hover:bg-blue-800">
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
