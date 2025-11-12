// components/PatientHistory.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Separator } from "@/components/ui/separator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PatientHistory({ patientId }) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!patientId) return;
    (async () => {
      setLoading(true);
      setErr("");
      const { data, error } = await supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, notes")
        .eq("patient_id", patientId)
        .order("starts_at", { ascending: false });
      if (error) setErr(error.message);
      setRows(data || []);
      setLoading(false);
    })();
  }, [patientId]);

  if (loading) return <p className="text-sm text-slate-600">Loading history…</p>;
  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!rows.length) return <p className="text-sm text-slate-600">No appointment history.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="border rounded-lg bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {new Date(r.starts_at).toLocaleString("en-ZA")}
            </div>
            <div
              className={`text-xs px-2 py-1 rounded ${
                r.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : r.status === "cancelled"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {r.status}
            </div>
          </div>
          {r.notes && <p className="text-sm mt-1 text-slate-700">{r.notes}</p>}
          <Separator className="my-2" />
          <a
            href={`/dashboard?focus=${r.starts_at}`}
            className="text-xs underline text-slate-600"
          >
            View on dashboard
          </a>
        </div>
      ))}
    </div>
  );
}
