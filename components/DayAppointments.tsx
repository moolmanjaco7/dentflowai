// app/(dashboard)/components/DayAppointments.tsx
"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";
import { createClient } from "@/lib/supabaseClient"; // <-- assumes you already have this

// shadcn/ui (already used in your app)
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

const TZ = "Africa/Johannesburg"; // keep all date filtering aligned to your ops timezone

// ---- Types (adjust fields to match your schema) ----
interface Appointment {
  id: string;
  patient_name: string | null;
  starts_at: string; // UTC timestamp in DB (ISO)
  ends_at?: string | null;
  status?: string | null; // e.g., "booked" | "checked_in" | "cancelled"
  notes?: string | null;
}

// Utility: given a date (any timezone), compute the UTC range that covers that *local* day in TZ
function dayRangeUTC(date: Date) {
  // Build a `YYYY-MM-DD 00:00:00` *in TZ*, then convert to UTC for querying
  const startLocalStr = formatInTimeZone(date, TZ, "yyyy-MM-dd 00:00:00");
  const startUtc = zonedTimeToUtc(startLocalStr, TZ);
  const endUtc = addDays(startUtc, 1);
  return { startUtc, endUtc };
}

export default function DayAppointments() {
  const supabase = React.useMemo(() => createClient(), []);
  const [date, setDate] = React.useState<Date>(new Date());
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Appointment[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const fetchForDay = React.useCallback(async (d: Date) => {
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
      setItems((data || []) as Appointment[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  React.useEffect(() => {
    fetchForDay(date);
  }, [date, fetchForDay]);

  // simple client-side filter on patient name / notes
  const filtered = React.useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((a) =>
      (a.patient_name || "").toLowerCase().includes(q) || (a.notes || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="grid gap-4 md:grid-cols-12">
      {/* Left: small calendar */}
      <Card className="md:col-span-4 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Pick a day</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            initialFocus
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Right: appointments list */}
      <Card className="md:col-span-8 lg:col-span-9">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              {format(date, "EEE, dd MMM yyyy")} — Appointments
            </CardTitle>
            <Input
              placeholder="Search name/notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-[220px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
            </div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground text-sm">No appointments for this day.</div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((a, idx) => (
                <li key={a.id} className="">
                  {idx !== 0 && <Separator className="my-2" />}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {a.patient_name || "(No name)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {/* Show local time in TZ */}
                        {formatInTimeZone(new Date(a.starts_at), TZ, "HH:mm")} —
                        {a.ends_at ? (
                          <> {formatInTimeZone(new Date(a.ends_at), TZ, "HH:mm zzz")} </>
                        ) : (
                          <> {formatInTimeZone(addDays(new Date(a.starts_at), 0), TZ, "HH:mm zzz")} </>
                        )}
                      </div>
                      {a.notes && (
                        <div className="text-xs text-muted-foreground line-clamp-2">{a.notes}</div>
                      )}
                    </div>
                    <Badge variant={badgeVariant(a.status)} className="shrink-0 capitalize">
                      {a.status || "booked"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function badgeVariant(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "checked_in":
    case "confirmed":
      return "default" as const;
    case "completed":
      return "secondary" as const;
    case "cancelled":
    case "no_show":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

/*
USAGE
-----
1) Ensure you have shadcn/ui Calendar component installed. If not, run:
   npx shadcn@latest add calendar card badge separator input

2) Ensure you have date-fns & date-fns-tz installed:
   npm i date-fns date-fns-tz

3) Drop this file at: app/(dashboard)/components/DayAppointments.tsx

4) In your dashboard page (e.g., app/(dashboard)/page.tsx or wherever your grid lives):

   import DayAppointments from "./components/DayAppointments";

   export default function DashboardPage() {
     return (
       <main className="p-4 space-y-4">
         <DayAppointments />
         {/* your other dashboard cards */}
       </main>
     );
   }

5) DB expectations:
   - Table: appointments
   - Columns (at minimum): id uuid, patient_name text, starts_at timestamptz (UTC), ends_at timestamptz, status text, notes text
   - RLS must allow the current user/role to read their appointments.

6) Index (recommended):
   create index if not exists idx_appointments_starts_at on public.appointments (starts_at);

This component:
- Renders a compact calendar (left) and a same-day appointment list (right).
- Filters appointments by the selected *local* day in Africa/Johannesburg, then converts to UTC for the Supabase query.
- Shows loading, empty, and error states, with a small text search for quick filtering.
*/
