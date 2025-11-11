// components/DayAppointments.jsx
"use client";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { toDate } from "date-fns-tz";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Toasts from "@/components/Toast";

import {
  UI_STATUS,
  STATUS_LABEL,
  normalizeUiStatus,
  toDbStatus,
  toUiStatus,
} from "@/lib/status";

const TZ = "Africa/Johannesburg";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Build a local time string like "yyyy-MM-dd HH:mm:ss" in TZ, then convert to Date (UTC)
function localDateTime(dateOnly, timeHHmm) {
  const d = format(dateOnly, "yyyy-MM-dd");
  return `${d} ${timeHHmm}:00`;
}
function startEndOfDayInUtc(dateOnly) {
  const startUtc = toDate(localDateTime(dateOnly, "00:00"), { timeZone: TZ });
  const endUtc = toDate(localDateTime(dateOnly, "23:59"), { timeZone: TZ });
  return { startUtc, endUtc };
}

export default function DayAppointments() {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [appointments, setAppointments] = React.useState([]);
  const [patients, setPatients] = React.useState(new Map());
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [savingId, setSavingId] = React.useState(null);

  const patientName = React.useCallback(
    (pid) => patients.get(pid) || "—",
    [patients]
  );

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // Ensure logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (typeof window !== "undefined") window.location.href = "/auth/login";
        return;
      }

      // Patients (map id -> full_name)
      const { data: pats } = await supabase
        .from("patients")
        .select("id, full_name")
        .order("full_name", { ascending: true })
        .limit(1000);

      const map = new Map();
      (Array.isArray(pats) ? pats : []).forEach((p) => map.set(p.id, p.full_name));
      setPatients(map);

      // Day range in UTC
      const { startUtc, endUtc } = startEndOfDayInUtc(selectedDate);

      // Appointments for that day
      const { data: appts, error: aErr } = await supabase
        .from("appointments")
        .select("id, title, starts_at, ends_at, status, patient_id, notes")
        .gte("starts_at", startUtc.toISOString())
        .lte("starts_at", endUtc.toISOString())
        .order("starts_at", { ascending: true });

      if (aErr) throw aErr;

      const hydrated = (Array.isArray(appts) ? appts : []).map((a) => ({
        ...a,
        status: toUiStatus(a.status), // DB → UI mapping
      }));

      setAppointments(hydrated);
    } catch (e) {
      setErr(e?.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function changeStatus(aptId, newUiStatusRaw) {
    const newUi = normalizeUiStatus(newUiStatusRaw);
    const newDb = toDbStatus(newUi);

    // optimistic update
    const prev = appointments;
    setSavingId(aptId);
    setAppointments((list) =>
      list.map((a) => (a.id === aptId ? { ...a, status: newUi } : a))
    );

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newDb })
        .eq("id", aptId)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { title: "Status updated", type: "success" },
        })
      );
    } catch (e) {
      // revert
      setAppointments(prev);
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { title: "Failed to update status", type: "error" },
        })
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card className="p-4">
      <Toasts />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Appointments by Day</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Date</label>
          <Input
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) => {
              const parts = e.target.value.split("-");
              // yyyy-mm-dd → Date in local TZ is fine; we convert properly later
              const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
              setSelectedDate(d);
            }}
            className="w-[160px]"
          />
          <button
            onClick={load}
            className="text-sm px-3 py-2 rounded-md border bg-white hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <Separator className="my-3" />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          Loading…
        </div>
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : appointments.length === 0 ? (
        <div className="text-sm text-slate-600">No appointments for this day.</div>
      ) : (
        <ul className="space-y-2">
          {appointments.map((a) => (
            <li key={a.id} className="rounded-lg border p-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {a.title || "Appointment"} · <span className="text-slate-600">{patientName(a.patient_id)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(a.starts_at).toLocaleTimeString("en-ZA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    –{" "}
                    {new Date(a.ends_at || a.starts_at).toLocaleTimeString("en-ZA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {a.notes && (
                    <div className="text-xs text-slate-600 line-clamp-2">{a.notes}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={badgeVariant(a.status)} className="shrink-0 capitalize">
                    {STATUS_LABEL[a.status] || "Scheduled"}
                  </Badge>
                  <select
                    value={normalizeUiStatus(a.status)}
                    onChange={(e) => changeStatus(a.id, e.target.value)}
                    className="text-xs border rounded-md px-2 py-1 bg-white"
                    disabled={savingId === a.id}
                    aria-label="Change status"
                  >
                    {UI_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
