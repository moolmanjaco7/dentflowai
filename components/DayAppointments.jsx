// components/DayAppointments.jsx
"use client";
import * as React from "react";
import { addDays, format } from "date-fns";
import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";
import { createClient } from "@/lib/supabaseClient";

import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

const TZ = "Africa/Johannesburg";

// Compute the UTC range for the selected local day
function dayRangeUTC(date) {
  const startLocalStr = formatInTimeZone(date, TZ, "yyyy-MM-dd 00:00:00");
  const startUtc = zonedTimeToUtc(startLocalStr, TZ);
  const endUtc = addDays(startUtc, 1);
  return { startUtc, endUtc };
}

export default function DayAppointments() {
  const supabase = React.useMemo(() => createClient(), []);
  const [date, setDate] = React.useState(new Date());
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [error, setError] = React.useState(null);

  const fetchForDay = React.useCallback(
    async (d) => {
      setLoading(true);
      setError(null);
      try {
        const { startUtc, endUtc } = dayRangeUTC(d);
        const { data, error } = await supabase
          .from("appointments")
          .select("id, patient_name, starts_at, ends_at, status, notes")
          .gte("starts_at", startUtc.toISOString())
          .lt("starts_at", endUtc.toISOString())
          .order("starts_at", { ascending: true });

        if (error) throw error;
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.message || "Failed to load appointments");
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  React.useEffect(() => {
    fetchForDay(date);
  }, [date, fetchForDay]);

  const filtered = React.useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (a) =>
        (a.patient_name || "").toLowerCase().includes(q) ||
        (a.notes || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="grid gap-4 md:grid-cols-12">
      {/* Left: calendar */}
      <Card className="md:col-span-4 lg:col-span-3 p-3">
        <div className="text-sm font-medium mb-2">Pick a day</div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          initialFocus
          className="rounded-md border"
        />
      </Card>

      {/* Right: list */}
      <Card className="md:col-span-8 lg:col-span-9 p-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-sm font-medium">
            {format(date, "EEE, dd MMM yyyy")} — Appointments
          </div>
          <Input
            placeholder="Search name/notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-[220px]"
          />
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
            No appointments for this day.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((a, idx) => (
              <li key={a.id}>
                {idx !== 0 && <Separator className="my-2" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {a.patient_name || "(No name)"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatInTimeZone(new Date(a.starts_at), TZ, "HH:mm")} —{" "}
                      {a.ends_at
                        ? formatInTimeZone(new Date(a.ends_at), TZ, "HH:mm zzz")
                        : formatInTimeZone(
                            new Date(a.starts_at),
                            TZ,
                            "HH:mm zzz"
                          )}
                    </div>
                    {a.notes && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {a.notes}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={badgeVariant(a.status)}
                    className="shrink-0 capitalize"
                  >
                    {a.status || "booked"}
                  </Badge>
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
  switch ((status || "").toLowerCase()) {
    case "checked_in":
    case "confirmed":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
    case "no_show":
      return "destructive";
    default:
      return "outline";
  }
}
