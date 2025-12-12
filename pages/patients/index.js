// pages/patients.js
import { useEffect, useMemo, useState } from "react";

function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | created
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  const [selectedPatient, setSelectedPatient] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState("");

  async function loadPatients() {
    setLoading(true);
    setToast("");

    try {
      // Assumption: you already have an API route that returns patients.
      // If you don’t, tell me and I’ll wire it to Supabase like we did for appointments.
      const res = await fetch("/api/patients/list");
      if (!res.ok) {
        console.warn("Patients list API returned", res.status);
        setPatients([]);
        setLoading(false);
        return;
      }
      const json = await res.json();
      const rows = json?.patients || json?.data || [];
      setPatients(rows);
    } catch (err) {
      console.error("Failed to load patients:", err);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let rows = [...patients];

    if (q) {
      rows = rows.filter((p) => {
        const name = (p.full_name || "").toLowerCase();
        const email = (p.email || "").toLowerCase();
        const phone = (p.phone || "").toLowerCase();
        const code = (p.patient_code || "").toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          code.includes(q)
        );
      });
    }

    rows.sort((a, b) => {
      let av, bv;
      if (sortBy === "created") {
        av = a.created_at || "";
        bv = b.created_at || "";
      } else {
        av = (a.full_name || "").toLowerCase();
        bv = (b.full_name || "").toLowerCase();
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [patients, query, sortBy, sortDir]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setToast("");

    try {
      const res = await fetch("/api/patients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: deleteTarget.id }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setToast(json?.error || "Could not delete patient.");
        setDeleteLoading(false);
        return;
      }

      setToast("Patient deleted.");
      setDeleteTarget(null);
      setSelectedPatient(null);
      await loadPatients();
    } catch (err) {
      console.error("Delete patient failed:", err);
      setToast("Unexpected error while deleting patient.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Patients</h1>
            <p className="text-xs text-slate-400">
              Search, view and manage patient records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
              <span className="text-[11px] text-slate-400">Search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, email, phone, code…"
                className="w-[240px] bg-transparent text-[12px] text-slate-100 placeholder:text-slate-600 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px]">
              <span className="text-[11px] text-slate-400">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent outline-none text-slate-100"
              >
                <option value="name">Name</option>
                <option value="created">Created</option>
              </select>

              <button
                type="button"
                onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                title="Toggle sort direction"
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </header>

        {toast && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-[12px] text-slate-200">
            {toast}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
          {/* LIST */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-[12px] text-slate-300">
                {loading ? "Loading…" : `${filtered.length} patient(s)`}
              </p>
              <button
                type="button"
                onClick={loadPatients}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-200 hover:border-slate-500"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Loading patients…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                No patients found.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filtered.map((p) => {
                  const isSelected = selectedPatient?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-slate-900/60 ${
                        isSelected ? "bg-slate-900/60" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(p)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-[12px] font-semibold text-slate-100">
                          {initials(p.full_name)}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-slate-50">
                            {p.full_name || "Unnamed patient"}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
                            <span className="truncate">{p.email || "—"}</span>
                            <span className="truncate">{p.phone || "—"}</span>
                            {p.patient_code ? (
                              <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300">
                                {p.patient_code}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="ml-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-200 hover:border-rose-400"
                        title="Delete patient"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* DETAILS */}
          <aside className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-[11px] font-semibold text-slate-100">
              Patient details
            </p>

            {!selectedPatient ? (
              <p className="mt-2 text-[12px] text-slate-400">
                Click a patient to view details.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-[12px] font-semibold text-slate-100">
                    {initials(selectedPatient.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-slate-50">
                      {selectedPatient.full_name || "Unnamed patient"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Created:{" "}
                      {selectedPatient.created_at
                        ? new Date(selectedPatient.created_at).toLocaleDateString("en-GB")
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-[12px] text-slate-200 space-y-2">
                  <div>
                    <p className="text-[10px] text-slate-400">Email</p>
                    <p className="truncate">{selectedPatient.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Phone</p>
                    <p className="truncate">{selectedPatient.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Date of birth</p>
                    <p className="truncate">
                      {selectedPatient.date_of_birth || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Patient code</p>
                    <p className="truncate">{selectedPatient.patient_code || "—"}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedPatient)}
                  className="w-full rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-[12px] font-semibold text-rose-200 hover:border-rose-400"
                >
                  Delete patient
                </button>
              </div>
            )}
          </aside>
        </div>

        {/* DELETE CONFIRM MODAL */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-semibold text-slate-50">
                Delete patient?
              </p>
              <p className="mt-2 text-[12px] text-slate-300">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-50">
                  {deleteTarget.full_name || "this patient"}
                </span>
                ? This cannot be undone.
              </p>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-[12px] text-slate-200 hover:border-slate-500"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-[12px] font-semibold text-rose-200 hover:border-rose-400"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
