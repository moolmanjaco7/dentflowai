// pages/onboarding.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [clinicName, setClinicName] = useState("");
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [practCount, setPractCount] = useState(1);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon);
  }, []);

  useEffect(() => {
    (async () => {
      setErr("");
      if (!supabase) {
        setErr("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.");
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      // If already has clinic, skip onboarding
      const r = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = await r.json().catch(() => ({}));

      if (r.ok && j?.profile?.clinic_id) {
        router.replace("/dashboard");
        return;
      }

      setLoading(false);
    })();
  }, [router, supabase]);

  async function submit() {
    setErr("");
    setMsg("");

    if (!clinicName.trim()) {
      setErr("Please enter a clinic name.");
      return;
    }
    if (!openTime || !closeTime) {
      setErr("Please choose open and close times.");
      return;
    }

    setSaving(true);

    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session) {
      setErr("Session expired. Please log in again.");
      setSaving(false);
      router.replace("/auth/login");
      return;
    }

    const r = await fetch("/api/clinic/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        clinic_name: clinicName.trim(),
        open_time: openTime,
        close_time: closeTime,
        practitioners_count: practCount,
      }),
    });

    const j = await r.json().catch(() => ({}));
    setSaving(false);

    if (!r.ok) {
      setErr(j?.error || "Could not create clinic.");
      return;
    }

    setMsg("✅ Clinic created. Redirecting…");
    setTimeout(() => router.replace("/dashboard"), 600);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
        <h1 className="text-2xl font-semibold">Clinic setup</h1>
        <p className="mt-1 text-sm text-slate-400">
          Before you can use the dashboard, we need your clinic details.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-400">Loading…</p>
        ) : (
          <>
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

            <div className="mt-5 space-y-3">
              <div>
                <label className="text-[12px] text-slate-300">Clinic name</label>
                <input
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[13px] text-slate-100 outline-none"
                  placeholder="e.g. Smile Dental Studio"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-slate-300">Open time</label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[13px] text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-slate-300">Close time</label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[13px] text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] text-slate-300">Practitioners</label>
                <input
                  type="number"
                  min={1}
                  value={practCount}
                  onChange={(e) => setPractCount(Number(e.target.value || 1))}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[13px] text-slate-100 outline-none"
                />
              </div>

              <button
                onClick={submit}
                disabled={saving}
                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] font-semibold text-emerald-200 hover:border-emerald-400 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Create clinic"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
