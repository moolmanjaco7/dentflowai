// pages/reception.js
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// -------- utilities
function startOfMonth(d) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function endOfMonth(d) { const x = new Date(d); x.setMonth(x.getMonth()+1, 0); x.setHours(23,59,59,999); return x; }
function startOfWeek(d) { const x = new Date(d); const day = (x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; } // Monday
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtISODate(d){ return d.toISOString().slice(0,10); }
function sameYMD(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

// -------- page
export default function ReceptionPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => new Date()); // which month we’re viewing
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [monthAppts, setMonthAppts] = useState([]); // all appts in visible month
  const [dayAppts, setDayAppts] = useState([]);     // appts for selected day (right panel)
  const [form, setForm] = useState({ name:"", email:"", phone:"", time:"" });
  const [msg, setMsg] = useState("");

  // auth gate
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

  // load month appointments (for dots/counts)
  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      try {
        const mStart = startOfMonth(monthCursor);
        const mEnd = endOfMonth(monthCursor);
        const { data, error } = await supabase
          .from("appointments")
          .select("id, title, starts_at, status")
          .gte("starts_at", mStart.toISOString())
          .lte("starts_at", mEnd.toISOString())
          .order("starts_at", { ascending: true });
        if (error) throw error;
        setMonthAppts(data || []);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session, monthCursor]);

  // load selected day appointments (right panel list)
  useEffect(() => {
    if (!session || !selectedDate) return;
    (async () => {
      const start = new Date(selectedDate); start.setHours(0,0,0,0);
      const end = new Date(selectedDate);   end.setHours(23,59,59,999);
      const { data, error } = await supabase
        .from("appointments")
        .select("id, title, starts_at, status")
        .gte("starts_at", start.toISOString())
        .lte("starts_at", end.toISOString())
        .order("starts_at", { ascending: true });
      if (!error) setDayAppts(data || []);
    })();
  }, [session, selectedDate]);

  // calendar grid (6 rows x 7 cols, Monday-first)
  const weeks = useMemo(() => {
    const first = startOfWeek(startOfMonth(monthCursor)); // Monday before/at 1st
    const cells = [];
    for (let i=0;i<42;i++) cells.push(addDays(first, i));
    return Array.from({length:6}, (_,w)=>cells.slice(w*7,(w+1)*7));
  }, [monthCursor]);

  // map counts by Y-M-D
  const countByDate = useMemo(() => {
    const m = new Map();
    for (const a of monthAppts) {
      const d = new Date(a.starts_at);
      const key = fmtISODate(d);
      m.set(key, (m.get(key)||0) + 1);
    }
    return m;
  }, [monthAppts]);

  // submit booking (any minute granularity, e.g. 14:28)
  async function book() {
    setMsg("");
    if (!form.name || !form.email || !form.time) { setMsg("Please enter name, email and time."); return; }
    try {
      const d = fmtISODate(selectedDate);
      const starts = new Date(`${d}T${form.time}:00`);
      const ends = new Date(starts.getTime() + 30*60*1000);

      // optional simple clash check (exact start)
      const { data: clash } = await supabase
        .from("appointments").select("id").eq("starts_at", starts.toISOString()).limit(1);
      if (clash && clash.length) { setMsg("❌ That time was just taken. Pick another."); return; }

      // upsert patient (find by email)
      let patientId = null;
      const { data: existing } = await supabase.from("patients").select("id").ilike("email", form.email).limit(1).maybeSingle();
      if (existing?.id) {
        patientId = existing.id;
      } else {
        const { data: pNew, error: pErr } = await supabase
          .from("patients")
          .insert({ full_name: form.name, email: form.email, phone: form.phone })
          .select("id").single();
        if (pErr) throw pErr;
        patientId = pNew.id;
      }

      const { error: aErr } = await supabase.from("appointments").insert({
        title: "Reception booking",
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: "booked",
        patient_id: patientId,
      });
      if (aErr) throw aErr;

      setMsg("✅ Booked.");
      setForm({ ...form, time: "" });
      // refresh day list + month counts
      const newMonth = new Date(monthCursor);
      setMonthCursor(newMonth); // triggers month reload
      setSelectedDate(new Date(selectedDate)); // triggers day reload
    } catch (e) {
      setMsg("❌ " + (e.message || "Booking failed"));
    }
  }

  // month header label
  const monthLabel = monthCursor.toLocaleString("en-ZA", { month: "long", year: "numeric" });

  return (
    <>
      <Head><title>Reception — Calendar & Quick Book</title></Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Month calendar */}
          <div className="bg-white border rounded-2xl p-4">
            <div className="flex items-center justify-between">
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
                        {/* tiny status dots / count */}
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

          {/* Right: Day details + quick book */}
          <div className="bg-white border rounded-2xl p-4">
            <h3 className="text-lg font-semibold">
              {selectedDate ? selectedDate.toLocaleDateString("en-ZA", { weekday:"long", year:"numeric", month:"short", day:"numeric" }) : "Select a day"}
            </h3>

            {/* Quick book form */}
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
                        {/* Future: link to open appointment/patient */}
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
