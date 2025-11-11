// pages/_app.js
import "@/styles/globals.css";
import Head from "next/head";
import { useEffect } from "react";

// Keep your existing components
import ErrorBoundary from "../components/ErrorBoundary";
import CookieNotice from "../components/CookieNotice";
import SiteFooter from "../components/SiteFooter";

// ✅ Single, canonical import for the header
import SiteHeader from "@/components/SiteHeader.jsx";

export default function App({ Component, pageProps }) {
  // Google Analytics boot (kept from your file)
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_GA_ID;
    if (!id) return;

    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s1);

    const s2 = document.createElement("script");
    s2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${id}');
    `;
    document.head.appendChild(s2);
  }, []);

  return (
  <>
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Head>

    <ErrorBoundary>
      <SiteHeader />
<div className="pt-14">
  <Component {...pageProps} />
  <CookieNotice />
  <SiteFooter />
</div>

    </ErrorBoundary>
  </>
);
}
