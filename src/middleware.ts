import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

export default auth((request) => {
  if (!request.auth) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const role = (request.auth.user as any)?.role as string | undefined

  // Protect /admin routes — superadmin only
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (role !== 'superadmin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  const response = NextResponse.next()
  response.headers.set('x-user-id', request.auth.user?.id || '')
  response.headers.set('x-user-role', role || '')
  return response
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/auth|api/webhooks|api/v1).*)'],
}
