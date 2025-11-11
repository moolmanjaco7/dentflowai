// components/NewPatientModal.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewPatientModal({ onCreated }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  // close on ESC
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function createPatient() {
    setLoading(true); setError("");
    try{
      if(!fullName.trim()) throw new Error("Full name is required");

      const { error: insErr } = await supabase
        .from("patients")
        .insert({
          full_name: fullName.trim(),
          email: email || null,
          phone: phone || null,
        })
        .select("id")
        .maybeSingle();
      if(insErr) throw insErr;

      setFullName(""); setEmail(""); setPhone("");
      setOpen(false);
      window.dispatchEvent(new CustomEvent("toast", { detail:{ title:"Patient added", type:"success" }}));
      onCreated?.();
    }catch(e){
      setError(e?.message||"Failed to add patient");
      window.dispatchEvent(new CustomEvent("toast", { detail:{ title:"Failed to add patient", type:"error" }}));
    }finally{
      setLoading(false);
    }
  }

  return (
    <>
      <button className="text-sm px-3 py-2 rounded-md border bg-white hover:bg-slate-50"
              onClick={()=>setOpen(true)}>+ New Patient</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">New Patient</h2>
              <button className="rounded px-2 py-1 text-sm hover:bg-slate-100" onClick={()=>setOpen(false)}>✕</button>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Full name</label>
                <Input value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="e.g. John Dlamini" />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Email</label>
                <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="e.g. john@clinic.co.za" />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Phone</label>
                <Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="e.g. 082 123 4567" />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-md border bg-white hover:bg-slate-50 text-sm"
                      onClick={()=>setOpen(false)} disabled={loading}>Cancel</button>
              <button className="px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-sm"
                      onClick={createPatient} disabled={loading}>
                {loading?"Adding…":"Add Patient"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
