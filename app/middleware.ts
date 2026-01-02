import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Protect dashboard route
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const pinVerified = request.cookies.get('pinVerified')?.value
    
    // Check if PIN is verified (using cookie instead of localStorage for SSR)
    if (pinVerified !== 'true') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}


