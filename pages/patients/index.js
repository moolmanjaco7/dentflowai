// pages/patients/index.js
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function clean(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function normalizeHeader(h) {
  return clean(h)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
      return obj[k];
    }
  }
  return "";
}

function parseCSVText(text) {
  // Simple CSV parser that handles quotes; enough for typical clinic exports.
  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    // ignore empty rows
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"') {
      // double quote escape
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i += 1;
      continue;
    }

    if (!inQuotes && (ch === "," || ch === ";")) {
      pushField();
      i += 1;
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      // handle CRLF
      if (ch === "\r" && text[i + 1] === "\n") i += 2;
      else i += 1;

      pushField();
      pushRow();
      continue;
    }

    field += ch;
    i += 1;
  }

  // last field/row
  pushField();
  pushRow();

  if (rows.length === 0) return [];

  const headers = rows[0].map(normalizeHeader);
  const data = rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h || `col_${idx}`] = r[idx] ?? "";
    });
    return obj;
  });

  return data;
}

function toImportRow(raw) {
  // Support lots of common export headers
  const full_name = clean(
    pick(raw, ["full_name", "fullname", "name", "patient_name", "patient", "patientfullname"])
  );

  const email = clean(pick(raw, ["email", "email_address", "mail"]));
  const phone = clean(pick(raw, ["phone", "phone_number", "mobile", "cell", "cellphone", "tel"]));
  const date_of_birth = clean(pick(raw, ["date_of_birth", "dob", "birthdate", "birth_date"]));
  const patient_code = clean(pick(raw, ["patient_code", "code", "patientid", "patient_id"]));

  return {
    full_name,
    email,
    phone,
    date_of_birth,
    patient_code,
  };
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | created | last_visit | appointment_count
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  const [selectedPatient, setSelectedPatient] = useState(null);

  const [toast, setToast] = useState("");

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAlsoAppointments, setDeleteAlsoAppointments] = useState(false);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  async function loadPatients() {
    setLoading(true);
    setToast("");

    try {
      const res = await fetch("/api/patients/list", { cache: "no-store" });
      if (!res.ok) {
        setPatients([]);
        setLoading(false);
        setToast("Could not load patients.");
        return;
      }
      const json = await res.json();
      setPatients(json?.patients || []);
    } catch (err) {
      console.error("Failed to load patients:", err);
      setPatients([]);
      setToast("Could not load patients.");
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
      let av = "";
      let bv = "";

      if (sortBy === "created") {
        av = a.created_at || "";
        bv = b.created_at || "";
      } else if (sortBy === "last_visit") {
        av = a.last_visit || "";
        bv = b.last_visit || "";
      } else if (sortBy === "appointment_count") {
        const an = Number(a.appointment_count || 0);
        const bn = Number(b.appointment_count || 0);
        const cmpNum = an - bn;
        return sortDir === "asc" ? cmpNum : -cmpNum;
      } else {
        av = (a.full_name || "").toLowerCase();
        bv = (b.full_name || "").toLowerCase();
      }

      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [patients, query, sortBy, sortDir]);

  // ---------------------------
  // Delete
  // ---------------------------
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setToast("");

    try {
      const res = await fetch("/api/patients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: deleteTarget.id,
          force: deleteAlsoAppointments,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setToast(json?.error || "Could not delete patient.");
        setDeleteLoading(false);
        return;
      }

      setToast("Patient deleted.");
      setDeleteTarget(null);
      setDeleteAlsoAppointments(false);
      setSelectedPatient(null);
      await loadPatients();
    } catch (err) {
      console.error("Delete patient failed:", err);
      setToast("Unexpected error while deleting patient.");
    } finally {
      setDeleteLoading(false);
    }
  }

  function openDelete(p) {
    setDeleteTarget(p);
    setDeleteAlsoAppointments(false);
  }

  // ---------------------------
  // Import
  // ---------------------------
  function resetImport() {
    setImportRows([]);
    setImportPreview([]);
    setImportErrors([]);
    setImportLoading(false);
  }

  function validateImportRows(rows) {
    const errs = [];
    const cleaned = rows
      .map((r, idx) => {
        const row = toImportRow(r);
        if (!row.full_name) errs.push(`Row ${idx + 1}: Missing full name`);
        return row;
      })
      .filter((r) => r.full_name);

    return { cleaned, errs };
  }

  async function handleImportFile(file) {
    resetImport();
    setToast("");

    try {
      const name = (file?.name || "").toLowerCase();

      let rawRows = [];

      if (name.endsWith(".csv")) {
        const text = await file.text();
        rawRows = parseCSVText(text);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        // Normalize keys to match our importer
        rawRows = rawRows.map((r) => {
          const obj = {};
          Object.keys(r || {}).forEach((k) => {
            obj[normalizeHeader(k)] = r[k];
          });
          return obj;
        });
      } else {
        setImportErrors(["Unsupported file type. Please upload CSV or Excel (.xlsx)."]);
        return;
      }

      const { cleaned, errs } = validateImportRows(rawRows);

      setImportRows(cleaned);
      setImportErrors(errs);

      const preview = cleaned.slice(0, 10);
      setImportPreview(preview);
    } catch (err) {
      console.error("Import file parse error:", err);
      setImportErrors(["Failed to read file. Please try a different export format."]);
    }
  }

  async function submitImport() {
    if (importRows.length === 0) {
      setToast("No valid rows to import.");
      return;
    }

    setImportLoading(true);
    setToast("");

    try {
      const res = await fetch("/api/patients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importRows }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setToast(json?.error || "Import failed.");
        setImportLoading(false);
        return;
      }

      setToast(`Imported ${json?.imported || importRows.length} patient(s).`);
      setImportOpen(false);
      resetImport();
      await loadPatients();
    } catch (err) {
      console.error("Import submit failed:", err);
      setToast("Import failed.");
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Patients</h1>
            <p className="text-xs text-slate-400">
              Search, view, import and manage patient records.
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
                <option value="appointment_count">Appointments</option>
                <option value="last_visit">Last visit</option>
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

            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200 hover:border-emerald-400"
            >
              Import
            </button>

            <button
              type="button"
              onClick={loadPatients}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 hover:border-slate-500"
            >
              Refresh
            </button>
          </div>
        </header>

        {toast && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-[12px] text-slate-200">
            {toast}
          </div>
        )}

        {/* Content */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
          {/* LIST */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-[12px] text-slate-300">
                {loading ? "Loading…" : `${filtered.length} patient(s)`}
              </p>
              <p className="text-[11px] text-slate-500">
                Tip: sort by “Appointments” or “Last visit”
              </p>
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
                  const apptCount =
                    typeof p.appointment_count === "number"
                      ? p.appointment_count
                      : Number(p.appointment_count || 0);

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

                          <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-400">
                            <span className="truncate">{p.email || "—"}</span>
                            <span className="truncate">{p.phone || "—"}</span>

                            <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300">
                              {apptCount} appt{apptCount === 1 ? "" : "s"}
                            </span>

                            {p.last_visit ? (
                              <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300">
                                Last:{" "}
                                {new Date(p.last_visit).toLocaleDateString(
                                  "en-GB"
                                )}
                              </span>
                            ) : (
                              <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-500">
                                No visits yet
                              </span>
                            )}

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
                        onClick={() => openDelete(p)}
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
                        ? new Date(selectedPatient.created_at).toLocaleDateString(
                            "en-GB"
                          )
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
                  <div>
                    <p className="text-[10px] text-slate-400">Appointments</p>
                    <p className="truncate">
                      {Number(selectedPatient.appointment_count || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Last visit</p>
                    <p className="truncate">
                      {selectedPatient.last_visit
                        ? new Date(selectedPatient.last_visit).toLocaleDateString("en-GB")
                        : "—"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openDelete(selectedPatient)}
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

              <label className="mt-3 flex items-center gap-2 text-[12px] text-slate-300">
                <input
                  type="checkbox"
                  checked={deleteAlsoAppointments}
                  onChange={(e) => setDeleteAlsoAppointments(e.target.checked)}
                />
                Delete this patient’s appointments too (force delete)
              </label>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteAlsoAppointments(false);
                  }}
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

        {/* IMPORT MODAL */}
        {importOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-50">
                  Import patients (CSV / Excel)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setImportOpen(false);
                    resetImport();
                  }}
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[12px] text-slate-200 hover:border-slate-500"
                >
                  Close
                </button>
              </div>

              <p className="mt-2 text-[12px] text-slate-300">
                Supported columns (any of these): <br />
                <span className="text-slate-400">
                  full_name / name / patient_name, email, phone / mobile, dob / date_of_birth, patient_code / code
                </span>
              </p>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile(f);
                  }}
                  className="block w-full text-[12px] text-slate-200"
                />

                {importErrors.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-200">
                    <p className="font-semibold mb-1">Warnings</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {importErrors.slice(0, 8).map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                      {importErrors.length > 8 ? (
                        <li>+ {importErrors.length - 8} more…</li>
                      ) : null}
                    </ul>
                  </div>
                )}

                {importRows.length > 0 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[12px] text-slate-300">
                      Ready to import:{" "}
                      <span className="font-semibold text-slate-50">
                        {importRows.length}
                      </span>{" "}
                      patient(s)
                    </p>
                    <button
                      type="button"
                      onClick={submitImport}
                      disabled={importLoading}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[12px] font-semibold text-emerald-200 hover:border-emerald-400 disabled:opacity-60"
                    >
                      {importLoading ? "Importing…" : "Import now"}
                    </button>
                  </div>
                )}
              </div>

              {importPreview.length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="border-b border-slate-800 px-4 py-2">
                    <p className="text-[12px] text-slate-200 font-semibold">
                      Preview (first 10)
                    </p>
                  </div>
                  <div className="max-h-[260px] overflow-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead className="sticky top-0 bg-slate-950">
                        <tr className="text-slate-300">
                          <th className="px-3 py-2 border-b border-slate-800">Full name</th>
                          <th className="px-3 py-2 border-b border-slate-800">Email</th>
                          <th className="px-3 py-2 border-b border-slate-800">Phone</th>
                          <th className="px-3 py-2 border-b border-slate-800">DOB</th>
                          <th className="px-3 py-2 border-b border-slate-800">Code</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-200">
                        {importPreview.map((r, idx) => (
                          <tr key={idx} className="border-b border-slate-800">
                            <td className="px-3 py-2">{r.full_name || "—"}</td>
                            <td className="px-3 py-2">{r.email || "—"}</td>
                            <td className="px-3 py-2">{r.phone || "—"}</td>
                            <td className="px-3 py-2">{r.date_of_birth || "—"}</td>
                            <td className="px-3 py-2">{r.patient_code || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
