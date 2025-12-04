// components/SiteHeader.jsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setSession(session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  const toggleMenu = () => setMenuOpen(v => !v);

  const LoggedOutNav = () => (
    <>
    <Link href="/book" className="hover:underline">
  Book Online
</Link>

      <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
      <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
      <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
      <Link href="/auth/login" className="px-3 py-1.5 rounded-md border text-slate-700 hover:bg-slate-50 transition">Log in</Link>
      <Link href="/auth/signup" className="px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition">Start Free Trial</Link>
    </>
    
  );

  const LoggedInNav = () => (
    <>
      <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Dashboard</Link>
      <Link href="/reception" className="hover:text-slate-900 transition-colors">Reception</Link>
      <Link href="/patients" className="hover:text-slate-900 transition-colors">Patients</Link>
      <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
      <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
      <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
      <Link href="/settings" className="hover:underline">Settings</Link>
      
      <button
        onClick={() => supabase.auth.signOut()}
        className="px-3 py-1.5 rounded-md border text-slate-700 hover:bg-slate-50 transition"
      >
        Log out
      </button>
    </>
  );

  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-slate-900">DentFlowAI</Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-700">
          {session ? <LoggedInNav/> : <LoggedOutNav/>}
        </nav>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 rounded-md hover:bg-slate-100" onClick={toggleMenu} aria-label="Toggle menu">
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white shadow-sm">
          <nav className="flex flex-col px-4 py-3 space-y-2 text-sm text-slate-700">
            {(session ? <LoggedInNav/> : <LoggedOutNav/>)}
          </nav>
        </div>
      )}
    </header>
  );
}
