// components/PatientNotes.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PatientNotes({ patientId }) {
  const [notes, setNotes] = React.useState([]);
  const [newNote, setNewNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function load() {
    setErr("");
    const { data, error } = await supabase
      .from("patient_notes")
      .select("id, note, author, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) {
      setErr(error.message);
      setNotes([]);
      return;
    }
    setNotes(Array.isArray(data) ? data : []);
  }

  React.useEffect(() => {
    if (patientId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    setErr("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const author = user?.email || "staff";
      const { error } = await supabase
        .from("patient_notes")
        .insert({ patient_id: patientId, note: newNote.trim(), author });
      if (error) throw error;
      setNewNote("");
      await load();
    } catch (e) {
      setErr(e.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(id) {
    const ok = confirm("Delete this note?");
    if (!ok) return;
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id));
    const { error } = await supabase.from("patient_notes").delete().eq("id", id);
    if (error) {
      // rollback
      setNotes(prev);
      alert("Failed to delete note");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <label className="text-sm font-medium">New note</label>
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add clinical notes, instructions, follow-up reminders…"
          rows={3}
        />
        <div className="flex gap-2">
          <Button onClick={addNote} disabled={saving}>
            {saving ? "Saving…" : "Add note"}
          </Button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-600">No notes yet.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-lg border p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {new Date(n.created_at).toLocaleString("en-ZA")}
                  {" · "}
                  {n.author || "staff"}
                </div>
                <button
                  onClick={() => removeNote(n.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
              <div className="text-sm mt-1 whitespace-pre-wrap">{n.note}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
