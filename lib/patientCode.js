// lib/patientCode.js
export function baseFromName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Patient";
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const base = (first[0]?.toUpperCase() + first.slice(1).toLowerCase())
    + (last ? last[0].toUpperCase() : "");
  // strip non-letters just in case
  return base.replace(/[^A-Za-z]/g, "") || "Patient";
}

// Ensure uniqueness by checking existing patient_code values that start with base
export async function generatePatientCode(supabase, fullName) {
  const base = baseFromName(fullName);
  const { data, error } = await supabase
    .from("patients")
    .select("patient_code")
    .ilike("patient_code", `${base}%`);

  if (error || !Array.isArray(data) || data.length === 0) return base;

  const taken = new Set(data.map((r) => (r.patient_code || "").toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;

  // find max numeric suffix
  let n = 2;
  while (taken.has((base + n).toLowerCase())) n++;
  return base + n;
}
