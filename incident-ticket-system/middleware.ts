import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req: any) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Protected routes
  const isOnDashboard = pathname.startsWith('/dashboard')
  const isOnIncidents = pathname.startsWith('/incidents')
  const isOnReports = pathname.startsWith('/reports')
  const isOnAuth = pathname.startsWith('/auth')

  // Redirect to login if accessing protected routes without auth
  if ((isOnDashboard || isOnIncidents || isOnReports) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Redirect to dashboard if logged in user tries to access auth pages
  if (isLoggedIn && isOnAuth) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
