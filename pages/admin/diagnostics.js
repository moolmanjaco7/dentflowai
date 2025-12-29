// pages/admin/diagnostics.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function fmt(dt) {
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-ZA");
  } catch {
    return "";
  }
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

async function fetchAdmin(url, adminKey, options) {
  const res = await fetch(url, {
    cache: "no-store",
    ...(options || {}),
    headers: {
      ...(options?.headers || {}),
      "x-admin-key": adminKey || "",
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export default function AdminDiagnosticsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const counts = data?.counts || {};
  const env = data?.env || {};
  const appts = Array.isArray(data?.latestAppointments) ? data.latestAppointments : [];

  const missingEnv = useMemo(() => {
    if (!data?.env) return [];
    return Object.entries(env).filter(([, ok]) => !ok).map(([k]) => k);
  }, [env, data]);

  async function load() {
    setLoading(true);
    setErr("");
    const { ok, json } = await fetchAdmin("/api/admin/diagnostics", adminKey);
    if (!ok) {
      setErr(json?.error || "Could not load diagnostics.");
      setData(null);
      setLoading(false);
      setLoaded(true);
      return;
    }
    setData(json);
    setLoading(false);
    setLoaded(true);
  }

  async function runWhatsappDaily() {
    setLoading(true);
    setErr("");
    const { ok, json } = await fetchAdmin("/api/admin/run-whatsapp-daily", adminKey, { method: "POST" });
    if (!ok) {
      setErr(json?.error || json?.result?.error || "Failed to run WhatsApp daily.");
      setLoading(false);
      return;
    }
    alert(`WhatsApp daily run OK. Sent: ${json?.result?.totalSent ?? "?"}`);
    setLoading(false);
  }

  useEffect(() => {
    // do nothing automatically; user must paste key
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin Diagnostics</h1>
            <p className="text-xs text-slate-400">Quick health checks + safe “run now” tools.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
            >
              Dashboard
            </Link>
            <Link
              href="/reception"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-600"
            >
              Reception
            </Link>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-[12px] font-semibold text-slate-100">Admin Key</p>
          <p className="mt-1 text-[12px] text-slate-400">
            Paste <span className="text-slate-200">DIAGNOSTICS_SECRET</span> here to load diagnostics.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="dfai_admin_..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              onClick={load}
              disabled={!adminKey || loading}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-[12px] text-slate-200 hover:border-slate-600 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load"}
            </button>
          </div>

          {err && (
            <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
              {err}
            </div>
          )}
        </div>

        {loaded && data && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[12px] text-slate-400">Clinics</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.clinicsCount ?? "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[12px] text-slate-400">Patients</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.patientsCount ?? "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[12px] text-slate-400">Appointments</p>
                <p className="mt-1 text-2xl font-semibold">{counts?.appointmentsCount ?? "—"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-slate-100">Environment</p>
                  <p className="text-[12px] text-slate-400">Server time: {fmt(data.serverTime)}</p>
                </div>
                <button
                  onClick={runWhatsappDaily}
                  disabled={loading}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-[12px] text-slate-200 hover:border-slate-600 disabled:opacity-50"
                >
                  Run WhatsApp daily now
                </button>
              </div>

              {missingEnv.length > 0 ? (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                  Missing env vars: <span className="text-amber-100">{missingEnv.join(", ")}</span>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">
                  All required env vars detected ✅
                </div>
              )}

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {Object.entries(env).map(([k, ok]) => (
                  <div key={k} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                    <span className="text-[12px] text-slate-200">{k}</span>
                    <span className={`text-[12px] ${ok ? "text-emerald-200" : "text-rose-200"}`}>
                      {ok ? "OK" : "MISSING"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-[12px] font-semibold text-slate-100">Latest appointments</p>
                <p className="text-[12px] text-slate-400">Most recent 25 by start time.</p>
              </div>

              <div className="p-4 space-y-2">
                {appts.length === 0 ? (
                  <p className="text-[12px] text-slate-400">No appointments found.</p>
                ) : (
                  appts.map((a) => {
                    const name = a?.patient?.full_name || "Patient";
                    const init = initials(name);
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 shrink-0 rounded-xl border border-slate-700 bg-slate-950/40 flex items-center justify-center text-[12px]">
                            {init}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-100 truncate">{name}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {fmt(a.starts_at)} → {fmt(a.ends_at)} • status: {a.status || "—"} • conf:{" "}
                              {a.confirmation_status || "—"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-500 shrink-0">
                          <div>clinic: {String(a.clinic_id || "—").slice(0, 8)}…</div>
                          <div>appt: {String(a.id || "—").slice(0, 8)}…</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {!loaded && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-[12px] text-slate-400">
            Paste your admin key above and click <span className="text-slate-200">Load</span>.
          </div>
        )}
      </div>
    </main>
  );
}
