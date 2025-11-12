// components/InlineEditField.jsx
"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function InlineEditField({
  label,
  value,
  type = "text",              // "text" | "email" | "tel" | "date"
  onSave,                     // async (nextValue) => void
  validate,                   // (val) => string | null  (return error message or null)
  placeholder = "—",
}) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(value ?? "");
  const [err, setErr] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setVal(value ?? "");
  }, [value]);

  async function handleSave() {
    const e = validate ? validate(val) : null;
    if (e) { setErr(e); return; }
    setSaving(true);
    try {
      await onSave(val === "" ? null : val);
      setEditing(false);
      setErr("");
      // toast (optional, if you have a global Toasts host)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Saved", type: "success" } }));
      }
    } catch (error) {
      setErr(error?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between border rounded-lg bg-white p-3">
      <div className="text-slate-600">{label}</div>

      {!editing ? (
        <div className="flex items-center gap-3">
          <div className="font-medium text-right min-w-[160px]">
            {value ? String(value) : <span className="text-slate-400">{placeholder}</span>}
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type={type}
            value={val ?? ""}
            onChange={(e) => setVal(e.target.value)}
            className="w-[220px]"
          />
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button variant="outline" size="sm" onClick={() => { setEditing(false); setVal(value ?? ""); setErr(""); }}>
            Cancel
          </Button>
          {err && <div className="text-xs text-red-600 max-w-[220px]">{err}</div>}
        </div>
      )}
    </div>
  );
}
