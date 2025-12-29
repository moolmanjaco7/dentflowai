// pages/_app.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import "../styles/globals.css";

function AppHeader({ session, onLogout }) {
  const loggedIn = !!session;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-slate-50 font-semibold">DentFlowAI</span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">Clinic booking + reception dashboard</span>
        </Link>

        <nav className="flex items-center gap-2 text-[12px]">
          {/* Public */}
          <Link
            href="/book"
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 hover:border-slate-600"
          >
            Book Online
          </Link>

          <Link
            href="/pricing"
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 hover:border-slate-600 hidden sm:inline"
          >
            Pricing
          </Link>

          {!loggedIn ? (
            <>
              <Link
                href="/auth/login"
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 hover:border-slate-600"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200 hover:border-emerald-400"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 hover:border-slate-600"
              >
                Dashboard
              </Link>
              <Link
                href="/reception"
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 hover:border-slate-600"
              >
                Reception
              </Link>
              <Link
                href="/patients"
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 hover:border-slate-600"
              >
                Patients
              </Link>
              <button
                onClick={onLogout}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 hover:border-slate-600"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon);
  }, []);

  // Keep session updated (so header updates instantly)
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data?.session || null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => {
      sub?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  async function logout() {
    try {
      if (supabase) await supabase.auth.signOut();
      router.push("/");
    } catch {
      router.push("/");
    }
  }

  // Gate protected pages until onboarding completed
  useEffect(() => {
    const protectedPrefixes = ["/dashboard", "/patients", "/reception"];
    const isProtected = protectedPrefixes.some((p) => router.pathname.startsWith(p));

    (async () => {
      // Allow auth + onboarding freely
      if (router.pathname.startsWith("/auth") || router.pathname === "/onboarding") {
        setChecking(false);
        return;
      }

      if (!supabase) {
        setChecking(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const sess = data?.session;

      if (!sess) {
        if (isProtected) router.replace("/auth/login");
        setChecking(false);
        return;
      }

      if (isProtected) {
        const r = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${sess.access_token}` },
        });
        const j = await r.json().catch(() => ({}));

        if (!r.ok) {
          router.replace("/auth/login");
          setChecking(false);
          return;
        }

        if (!j?.profile?.clinic_id) {
          router.replace("/onboarding");
          setChecking(false);
          return;
        }
      }

      setChecking(false);
    })();
  }, [router.pathname, supabase]);

  if (checking) {
    // Show header even while checking (prevents "blank app" feel)
    return (
      <div className="min-h-screen bg-slate-950">
        <AppHeader session={session} onLogout={logout} />
        <div className="mx-auto max-w-6xl p-6 text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  // If you prefer hiding header on /book, add router.pathname === "/book" condition
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <AppHeader session={session} onLogout={logout} />
      <Component {...pageProps} />
    </div>
  );
}
