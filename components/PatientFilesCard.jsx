// components/PatientFilesCard.jsx
"use client";
import * as React from "react";
import { supabase, BUCKET } from "@/lib/storageClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

function isImage(name = "") {
  return /\.(png|jpg|jpeg|gif|webp|bmp|tif|tiff)$/i.test(name);
}
function isPdf(name = "") {
  return /\.pdf$/i.test(name);
}

export default function PatientFilesCard({ patientId, patientTag }) {
  const [files, setFiles] = React.useState([]); // [{name, id?, signedUrl?}]
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [generating, setGenerating] = React.useState(null); // name being signed

  const folder = patientId; // each patient gets their own folder

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      setFiles(data || []);
    } catch (e) {
      setErr(e.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [folder]);

  React.useEffect(() => { load(); }, [load]);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${folder}/${timestamp}_${safeName}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      await load();
      // toast (if you have a global toast listener)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "File uploaded", type: "success" } }));
      }
      e.target.value = "";
    } catch (e) {
      setErr(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function signUrl(name) {
    setGenerating(name);
    try {
      const path = `${folder}/${name}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600); // 10 minutes
      if (error) throw error;
      return data?.signedUrl || null;
    } finally {
      setGenerating(null);
    }
  }

  async function handlePreview(name) {
    const url = await signUrl(name);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleCopyLink(name) {
    const url = await signUrl(name);
    if (url) {
      await navigator.clipboard.writeText(url);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Secure link copied (10 min)", type: "success" } }));
      }
    }
  }

  async function handleDelete(name) {
    if (!confirm("Delete this file?")) return;
    try {
      const path = `${folder}/${name}`;
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) throw error;
      await load();
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Files & documents</div>
          <div className="text-xs text-slate-500">Stored securely · Patient: {patientTag || "—"}</div>
        </div>
        <label className="inline-flex items-center gap-2">
          <Input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
          <Button size="sm" asChild>
            <span>{uploading ? "Uploading…" : "+ Upload"}</span>
          </Button>
        </label>
      </div>

      <Separator className="my-3" />

      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-slate-600">No files yet. Upload images (x-ray, photos) or PDFs.</p>
      ) : (
        <ul className="grid md:grid-cols-2 gap-3">
          {files.map((f) => (
            <li key={f.name} className="border rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  <div className="text-xs text-slate-500">
                    {isImage(f.name) ? "Image" : isPdf(f.name) ? "PDF" : "File"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handlePreview(f.name)} disabled={!!generating}>
                    {generating === f.name ? "…" : "Open"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleCopyLink(f.name)} disabled={!!generating}>
                    {generating === f.name ? "…" : "Link"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(f.name)}>
                    Delete
                  </Button>
                </div>
              </div>
              {/* Lightweight inline preview for images */}
              {isImage(f.name) && (
                <InlineImagePreview folder={folder} name={f.name} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InlineImagePreview({ folder, name }) {
  const [url, setUrl] = React.useState(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(`${folder}/${name}`, 600);
      if (!mounted) return;
      if (!error) setUrl(data?.signedUrl || null);
    })();
    return () => { mounted = false; };
  }, [folder, name]);
  if (!url) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-lg border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} className="block max-h-64 w-full object-contain bg-white" />
    </div>
  );
}
