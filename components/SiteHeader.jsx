// components/SiteHeader.jsx
"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import NotificationBell from "@/components/NotificationBell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function NavLink({ href, label }) {
  const router = useRouter();
  const active = router.pathname === href || router.pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={[
        "text-sm px-3 py-2 rounded-md border bg-white hover:bg-slate-50",
        active ? "border-slate-900" : "border-slate-200"
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function SiteHeader() {
  const router = useRouter();
  const [session, setSession] = React.useState(null);
  const [clinic, setClinic] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);

      // fetch clinic name from profiles (if exists)
      try {
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from("profiles")
            .select("clinic_name, full_name")
            .eq("id", session.user.id)
            .maybeSingle();
          if (!error && data) {
            setClinic(data.clinic_name || data.full_name || "");
          }
        }
      } catch (_) {}
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
    });

    // close menu on route change
    const stop = router.events.on("routeChangeStart", () => setMenuOpen(false));

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
      // Next 14 returns a function, but our shorthand 'on' above is enough to close on change
      if (typeof stop === "function") stop();
    };
  }, [router.events]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b-2 border-slate-900/10 shadow-sm">
      <div className="mx-auto h-14 max-w-6xl px-4 flex items-center justify-between">
        {/* Left brand + clinic */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-block h-6 w-6 rounded bg-slate-900" />
            <span>DentFlow AI</span>
          </Link>
          {clinic && (
            <div className="hidden sm:block text-xs text-slate-600 pl-2 border-l">
              {clinic}
            </div>
          )}
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          <NavLink href="/dashboard" label="Dashboard" />
          <NavLink href="/patients" label="Patients" />
          <NotificationBell />
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

        {/* Mobile menu button */}
        <button
          className="md:hidden inline-flex items-center justify-center rounded-md border px-3 py-2"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2">
            <NavLink href="/dashboard" label="Dashboard" />
            <NavLink href="/patients" label="Patients" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              {session ? (
                <button
                  onClick={logout}
                  className="text-sm px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 w-full text-left"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className="text-sm px-3 py-2 rounded-md border bg-white hover:bg-slate-50 w-full text-left"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
