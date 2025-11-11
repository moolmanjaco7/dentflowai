// components/DayAppointments.jsx
"use client";
import * as React from "react";
import { addDays, format } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { createClient } from "@supabase/supabase-js";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

const TZ = "Africa/Johannesburg";

// Supabase (browser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Our canonical set of statuses and nice labels
const STATUS_ORDER = [
  "scheduled",
  "confirmed",
  "checked_in",
  "completed",
  "no_show",
  "cancelled",
];

const STATUS_LABEL = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  checked_in: "Checked-in",
  completed: "Completed",
  no_show: "No Show",
  cancelled: "Cancelled",
};

function normalizeStatus(s) {
  if (!s) return "scheduled";
  const x = String(s).toLowerCase().trim();
  // map common variants -> canonical
  if (x === "no show" || x === "noshow") return "no_show";
  if (x === "checked-in" || x === "checked in") return "checked_in";
  if (!STATUS_ORDER.includes(x)) return "scheduled";
  return x;
}

function dayRangeUTC(date) {
  const startLocalStr = formatInTimeZone(date, TZ, "yyyy-MM-dd 00:00:00");
  const startUtc = toDate(startLocalStr, { timeZone: TZ });
  const endUtc = addDays(startUtc, 1);
  return { startUtc, endUtc };
}

export default function DayAppointments() {
  const [date, setDate] = React.useState(new Date());
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]); // each item -> { display_name, status, ... }
  const [error, setError] = React.useState(null);
  const [savingId, setSavingId] = React.useState(null);

  const fetchForDay = React.useCallback(async (d) => {
    setLoading(true);
    setError(null);
    try {
      const { startUtc, endUtc } = dayRangeUTC(d);

      // 1) Appointments for the day
      const { data: appts, error: apptErr } = await supabase
        .from("appointments")
        .select("id, title, starts_at, ends_at, status, notes, patient_id")
        .gte("starts_at", startUtc.toISOString())
        .lt("starts_at", endUtc.toISOString())
        .order("starts_at", { ascending: true });

      if (apptErr) throw apptErr;
      const appointments = Array.isArray(appts) ? appts : [];

      // 2) Fetch patient names in one go
      const ids = [...new Set(appointments.map((a) => a.patient_id).filter(Boolean))];
      let patientMap = new Map();
      if (ids.length > 0) {
        const { data: patients, error: patErr } = await supabase
          .from("patients")
          .select("id, full_name")
          .in("id", ids);
        if (!patErr && Array.isArray(patients)) {
          patientMap = new Map(patients.map((p) => [p.id, p.full_name]));
        }
      }

      const withNames = appointments.map((a) => ({
        ...a,
        display_name: patientMap.get(a.patient_id) || a.title || "(No name)",
        status: normalizeStatus(a.status),
      }));

      setItems(withNames);
    } catch (e) {
      setError(e?.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchForDay(date);
  }, [date, fetchForDay]);

  const filtered = React.useMemo(() => {
    return items.filter((a) => {
      const matchesQuery =
        !query ||
        (a.display_name || "").toLowerCase().includes(query.toLowerCase()) ||
        (a.notes || "").toLowerCase().includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ? true : normalizeStatus(a.status) === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  async function updateStatus(id, newStatusRaw) {
    const newStatus = normalizeStatus(newStatusRaw);
    // optimistic update
    const prev = items;
    setSavingId(id);
    setItems((list) =>
      list.map((it) => (it.id === id ? { ...it, status: newStatus } : it))
    );
    try {
      const { error: upErr } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (upErr) throw upErr;
    } catch (e) {
      // revert on failure
      setItems(prev);
      setError(e?.message || "Failed to update status");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-12 rounded-xl bg-white">
      {/* Left: Calendar */}
      <Card className="md:col-span-4 lg:col-span-3 p-3">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          initialFocus
          className="rounded-md border"
        />
      </Card>

      {/* Right: List */}
      <Card className="md:col-span-8 lg:col-span-9 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="text-sm font-semibold">
            {format(date, "EEE, dd MMM yyyy")} — Appointments
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search name/notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-[220px]"
            />
            {/* Status filter (native select = zero extra deps) */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border rounded-md px-2 py-1 bg-white"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-40 bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
          </div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No appointments for this selection.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((a, idx) => (
              <li key={a.id}>
                {idx !== 0 && <Separator className="my-2" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {a.display_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatInTimeZone(new Date(a.starts_at), TZ, "HH:mm")} —{" "}
                      {a.ends_at
                        ? formatInTimeZone(new Date(a.ends_at), TZ, "HH:mm zzz")
                        : formatInTimeZone(new Date(a.starts_at), TZ, "HH:mm zzz")}
                    </div>
                    {a.notes && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {a.notes}
                      </div>
                    )}
                  </div>

                  {/* Status badge + change dropdown */}
                  <div className="flex items-center gap-2">
                    <Badge variant={badgeVariant(a.status)} className="shrink-0 capitalize">
                      {STATUS_LABEL[normalizeStatus(a.status)] || "Scheduled"}
                    </Badge>
                    <select
                      value={normalizeStatus(a.status)}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className="text-xs border rounded-md px-2 py-1 bg-white"
                      disabled={savingId === a.id}
                      aria-label="Change status"
                    >
                      {STATUS_ORDER.map((s) => (
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
    </div>
  );
}

function badgeVariant(status) {
  switch (normalizeStatus(status)) {
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
