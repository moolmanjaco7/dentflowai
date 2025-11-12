// components/PatientFiles.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const BUCKET = "patient-files";

export default function PatientFiles({ patientId }) {
  const [files, setFiles] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function load() {
    setErr("");
    const { data, error } = await supabase
      .from("patient_files")
      .select("id, file_name, file_path, file_type, created_at, author")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setFiles([]);
      return;
    }
    setFiles(data || []);
  }

  React.useEffect(() => {
    if (patientId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function onPick(e) {
    const picked = e.target.files;
    if (!picked || picked.length === 0) return;

    setUploading(true);
    setErr("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const author = user?.email || "staff";
      const now = Date.now();

      for (const file of picked) {
        const path = `${patientId}/${now}-${file.name}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (up.error) throw up.error;

        // If bucket is public, you can build a public URL; otherwise keep path.
        // Store a DB row for listing
        const ins = await supabase.from("patient_files").insert({
          patient_id: patientId,
          file_name: file.name,
          file_path: path,
          file_type: file.type || null,
          author,
        });
        if (ins.error) throw ins.error;
      }

      // reload list
      await load();

      // toast (optional)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Files uploaded", type: "success" } }));
      }
    } catch (e) {
      setErr(e.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  }

  async function download(path) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      alert(error?.message || "Could not get download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function remove(id, path) {
    const ok = confirm("Delete this file?");
    if (!ok) return;

    const prev = files;
    setFiles((arr) => arr.filter((f) => f.id !== id));

    const { error: dbErr } = await supabase.from("patient_files").delete().eq("id", id);
    const { error: stErr } = await supabase.storage.from(BUCKET).remove([path]);

    if (dbErr || stErr) {
      setFiles(prev);
      alert(dbErr?.message || stErr?.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Upload file(s)</label>
        <input type="file" multiple onChange={onPick} disabled={uploading} />
        {uploading && <span className="text-sm text-slate-600">Uploading…</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>

      <Separator />

      {files.length === 0 ? (
        <p className="text-sm text-slate-600">No files uploaded.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="rounded-lg border bg-white p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{f.file_name}</div>
                <div className="text-xs text-slate-500">
                  {new Date(f.created_at).toLocaleString("en-ZA")} · {f.author || "staff"} · {f.file_type || "file"}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => download(f.file_path)}>Open</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(f.id, f.file_path)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
