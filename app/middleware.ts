import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPinCookieName, verifyPinSessionToken } from '@/app/lib/pin-session'

export async function middleware(request: NextRequest) {
  // Protect dashboard route
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const pinCookie = request.cookies.get(getPinCookieName())?.value
    
    // Check if PIN is verified (using cookie instead of localStorage for SSR)
    const ok = await verifyPinSessionToken(pinCookie)
    if (!ok) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}


