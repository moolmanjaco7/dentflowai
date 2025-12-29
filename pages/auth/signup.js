// pages/auth/signup.js
import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!email || !password) {
      setErr("Please enter email and password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg("✅ Signup successful. Please check your email to confirm your account.");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-slate-400">Sign up to access your clinic dashboard.</p>

        {err && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
            {err}
          </div>
        )}
        {msg && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">
            {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-[12px] text-slate-300">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[13px] text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="you@clinic.co.za"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-[12px] text-slate-300">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[13px] text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] font-semibold text-emerald-200 hover:border-emerald-400 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-[12px] text-slate-400">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-slate-200 underline">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
