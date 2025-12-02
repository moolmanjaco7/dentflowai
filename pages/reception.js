// pages/reception.js
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ---- date helpers
function startOfMonth(d) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function endOfMonth(d) { const x = new Date(d); x.setMonth(x.getMonth()+1, 0); x.setHours(23,59,59,999); return x; }
function startOfWeek(d) { const x = new Date(d); const day = (x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; } // Monday
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtISODate(d){ return d.toISOString().slice(0,10); }
function sameYMD(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

export default function ReceptionPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [monthAppts, setMonthAppts] = useState([]);
  const [dayAppts, setDayAppts] = useState([]);

  const [form, setForm] = useState({ name:"", email:"", phone:"", time:"" });
  const [msg, setMsg] = useState("");

  // NEW: practitioners list + selected filter
  const [practitioners, setPractitioners] = useState([]);
  const [practitionerId, setPractitionerId] = useState(""); // "" = all

  // Auth gate
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { window.location.href = "/auth/login"; return; }
      setSession(session);
    })();
    return () => { mounted = false; };
  }, []);

  // Load practitioners (active)
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase
        .from("practitioners")
        .select("id, full_name, color_hex, active")
        .eq("active", true)
        .order("full_name");
      if (!error) setPractitioners(data || []);
    })();
  }, [session]);

  // Load month appointments (filtered by practitioner if selected)
  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      try {
        const mStart = startOfMonth(monthCursor);
        const mEnd = endOfMonth(monthCursor);
        let q = supabase
          .from("appointments")
          .select("id, title, starts_at, status, practitioner_id")
          .gte("starts_at", mStart.toISOString())
          .lte("starts_at", mEnd.toISOString())
          .order("starts_at", { ascending: true });
        if (practitionerId) q = q.eq("practitioner_id", practitionerId);
        const { data, error } = await q;
        if (error) throw error;
        setMonthAppts(data || []);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session, monthCursor, practitionerId]);

  // Load selected-day appointments (filtered by practitioner if selected)
  useEffect(() => {
    if (!session || !selectedDate) return;
    (async () => {
      const start = new Date(selectedDate); start.setHours(0,0,0,0);
      const end = new Date(selectedDate);   end.setHours(23,59,59,999);
      let q = supabase
        .from("appointments")
        .select("id, title, starts_at, status, practitioner_id")
        .gte("starts_at", start.toISOString())
        .lte("starts_at", end.toISOString())
        .order("starts_at", { ascending: true });
      if (practitionerId) q = q.eq("practitioner_id", practitionerId);
      const { data, error } = await q;
      if (!error) setDayAppts(data || []);
    })();
  }, [session, selectedDate, practitionerId]);

  // Calendar grid (6 x 7)
  const weeks = useMemo(() => {
    const first = startOfWeek(startOfMonth(monthCursor));
    const cells = [];
    for (let i=0;i<42;i++) cells.push(addDays(first, i));
    return Array.from({length:6}, (_,w)=>cells.slice(w*7,(w+1)*7));
  }, [monthCursor]);

  // Count per day
  const countByDate = useMemo(() => {
    const m = new Map();
    for (const a of monthAppts) {
      const d = new Date(a.starts_at);
      const key = fmtISODate(d);
      m.set(key, (m.get(key)||0) + 1);
    }
    return m;
  }, [monthAppts]);

  // Book (uses server API which bypasses RLS)
  async function book() {
    setMsg("");
    if (!form.name || !form.email || !form.time) {
      setMsg("Please enter name, email and time.");
      return;
    }
    try {
      const resp = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          date: fmtISODate(selectedDate),
          time: form.time,               // minute-level (e.g., 14:28)
          name: form.name,
          email: form.email,
          phone: form.phone,
          practitioner_id: practitionerId || null,
        }),
      });
      const j = await resp.json();
      if (!j.ok) {
        setMsg("❌ " + (j.error || "Could not book"));
        return;
      }
      setMsg("✅ Booked.");
      setForm({ ...form, time: "" });
      // refresh lists
      setMonthCursor(new Date(monthCursor));
      setSelectedDate(new Date(selectedDate));
    } catch (e) {
      setMsg("❌ " + (e.message || "Booking failed"));
    }
  }

  if (loading && !session) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-slate-600">Loading…</p>
      </main>
    );
  }

  const monthLabel = monthCursor.toLocaleString("en-ZA", { month: "long", year: "numeric" });

  return (
    <>
      <Head><title>Reception — Calendar & Quick Book</title></Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Calendar */}
          <div className="bg-white border rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded-md border hover:bg-slate-50"
                  onClick={() => setMonthCursor(addDays(startOfMonth(monthCursor), -1))}
                >
                  ← Prev
                </button>
                <h2 className="text-lg font-semibold">{monthLabel}</h2>
                <button
                  className="px-3 py-1.5 rounded-md border hover:bg-slate-50"
                  onClick={() => setMonthCursor(addDays(endOfMonth(monthCursor), 1))}
                >
                  Next →
                </button>
              </div>

              {/* NEW: Practitioner filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Practitioner</label>
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  value={practitionerId}
                  onChange={e=>setPractitionerId(e.target.value)}
                >
                  <option value="">All</option>
                  {practitioners.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 text-xs text-slate-500">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                <div key={d} className="py-1 text-center">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weeks.map((row, i) => (
                <div key={i} className="contents">
                  {row.map((cellDate, j) => {
                    const inMonth = cellDate.getMonth() === monthCursor.getMonth();
                    const isToday = sameYMD(cellDate, new Date());
                    const isSelected = sameYMD(cellDate, selectedDate);
                    const k = fmtISODate(cellDate);
                    const count = countByDate.get(k) || 0;
                    return (
                      <button
                        key={j}
                        onClick={() => setSelectedDate(cellDate)}
                        className={[
                          "aspect-square rounded-md border px-1 py-1 text-left",
                          inMonth ? "bg-white" : "bg-slate-50 text-slate-400",
                          isSelected ? "ring-2 ring-slate-900" : "",
                          isToday ? "border-slate-900" : "border-slate-200"
                        ].join(" ")}
                        title={`${k} — ${count} appointment${count===1?"":"s"}`}
                      >
                        <div className="text-xs font-medium">{cellDate.getDate()}</div>
                        {count > 0 && (
                          <div className="mt-1 text-[10px] inline-flex items-center gap-1 text-slate-600">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900" />
                            <span>{count}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Day details + quick book */}
          <div className="bg-white border rounded-2xl p-4">
            <h3 className="text-lg font-semibold">
              {selectedDate
                ? selectedDate.toLocaleDateString("en-ZA", { weekday:"long", year:"numeric", month:"short", day:"numeric" })
                : "Select a day"}
            </h3>

            {/* Quick book */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600">Patient full name</label>
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={form.name}
                  onChange={e=>setForm({...form, name:e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Email</label>
                <input
                  type="email"
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={form.email}
                  onChange={e=>setForm({...form, email:e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Phone (optional)</label>
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={form.phone}
                  onChange={e=>setForm({...form, phone:e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Time (any minute, e.g. 14:28)</label>
                <input
                  type="time"
                  step={60} // minute-level granularity
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={form.time}
                  onChange={e=>setForm({...form, time:e.target.value})}
                />
              </div>
            </div>

            <button
              onClick={book}
              className="mt-3 w-full sm:w-auto rounded-md bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
            >
              Book Appointment
            </button>
            {msg && <p className="mt-2 text-sm">{msg}</p>}

            {/* Day list */}
            <div className="mt-6">
              {dayAppts.length === 0 ? (
                <p className="text-sm text-slate-600">No appointments for this day.</p>
              ) : (
                <div className="space-y-2">
                  {dayAppts.map(a => {
                    const t = new Date(a.starts_at).toLocaleTimeString("en-ZA", { hour:"2-digit", minute:"2-digit" });
                    return (
                      <div key={a.id} className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{a.title || "Appointment"}</div>
                          <div className="text-xs text-slate-600">{t} · {a.status}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
