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
import Toasts from "@/components/Toast"; // 👈 toast host

const TZ = "Africa/Johannesburg";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Status mapping (unchanged)
const UI_STATUS = ["scheduled","confirmed","checked_in","completed","no_show","cancelled"];
const STATUS_LABEL = { scheduled:"Scheduled", confirmed:"Confirmed", checked_in:"Checked-in", completed:"Completed", no_show:"No Show", cancelled:"Cancelled" };
const UI_TO_DB = { scheduled:"booked", confirmed:"confirmed", checked_in:"checked_in", completed:"completed", no_show:"no_show", cancelled:"cancelled" };
const DB_TO_UI = { booked:"scheduled", confirmed:"confirmed", checked_in:"checked_in", completed:"completed", no_show:"no_show", cancelled:"cancelled" };

function normalizeUIStatus(s){
  if(!s) return "scheduled";
  const x=String(s).toLowerCase().trim().replaceAll("-","_");
  if(x==="noshow"||x==="no show") return "no_show";
  if(x==="checked in"||x==="checkedin") return "checked_in";
  return UI_STATUS.includes(x)?x:"scheduled";
}
function startOfDayLocal(date){
  const str = formatInTimeZone(date, TZ, "yyyy-MM-dd 00:00:00");
  return toDate(str, { timeZone: TZ });
}
function dayRangeUTC(date){
  const startUtc = startOfDayLocal(date);
  const endUtc   = addDays(startUtc, 1);
  return { startUtc, endUtc };
}

