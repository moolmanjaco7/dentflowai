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

// Try note → on ANY error, retry notes
async function loadNotes(patientId) {
  let sel = await supabase
    .from("patient_notes")
    .select("id, author, created_at, note")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (sel.error) {
    // Retry with `notes`
    const fallback = await supabase
      .from("patient_notes")
      .select("id, author, created_at, notes")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (fallback.error) throw fallback.error;

    const rows = fallback.data ?? [];
    return {
      column: "notes",
      rows: rows.map((r) => ({
        id: r.id,
        text: r.notes ?? "",
        author: r.author || "staff",
        created_at: r.created_at,
      })),
    };
  }

  const rows = sel.data ?? [];
  return {
    column: "note",
    rows: rows.map((r) => ({
      id: r.id,
      text: r.note ?? "",
      author: r.author || "staff",
      created_at: r.created_at,
    })),
  };
}

export default function PatientNotes({ patientId }) {
  const [notes, setNotes] = React.useState([]);
  const [newNote, setNewNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [col, setCol] = React.useState/** @type {"note"|"notes"|null} */(null);

  // Undo state: { type: 'add'|'delete', note, timeoutId }
  const [undo, setUndo] = React.useState(null);

  function setUndoWithAutoClear(payload) {
    if (undo?.timeoutId) clearTimeout(undo.timeoutId);
    const timeoutId = setTimeout(() => setUndo(null), 7000);
    setUndo({ ...payload, timeoutId });
  }

  async function refresh() {
    setErr("");
    try {
      const { column, rows } = await loadNotes(patientId);
      setCol(column);
      setNotes(rows);
    } catch (e) {
      setCol(null);
      setNotes([]);
      setErr(e?.message || "Failed to load notes");
    }
  }

  React.useEffect(() => {
    if (patientId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function addNote() {
    const text = newNote.trim();
    if (!text) return;
    setSaving(true);
    setErr("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const author = user?.email || "staff";

      // Prefer detected column; if unknown, try note then notes on ANY error
      let payload =
        col === "notes"
          ? { patient_id: patientId, notes: text, author }
          : { patient_id: patientId, note: text, author };

      let ins = await supabase
        .from("patient_notes")
        .insert(payload)
        .select("id, created_at")
        .maybeSingle();

      if (ins.error) {
        // Retry with the other column
        payload = { patient_id: patientId, notes: text, author };
        ins = await supabase
          .from("patient_notes")
          .insert(payload)
          .select("id, created_at")
          .maybeSingle();
        if (ins.error) throw ins.error;
        setCol("notes");
      } else if (!col) {
        setCol("note");
      }

      const created = {
        id: ins.data?.id,
        text,
        author,
        created_at: ins.data?.created_at || new Date().toISOString(),
      };
      setNotes((n) => [created, ...n]);
      setNewNote("");
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

    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id));

    const { error } = await supabase.from("patient_notes").delete().eq("id", id);
    if (error) {
      setNotes(prev);
      alert("Failed to delete note");
      return;
    }
    setUndoWithAutoClear({ type: "delete", note: toDelete });
  }

  async function handleUndo() {
    if (!undo) return;
    if (undo.timeoutId) clearTimeout(undo.timeoutId);

    try {
      if (undo.type === "add") {
        if (undo.note?.id) {
          const { error } = await supabase.from("patient_notes").delete().eq("id", undo.note.id);
          if (error) throw error;
        }
        setNotes((n) => n.filter((x) => x.id !== undo.note.id));
      } else if (undo.type === "delete") {
        // Reinsert exact text/author/timestamp; if insert fails, retry other column
        const base = { patient_id: patientId, author: undo.note.author, created_at: undo.note.created_at };
        let ins = await supabase
          .from("patient_notes")
          .insert(col === "notes" ? { ...base, notes: undo.note.text } : { ...base, note: undo.note.text })
          .select("id, created_at")
          .maybeSingle();

        if (ins.error) {
          const ins2 = await supabase
            .from("patient_notes")
            .insert({ ...base, notes: undo.note.text })
            .select("id, created_at")
            .maybeSingle();
          if (ins2.error) throw ins2.error;
          setCol("notes");
          ins = ins2;
        }

        const restored = {
          ...undo.note,
          id: ins.data?.id ?? undo.note.id,
          created_at: ins.data?.created_at ?? undo.note.created_at,
        };
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
