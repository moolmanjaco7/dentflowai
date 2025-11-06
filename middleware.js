// middleware.js
import { NextResponse } from 'next/server'

// Run only on /dashboard
export const config = {
  matcher: ['/dashboard'],
}

export function middleware(req) {
  // Supabase sets one of these cookies when logged in
  const hasAuth =
    req.cookies.get('sb-access-token') ||
    req.cookies.get('sb:token') ||
    req.cookies.get('supabase-auth-token')

  if (!hasAuth) {
    // redirect to login if no token
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return NextResponse.next()
}
