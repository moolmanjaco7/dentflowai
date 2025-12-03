// components/PatientNotes.jsx
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PatientNotes({ patientId }) {
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [undoToken, setUndoToken] = useState(null); // {id, timeoutId}

  async function load() {
    const { data, error } = await supabase
      .from("patient_notes")
      .select("id, note, created_at, created_by, deleted_at")
      .eq("patient_id", patientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (!error) setNotes(data || []);
  }

  useEffect(() => {
    if (patientId) load();
  }, [patientId]);

  async function addNote() {
    if (!input.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("patient_notes")
        .insert({
          patient_id: patientId,
          note: input.trim()
        })
        .select("id, note, created_at, created_by, deleted_at")
        .single();
      if (error) throw error;
      setNotes([data, ...notes]);
      setInput("");
      setToast("Note added");
      setTimeout(() => setToast(""), 2000);
    } catch (e) {
      setToast(e.message || "Failed to add note");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setBusy(false);
    }
  }

  async function softDelete(id) {
    // optimistic UI
    const prev = notes;
    setNotes(notes.filter(n => n.id !== id));
    setBusy(true);
    try {
      const { error } = await supabase
        .from("patient_notes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Prepare undo (10s)
      setToast("Note deleted — Undo?");
      const timeoutId = setTimeout(() => {
        setUndoToken(null);
        setToast("");
      }, 10000);
      setUndoToken({ id, prev, timeoutId });
    } catch (e) {
      setNotes(prev);
      setToast(e.message || "Delete failed");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!undoToken) return;
    clearTimeout(undoToken.timeoutId);
    setBusy(true);
    try {
      const { error } = await supabase
        .from("patient_notes")
        .update({ deleted_at: null })
        .eq("id", undoToken.id);
      if (error) throw error;
      // restore locally by reloading
      await load();
      setToast("Restored");
      setTimeout(() => setToast(""), 1500);
    } catch (e) {
      setToast(e.message || "Undo failed");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setUndoToken(null);
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-slate-600">Add note</label>
          <textarea
            rows={3}
            className="mt-1 w-full border rounded-md px-3 py-2"
            placeholder="Clinical note, follow-up reminder, etc."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
        </div>
        <button
          onClick={addNote}
          disabled={busy || !input.trim()}
          className="h-10 px-4 rounded-md bg-slate-900 text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {toast && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span>{toast}</span>
          {undoToken && (
            <button
              onClick={undo}
              className="underline underline-offset-4 text-slate-900"
            >
              Undo
            </button>
          )}
        </div>
      )}

      <div className="mt-4 divide-y">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-600">No notes yet.</p>
        ) : (
          notes.map(n => (
            <div key={n.id} className="py-3 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm whitespace-pre-wrap">{n.note}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(n.created_at).toLocaleString("en-ZA")}
                </div>
              </div>
              <button
                onClick={() => softDelete(n.id)}
                className="text-xs text-red-600 hover:underline"
                disabled={busy}
                title="Delete"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
