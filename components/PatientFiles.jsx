// components/PatientFiles.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { PATIENT_FILES_BUCKET, pathJoin, isImage, isPDF } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PatientFiles({ patientId }) {
  const [files, setFiles] = React.useState([]); // [{name, id?, updated_at?, created_at?, ...}]
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState(null); // signed URL

  const folder = String(patientId || "").trim();

  const load = React.useCallback(async () => {
    if (!folder) return;
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await supabase
        .storage
        .from(PATIENT_FILES_BUCKET)
        .list(folder, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" }
        });
      if (error) throw error;
      setFiles(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Failed to list files");
    } finally {
      setLoading(false);
    }
  }, [folder]);

  React.useEffect(() => { load(); }, [load]);

  async function sign(path) {
    const { data, error } = await supabase
      .storage
      .from(PATIENT_FILES_BUCKET)
      .createSignedUrl(path, 60 * 60); // 1 hour
    if (error) throw error;
    return data?.signedUrl;
  }

  async function onPick(e) {
    const f = e.target.files?.[0];
    if (!f || !folder) return;
    setErr("");
    try {
      setUploading(true);
      const extension = f.name.includes(".") ? f.name.split(".").pop() : "bin";
      const safeBase = f.name.replace(/[^\w.\-() ]+/g, "").slice(-80) || "file";
      const key = pathJoin(folder, `${uuidv4()}-${safeBase}`);

      const { error } = await supabase
        .storage
        .from(PATIENT_FILES_BUCKET)
        .upload(key, f, {
          cacheControl: "3600",
          upsert: false,
          contentType: f.type || undefined
        });
      if (error) throw error;

      // toast (optional)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "File uploaded", type: "success" } }));
      }
      await load();
      e.target.value = "";
    } catch (e2) {
      setErr(e2.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(name) {
    if (!name || !folder) return;
    if (!confirm("Delete this file?")) return;
    try {
      const path = pathJoin(folder, name);
      const { error } = await supabase
        .storage
        .from(PATIENT_FILES_BUCKET)
        .remove([path]);
      if (error) throw error;
      await load();
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  async function openPreview(name) {
    try {
      const url = await sign(pathJoin(folder, name));
      setPreviewUrl(url);
    } catch (e) {
      alert(e.message || "Could not open file");
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">Files & documents</div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Upload</Label>
          <Input type="file" onChange={onPick} disabled={uploading} />
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
        </div>
      </div>

      <Separator className="my-3" />

      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-slate-600">No files yet. Upload x-rays, treatment plans, photos, PDFs…</p>
      ) : (
        <ul className="grid md:grid-cols-2 gap-3">
          {files.map((f) => {
            const name = f.name;
            const img = isImage(name);
            const pdf = isPDF(name);
            return (
              <li key={name} className="border rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{name}</div>
                  <div className="text-xs text-slate-500">
                    {f.created_at ? new Date(f.created_at).toLocaleString("en-ZA") : ""}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openPreview(name)}>
                    {img ? "Preview" : pdf ? "View PDF" : "Download"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(name)}>Delete</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* basic preview modal using native dialog */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] overflow-auto p-3" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Preview</div>
              <a className="text-sm underline" href={previewUrl} target="_blank" rel="noreferrer">Open in new tab</a>
            </div>
            {isImage(previewUrl) ? (
              <img src={previewUrl} alt="Preview" className="max-h-[70vh] w-auto mx-auto" />
            ) : isPDF(previewUrl) ? (
              <iframe src={previewUrl} className="w-full h-[70vh]" />
            ) : (
              <div className="text-sm text-slate-600">
                No inline preview. Use “Open in new tab” to download.
              </div>
            )}
            <div className="mt-3 text-right">
              <Button onClick={() => setPreviewUrl(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
