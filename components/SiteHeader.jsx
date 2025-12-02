import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo / Brand */}
        <Link href="/" className="text-lg font-semibold text-slate-900">
          DentFlowAI
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-5 text-sm text-slate-700">
          <Link href="/pricing" className="hover:text-slate-900 transition-colors">
            Pricing
          </Link>
          <Link href="/terms" className="hover:text-slate-900 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-900 transition-colors">
            Privacy
          </Link>
          <Link
            href="/auth/login"
            className="px-3 py-1.5 rounded-md border text-slate-700 hover:bg-slate-50 transition"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            Start Free Trial
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-slate-700"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-3">
          <Link
            href="/pricing"
            className="block text-slate-700 hover:text-slate-900"
            onClick={() => setMenuOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="/terms"
            className="block text-slate-700 hover:text-slate-900"
            onClick={() => setMenuOpen(false)}
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="block text-slate-700 hover:text-slate-900"
            onClick={() => setMenuOpen(false)}
          >
            Privacy
          </Link>
          <Link
            href="/auth/login"
            className="block px-3 py-1.5 rounded-md border text-slate-700 hover:bg-slate-50"
            onClick={() => setMenuOpen(false)}
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="block px-3 py-1.5 rounded-md bg-slate-900 text-white text-center hover:bg-slate-800"
            onClick={() => setMenuOpen(false)}
          >
            Start Free Trial
          </Link>
        </div>
      )}
    </header>
  );
}
