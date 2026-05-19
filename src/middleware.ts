import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await auth()

  // Redirect unauthenticated users to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Inject user ID in header for Server Components
  const response = NextResponse.next()
  response.headers.set('x-user-id', session.user?.id || '')

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)'],
}
