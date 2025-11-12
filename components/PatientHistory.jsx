// components/PatientHistory.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { STATUS_LABEL, normalizeUiStatus, toUiStatus } from "@/lib/status";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PatientHistory({ patientId }) {
  const [items, setItems] = React.useState([]);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setErr("");
      const { data, error } = await supabase
        .from("appointments")
        .select("id, title, starts_at, ends_at, status, notes")
        .eq("patient_id", patientId)
        .order("starts_at", { ascending: false });
      if (error) {
        setErr(error.message);
        setItems([]);
        return;
      }
      const mapped = (Array.isArray(data) ? data : []).map((a) => ({
        ...a,
        status: toUiStatus(a.status),
      }));
      setItems(mapped);
    })();
  }, [patientId]);

  return (
    <div className="space-y-3">
      {err && <div className="text-sm text-red-600">{err}</div>}

      {items.length === 0 ? (
        <p className="text-sm text-slate-600">No appointments found.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="rounded-lg border p-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{a.title || "Appointment"}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(a.starts_at).toLocaleString("en-ZA")}{" "}
                    {a.ends_at ? `– ${new Date(a.ends_at).toLocaleTimeString("en-ZA", {hour: "2-digit", minute: "2-digit"})}` : ""}
                  </div>
                  {a.notes && (
                    <div className="text-xs text-slate-600 line-clamp-2">{a.notes}</div>
                  )}
                </div>
                <Badge variant={badgeVariant(a.status)} className="capitalize">
                  {STATUS_LABEL[normalizeUiStatus(a.status)] || "Scheduled"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Separator />
    </div>
  );
}

function badgeVariant(uiStatus) {
  switch (normalizeUiStatus(uiStatus)) {
    case "confirmed":
    case "checked_in":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
    case "no_show":
      return "destructive";
    case "scheduled":
    default:
      return "outline";
  }
}
