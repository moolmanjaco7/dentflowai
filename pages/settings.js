// pages/settings.js
import Head from "next/head";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SettingsPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [form, setForm] = useState({
    clinic_name: "",
    clinic_phone: "",
    clinic_email: "",
    timezone: "Africa/Johannesburg",
    public_booking_enabled: false,
    slot_minutes: 15,
    buffer_minutes: 0,
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (!session) {
          window.location.href = "/auth/login";
          return;
        }
        setSession(session);

        // Load existing settings for this user
        const { data, error } = await supabase
          .from("clinic_settings")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error(error);
          setError(error.message || "Failed to load settings");
        } else if (data) {
          setForm({
            clinic_name: data.clinic_name || "",
            clinic_phone: data.clinic_phone || "",
            clinic_email: data.clinic_email || "",
            timezone: data.timezone || "Africa/Johannesburg",
            public_booking_enabled: !!data.public_booking_enabled,
            slot_minutes: data.slot_minutes ?? 15,
            buffer_minutes: data.buffer_minutes ?? 0,
          });
        }
      } catch (e) {
        console.error(e);
        setError(e.message || "Failed to load settings");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    setError("");
    setSavedMsg("");

    try {
      const payload = {
        user_id: session.user.id,
        clinic_name: form.clinic_name || null,
        clinic_phone: form.clinic_phone || null,
        clinic_email: form.clinic_email || null,
        timezone: form.timezone || "Africa/Johannesburg",
        public_booking_enabled: form.public_booking_enabled,
        slot_minutes: Number(form.slot_minutes) || 15,
        buffer_minutes: Number(form.buffer_minutes) || 0,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from("clinic_settings")
        .upsert(payload, { onConflict: "user_id" });

      if (upsertErr) throw upsertErr;

      // Also update global slot_config row (id=1) to keep slots API in sync
      await supabase
        .from("slot_config")
        .update({
          slot_minutes: payload.slot_minutes,
          buffer_minutes: payload.buffer_minutes,
        })
        .eq("id", 1);

      setSavedMsg("Settings saved");
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function setField(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-slate-600">Loading settings…</p>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>DentFlow AI — Settings</title>
      </Head>
      <main className="min-h-screen bg-slate-50">
        <section className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-slate-900">Clinic Settings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure your clinic profile and booking behaviour.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-6 bg-white border rounded-2xl p-6">
            {error && (
              <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">
                {error}
              </div>
            )}
            {savedMsg && (
              <div className="border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm rounded-md px-3 py-2">
                {savedMsg}
              </div>
            )}

            {/* Clinic identity */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Clinic profile</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Clinic name
                  </label>
                  <input
                    type="text"
                    className="rounded-md border px-3 py-2 text-sm"
                    value={form.clinic_name}
                    onChange={e => setField("clinic_name", e.target.value)}
                    placeholder="e.g. Smile Dental Studio"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Clinic phone
                  </label>
                  <input
                    type="tel"
                    className="rounded-md border px-3 py-2 text-sm"
                    value={form.clinic_phone}
                    onChange={e => setField("clinic_phone", e.target.value)}
                    placeholder="+27 …"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Clinic email
                  </label>
                  <input
                    type="email"
                    className="rounded-md border px-3 py-2 text-sm"
                    value={form.clinic_email}
                    onChange={e => setField("clinic_email", e.target.value)}
                    placeholder="reception@clinic.co.za"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Timezone
                  </label>
                  <select
                    className="rounded-md border px-3 py-2 text-sm"
                    value={form.timezone}
                    onChange={e => setField("timezone", e.target.value)}
                  >
                    <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                    {/* add more later if needed */}
                  </select>
                </div>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Booking behaviour */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Booking behaviour</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Appointment slot length (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    step={5}
                    className="rounded-md border px-3 py-2 text-sm"
                    value={form.slot_minutes}
                    onChange={e => setField("slot_minutes", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Affects available time slots in reception & public booking.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Buffer between appointments (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    step={5}
                    className="rounded-md border px-3 py-2 text-sm"
                    value={form.buffer_minutes}
                    onChange={e => setField("buffer_minutes", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Time blocked after each appointment.
                  </p>
                </div>

                <div className="flex flex-col gap-2 justify-end">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={form.public_booking_enabled}
                      onChange={e => setField("public_booking_enabled", e.target.checked)}
                    />
                    Enable public booking page
                  </label>
                  <p className="text-xs text-slate-500">
                    When on, patients can book via your public link (we'll wire this up next).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
