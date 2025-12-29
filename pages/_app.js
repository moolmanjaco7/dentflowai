// pages/_app.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon);
  }, []);

  useEffect(() => {
    const protectedPrefixes = ["/dashboard", "/patients", "/reception"];
    const isProtected = protectedPrefixes.some((p) => router.pathname.startsWith(p));

    (async () => {
      // Allow auth + onboarding without checks
      if (router.pathname.startsWith("/auth") || router.pathname === "/onboarding") {
        setChecking(false);
        return;
      }

      if (!supabase) {
        setChecking(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        // Not logged in: protected pages should go to login, public pages OK
        if (isProtected) router.replace("/auth/login");
        setChecking(false);
        return;
      }

      // Logged in: if protected route, ensure profile has clinic_id
      if (isProtected) {
        const r = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const j = await r.json().catch(() => ({}));

        if (!r.ok) {
          router.replace("/auth/login");
          setChecking(false);
          return;
        }

        if (!j?.profile?.clinic_id) {
          router.replace("/onboarding");
          setChecking(false);
          return;
        }
      }

      setChecking(false);
    })();
  }, [router.pathname, supabase]); // rerun on route change

  if (checking) return null; // prevents flash of protected content

  return <Component {...pageProps} />;
}
