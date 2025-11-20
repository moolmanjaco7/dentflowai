// lib/storage.js
export const PATIENT_FILES_BUCKET = "patient-files";

export function pathJoin(...parts) {
  return parts
    .map(p => String(p || "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

// crude file type helpers
export function isImage(name = "") {
  return /\.(png|jpg|jpeg|gif|webp|bmp|tif|tiff)$/i.test(name);
}
export function isPDF(name = "") {
  return /\.pdf$/i.test(name);
}
