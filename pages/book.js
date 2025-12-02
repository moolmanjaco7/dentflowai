// pages/book.js
import { useEffect, useState } from "react";
{/* Honeypot */}
<input
  type="text"
  name="website"
  autoComplete="off"
  tabIndex={-1}
  className="hidden"
  onChange={()=>{}}
/>

export default function PublicBookPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState("");
  const [form, setForm] = useState({ name:"", email:"", phone:"" });
  const [msg, setMsg] = useState("");

  async function loadSlots(d) {
    setLoading(true);
    setSlots([]);
    setSel("");
    try {
      const r = await fetch(`/api/public/slots?date=${d}`);
      const j = await r.json();
      setSlots(j.slots || []);
    } catch (e) {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSlots(date); }, [date]);

  async function submit() {
    setMsg("");
    if (!form.name || !form.email || !sel) {
      setMsg("Please complete name, email and time.");
      return;
    }
    try {
      const r = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ date, time: sel, name: form.name, email: form.email, phone: form.phone }),
      });
      const j = await r.json();
      if (j.ok) {
        setMsg("✅ Booked! You’ll receive a confirmation email.");
      } else {
        setMsg("❌ " + (j.error || "Could not book"));
      }
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 text-center">Book an Appointment</h1>

        <div className="mt-6 space-y-4 bg-white border rounded-2xl p-5">
          <div>
            <label className="block text-sm text-slate-600">Full name</label>
            <input className="mt-1 w-full border rounded-md px-3 py-2"
              value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          </div>
          <div>
            <label className="block text-sm text-slate-600">Email</label>
            <input type="email" className="mt-1 w-full border rounded-md px-3 py-2"
              value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          </div>
          <div>
            <label className="block text-sm text-slate-600">Phone (optional)</label>
            <input className="mt-1 w-full border rounded-md px-3 py-2"
              value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600">Date</label>
              <input type="date" className="mt-1 w-full border rounded-md px-3 py-2"
                value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Time</label>
              <select className="mt-1 w-full border rounded-md px-3 py-2"
                disabled={loading || slots.length===0}
                value={sel} onChange={e=>setSel(e.target.value)}>
                <option value="">{loading ? "Loading…" : (slots.length ? "Select time" : "No slots")}</option>
                {slots.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={submit}
            className="w-full mt-2 rounded-md bg-slate-900 text-white py-2 hover:bg-slate-800"
          >
            Confirm Booking
          </button>

          {msg && <p className="text-sm mt-2">{msg}</p>}
        </div>
      </section>
    </main>
  );
}
