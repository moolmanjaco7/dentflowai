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

// Utility: try a query and, if the "note" column doesn't exist, retry using "notes"
async function loadNotes(patientId) {
  // Try selecting with `note`
  let sel = await supabase
    .from("patient_notes")
    .select("id, author, created_at, note")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (sel.error && /column .*note.* does not exist/i.test(sel.error.message)) {
    // Retry with `notes`
    sel = await supabase
      .from("patient_notes")
      .select("id, author, created_at, notes")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (sel.error) throw sel.error;

    const rows = sel.data ?? [];
    return { rows: rows.map(r => ({ id: r.id, text: r.notes ?? "", author: r.author || "staff", created_at: r.created_at })), column: "notes" };
  }

  if (sel.error) throw sel.error;

  const rows = sel.data ?? [];
  return { rows: rows.map(r => ({ id: r.id, text: r.note ?? "", author: r.author || "staff", created_at: r.created_at })), column: "note" };
}

export default function PatientNotes({ patientId }) {
  const [notes, setNotes] = React.useState([]);
  const [newNote, setNewNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [col, setCol] = React.useState/** @type {"note"|"notes"|null} */(null);

  // Undo state
  const [undo, setUndo] = React.useState(null);
  // shape: { type: 'add'|'delete', note: {id,text,author,created_at}, timeoutId }

  async function refresh() {
    setErr("");
    try {
      const { rows, column } = await loadNotes(patientId);
      setNotes(rows);
      setCol(column);
    } catch (e) {
      setNotes([]);
      setCol(null);
      setErr(e?.message || "Failed to load notes");
    }
  }

  React.useEffect(() => {
    if (patientId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  function setUndoWithAutoClear(payload) {
    if (undo?.timeoutId) clearTimeout(undo.timeoutId);
    const timeoutId = setTimeout(() => setUndo(null), 7000);
    setUndo({ ...payload, timeoutId });
  }

  async function addNote() {
    const text = newNote.trim();
    if (!text) return;
    setSaving(true);
    setErr("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const author = user?.email || "staff";

      // Prefer detected column; if unknown, try `note` then fallback to `notes`
      let payload;
      if (col === "note") {
        payload = { patient_id: patientId, note: text, author };
      } else if (col === "notes") {
        payload = { patient_id: patientId, notes: text, author };
      } else {
        payload = { patient_id: patientId, note: text, author };
      }

      let ins = await supabase.from("patient_notes").insert(payload).select("id, created_at").maybeSingle();

      if (ins.error && /column .*note.* does not exist/i.test(ins.error.message)) {
        // Retry with `notes`
        payload = { patient_id: patientId, notes: text, author };
        ins = await supabase.from("patient_notes").insert(payload).select("id, created_at").maybeSingle();
        if (ins.error) throw ins.error;
        setCol("notes");
      } else if (col === null) {
        setCol("note"); // worked with note
      }

      const created = {
        id: ins.data?.id,
        text,
        author,
        created_at: ins.data?.created_at || new Date().toISOString(),
      };
      setNotes((n) => [created, ...n]);
      setNewNote("");

      // Enable Undo: add -> undo deletes that inserted row
      setUndoWithAutoClear({ type: "add", note: created });
    } catch (e) {
      setErr(e.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(id) {
    const toDelete = notes.find((n) => n.id === id);
    if (!toDelete) return;

    // optimistic remove
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id));

    const { error } = await supabase.from("patient_notes").delete().eq("id", id);
    if (error) {
      setNotes(prev);
      alert("Failed to delete note");
      return;
    }

    // Enable Undo: delete -> undo re-inserts the exact note
    setUndoWithAutoClear({ type: "delete", note: toDelete });
  }

  async function handleUndo() {
    if (!undo) return;

    // Clear pending timeout
    if (undo.timeoutId) clearTimeout(undo.timeoutId);

    try {
      if (undo.type === "add") {
        // Undo add => delete the new row by ID
        if (undo.note?.id) {
          const { error } = await supabase.from("patient_notes").delete().eq("id", undo.note.id);
          if (error) throw error;
        }
        setNotes((n) => n.filter((x) => x.id !== undo.note.id));
      } else if (undo.type === "delete") {
        // Undo delete => reinsert exact text
        const payload =
          (col || "note") === "note"
            ? { patient_id: patientId, note: undo.note.text, author: undo.note.author, created_at: undo.note.created_at }
            : { patient_id: patientId, notes: undo.note.text, author: undo.note.author, created_at: undo.note.created_at };

        // Try detected column; if fails on note, retry notes
        let ins = await supabase.from("patient_notes").insert(payload).select("id, created_at").maybeSingle();
        if (ins.error && /column .*note.* does not exist/i.test(ins.error.message)) {
          const payload2 = { patient_id: patientId, notes: undo.note.text, author: undo.note.author, created_at: undo.note.created_at };
          ins = await supabase.from("patient_notes").insert(payload2).select("id, created_at").maybeSingle();
          if (ins.error) throw ins.error;
          setCol("notes");
        }

        const restored = { ...undo.note, id: ins.data?.id ?? undo.note.id, created_at: ins.data?.created_at ?? undo.note.created_at };
        setNotes((n) => [restored, ...n]);
      }
    } catch (e) {
      alert(e.message || "Undo failed");
    } finally {
      setUndo(null);
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
        <div className="flex gap-2 items-center">
          <Button onClick={addNote} disabled={saving || !newNote.trim()}>
            {saving ? "Saving…" : "Add note"}
          </Button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>

      {undo && (
        <div className="rounded-lg border bg-amber-50 p-3 text-sm flex items-center justify-between">
          <div>
            {undo.type === "add" ? "Note added." : "Note deleted."} You can undo this action.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleUndo}>Undo</Button>
            <button className="text-xs text-slate-600" onClick={() => setUndo(null)}>Dismiss</button>
          </div>
        </div>
      )}

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
                  {n.author}
                </div>
                <button
                  onClick={() => removeNote(n.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
              <div className="text-sm mt-1 whitespace-pre-wrap">{n.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
