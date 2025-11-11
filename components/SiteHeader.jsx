// components/SiteHeader.jsx
"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SiteHeader() {
  const router = useRouter();
  const [session, setSession] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b-2 border-slate-900/10 shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block h-6 w-6 rounded bg-slate-900" />
          <span>DentFlow AI</span>
        </Link>

        <nav className="flex items-center gap-2">
          {/* Always show these so it's obvious */}
          <Link
            href="/dashboard"
            className="text-sm px-3 py-2 rounded-md border bg-white hover:bg-slate-50"
          >
            Dashboard
          </Link>
          <Link
            href="/patients"
            className="text-sm px-3 py-2 rounded-md border bg-white hover:bg-slate-50"
          >
            Patients
          </Link>

          {session ? (
            <button
              onClick={logout}
              className="text-sm px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm px-3 py-2 rounded-md border bg-white hover:bg-slate-50"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
