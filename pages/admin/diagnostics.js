// pages/admin/diagnostics.js
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function DiagnosticsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [useMyClinic, setUseMyClinic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState("");

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon);
  }, []);

  async function run() {
    setErr("");
    setOut(null);

    if (!adminKey.trim()) {
      setErr("Enter admin key.");
      return;
    }

    setLoading(true);

    let token = null;
    if (useMyClinic) {
      if (!supabase) {
        setErr("Supabase client missing.");
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token || null;
      if (!token) {
        setErr("You must be logged in to scope to your clinic.");
        setLoading(false);
        return;
      }
    }

    const res = await fetch(`/api/admin/diagnostics?key=${encodeURIComponent(adminKey.trim())}`, {
      headers: {
        "x-admin-key": adminKey.trim(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setErr(json?.error || "Unauthorized");
      setLoading(false);
      return;
    }

    setOut(json);
    setLoading(false);
  }

  // convenience: keep prior key in sessionStorage
  useEffect(() => {
    const k = sessionStorage.getItem("dfai_admin_key") || "";
    if (k) setAdminKey(k);
  }, []);

  useEffect(() => {
    if (adminKey) sessionStorage.setItem("dfai_admin_key", adminKey);
  }, [adminKey]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Diagnostics</h1>
          <p className="text-xs text-slate-400">
            Admin key required. Optional clinic scoping uses your login session.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr,auto] items-center">
            <input
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Paste admin key (e.g. dfai_admin_12345)"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              onClick={run}
              disabled={loading}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[12px] font-semibold text-emerald-200 hover:border-emerald-400 disabled:opacity-60"
            >
              {loading ? "Running…" : "Run diagnostics"}
            </button>
          </div>

          <label className="flex items-center gap-2 text-[12px] text-slate-300">
            <input
              type="checkbox"
              checked={useMyClinic}
              onChange={(e) => setUseMyClinic(e.target.checked)}
            />
            Scope to my clinic (recommended)
          </label>

          {err && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
              {err}
            </div>
          )}

          {out && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-[12px] text-slate-200">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <div>
                    <b>Scope:</b>{" "}
                    {out?.scope?.mode === "clinic" ? `Clinic (${out.scope.clinic_id})` : "All"}
                  </div>
                  <div>
                    <b>Clinics:</b> {out?.counts?.clinicsCount ?? "—"}
                  </div>
                  <div>
                    <b>Patients:</b> {out?.counts?.patientsCount ?? "—"}
                  </div>
                  <div>
                    <b>Appointments:</b> {out?.counts?.appointmentsCount ?? "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[12px] font-semibold text-slate-100">Latest appointments</p>
                <div className="mt-3 space-y-2">
                  {(out?.latestAppointments || []).map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
                    >
                      <p className="text-[13px] font-semibold text-slate-100">
                        {(a.patient?.full_name || "Patient")} •{" "}
                        {new Date(a.starts_at).toLocaleString("en-ZA")}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        status: {a.status || "—"} • clinic: {a.clinic_id}
                      </p>
                    </div>
                  ))}
                  {(out?.latestAppointments || []).length === 0 && (
                    <p className="text-[12px] text-slate-500">No appointments found.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[12px] font-semibold text-slate-100">Env health</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(out?.env || {}).map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px]"
                    >
                      <span className="text-slate-300">{k}</span>{" "}
                      <span className={v ? "text-emerald-300" : "text-rose-300"}>
                        {v ? "OK" : "Missing"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