export default function DayAppointments(){
  const [date, setDate] = React.useState(new Date());
  const [weekView, setWeekView] = React.useState(false); // 👈 new
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]);  // flat list
  const [error, setError] = React.useState(null);
  const [savingId, setSavingId] = React.useState(null);

  const refresh = React.useCallback(async (d, asWeek = weekView) => {
    const base = d || date;
    setLoading(true); setError(null);
    try{
      // range: single day or 7 days
      const startUtc = startOfDayLocal(base);
      const endUtc   = asWeek ? addDays(startUtc, 7) : addDays(startUtc, 1);

      const { data: appts, error: apptErr } = await supabase
        .from("appointments")
        .select("id, title, starts_at, ends_at, status, notes, patient_id")
        .gte("starts_at", startUtc.toISOString())
        .lt("starts_at", endUtc.toISOString())
        .order("starts_at", { ascending: true });
      if(apptErr) throw apptErr;
      const appointments = Array.isArray(appts)?appts:[];

      // patients
      const ids = [...new Set(appointments.map(a=>a.patient_id).filter(Boolean))];
      let patientMap = new Map();
      if(ids.length){
        const { data: patients } = await supabase
          .from("patients")
          .select("id, full_name")
          .in("id", ids);
        if(Array.isArray(patients)){
          patientMap = new Map(patients.map(p=>[p.id, p.full_name]));
        }
      }

      const hydrated = appointments.map(a=>{
        const dbStatus=(a.status||"").toLowerCase().trim().replaceAll("-","_");
        const uiStatus=DB_TO_UI[dbStatus]||normalizeUIStatus(dbStatus);
        return {
          ...a,
          display_name: patientMap.get(a.patient_id) || a.title || "(No name)",
          status: uiStatus,
        };
      });

      setItems(hydrated);
    }catch(e){
      setError(e?.message||"Failed to load appointments");
    }finally{
      setLoading(false);
    }
  },[date, weekView]);

  React.useEffect(()=>{ refresh(date, weekView); },[date, weekView, refresh]);

  const filtered = React.useMemo(()=>{
    return items.filter(a=>{
      const matchesQuery = !query ||
        (a.display_name||"").toLowerCase().includes(query.toLowerCase()) ||
        (a.notes||"").toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter==="all" ? true : a.status===statusFilter;
      return matchesQuery && matchesStatus;
    });
  },[items, query, statusFilter]);

  // summary
  const summary = React.useMemo(()=>{
    const counts={ total: filtered.length };
    for(const k of UI_STATUS) counts[k]=0;
    for(const it of filtered) counts[normalizeUIStatus(it.status)]++;
    return counts;
  },[filtered]);

  async function updateStatus(id, newUIStatusRaw){
    const newUIStatus = normalizeUIStatus(newUIStatusRaw);
    const newDBStatus = UI_TO_DB[newUIStatus] || "booked";
    const prev = items;
    setSavingId(id);
    setItems(list=>list.map(it=>it.id===id?{...it, status:newUIStatus}:it));
    try{
      const { error: upErr } = await supabase
        .from("appointments")
        .update({ status:newDBStatus })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if(upErr) throw upErr;
      window.dispatchEvent(new CustomEvent("toast", { detail:{ title:"Status updated", type:"success" }}));
    }catch(e){
      setItems(prev);
      setError(e?.message||"Failed to update status");
      window.dispatchEvent(new CustomEvent("toast", { detail:{ title:"Failed to update", type:"error" }}));
    }finally{
      setSavingId(null);
    }
  }

  // date chip actions
  function setToday(){ setWeekView(false); setDate(new Date()); }
  function setTomorrow(){ setWeekView(false); setDate(addDays(new Date(),1)); }
  function toggleWeek(){ setWeekView(v=>!v); }

  // week grouping
  const groups = React.useMemo(()=>{
    if(!weekView) return null;
    const by = new Map();
    for(const a of filtered){
      const key = formatInTimeZone(new Date(a.starts_at), TZ, "yyyy-MM-dd");
      if(!by.has(key)) by.set(key, []);
      by.get(key).push(a);
    }
    return Array.from(by.entries())
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([k,list])=>({ dateKey:k, items:list }));
  },[filtered, weekView]);

  return (
    <div className="grid gap-4 md:grid-cols-12 rounded-xl bg-white">
      <Toasts /> {/* 👈 toast host */}

      {/* Left: Calendar */}
      <Card className="md:col-span-4 lg:col-span-3 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <button onClick={()=>setDate(d=>addDays(d,-1))} className="text-sm px-2 py-1 rounded border hover:bg-slate-50">← Prev</button>
          <button onClick={()=>setDate(d=>addDays(d,1))} className="text-sm px-2 py-1 rounded border hover:bg-slate-50">Next →</button>
        </div>

        {/* Quick chips */}
        <div className="flex items-center gap-2">
          <button onClick={setToday}
            className="text-xs px-2 py-1 rounded-full border bg-slate-50 hover:bg-slate-100">Today</button>
          <button onClick={setTomorrow}
            className="text-xs px-2 py-1 rounded-full border bg-slate-50 hover:bg-slate-100">Tomorrow</button>
          <button onClick={toggleWeek}
            className={`text-xs px-2 py-1 rounded-full border ${weekView?'bg-slate-900 text-white':'bg-slate-50 hover:bg-slate-100'}`}>
            {weekView? "Week: On" : "This Week"}
          </button>
        </div>

        <Calendar
          mode="single"
          selected={date}
          onSelect={(d)=>d && setDate(d)}
          initialFocus
          className="rounded-md border"
        />
      </Card>

      {/* Right: Controls + List */}
      <Card className="md:col-span-8 lg:col-span-9 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="text-sm font-semibold">
            {weekView
              ? `${format(date,"EEE, dd MMM")} → ${format(addDays(date,6),"EEE, dd MMM")} — Appointments`
              : `${format(date,"EEE, dd MMM yyyy")} — Appointments`}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search name/notes"
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              className="max-w-[220px]"
            />
            <select
              value={statusFilter}
              onChange={(e)=>setStatusFilter(e.target.value)}
              className="text-sm border rounded-md px-2 py-1 bg-white"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {UI_STATUS.map((s)=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SummaryChip label="Total" value={summary.total} />
          <SummaryChip label="Scheduled" value={summary.scheduled} />
          <SummaryChip label="Confirmed" value={summary.confirmed} />
          <SummaryChip label="Checked-in" value={summary.checked_in} />
          <SummaryChip label="Completed" value={summary.completed} />
          <SummaryChip label="No Show" value={summary.no_show} />
          <SummaryChip label="Cancelled" value={summary.cancelled} />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            Loading…
          </div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : (weekView ? (
          // Week grouped
          groups && groups.length ? (
            <div className="space-y-6">
              {groups.map(g=>(
                <div key={g.dateKey}>
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    {format(new Date(g.dateKey+"T00:00:00Z"), "EEE, dd MMM yyyy")}
                  </div>
                  <ul className="space-y-3">
                    {g.items.map((a, idx)=>(
                      <li key={a.id}>
                        {idx !== 0 && <Separator className="my-2" />}
                        <Row a={a} updateStatus={updateStatus} savingId={savingId} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">No appointments for this week.</div>
          )
        ) : (
          // Single day list
          filtered.length === 0 ? (
            <div className="text-muted-foreground text-sm">No appointments for this selection.</div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((a, idx)=>(
                <li key={a.id}>
                  {idx !== 0 && <Separator className="my-2" />}
                  <Row a={a} updateStatus={updateStatus} savingId={savingId} />
                </li>
              ))}
            </ul>
          )
        ))}
      </Card>
    </div>
  );
}

function Row({ a, updateStatus, savingId }){
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="text-sm font-medium">{a.display_name}</div>
        <div className="text-xs text-muted-foreground">
          {formatInTimeZone(new Date(a.starts_at), TZ, "HH:mm")} —{" "}
          {a.ends_at
            ? formatInTimeZone(new Date(a.ends_at), TZ, "HH:mm zzz")
            : formatInTimeZone(new Date(a.starts_at), TZ, "HH:mm zzz")}
        </div>
        {a.notes && <div className="text-xs text-slate-600 line-clamp-2">{a.notes}</div>}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={badgeVariant(a.status)} className="shrink-0 capitalize">
          {STATUS_LABEL[a.status] || "Scheduled"}
        </Badge>
        <select
          value={a.status}
          onChange={(e)=>updateStatus(a.id, e.target.value)}
          className="text-xs border rounded-md px-2 py-1 bg-white"
          disabled={savingId === a.id}
          aria-label="Change status"
        >
          {UI_STATUS.map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
    </div>
  );
}

function SummaryChip({ label, value }){
  return (
    <div className="text-xs px-2 py-1 rounded-full border bg-slate-50 text-slate-700">
      <span className="font-medium">{label}:</span> {value ?? 0}
    </div>
  );
}
function badgeVariant(uiStatus){
  switch (normalizeUIStatus(uiStatus)){
    case "confirmed":
    case "checked_in": return "default";
    case "completed": return "secondary";
    case "cancelled":
    case "no_show": return "destructive";
    case "scheduled":
    default: return "outline";
  }
}
