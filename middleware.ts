import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // TODO: Replace with real Supabase session check
  // For now allow all routes through
  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*']
}
