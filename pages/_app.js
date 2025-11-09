import '../styles/globals.css'
import { useEffect } from 'react'
import CookieNotice from '../components/CookieNotice'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_GA_ID
    if (!id) return
    const s1 = document.createElement('script')
    s1.async = true
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
    document.head.appendChild(s1)
    const s2 = document.createElement('script')
    s2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${id}');
    `
    document.head.appendChild(s2)
  }, [])

  return (
    <>
      <SiteHeader />
      <Component {...pageProps} />
      <CookieNotice />
      <SiteFooter />
    </>
  )
}
