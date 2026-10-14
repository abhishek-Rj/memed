import { NextResponse, type NextRequest } from 'next/server';

// This is an optimistic navigation check only; Express validates every API permission.
export function proxy(request: NextRequest) {
  if (!request.cookies.has('memed_access')) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/brand/:path*', '/creator/:path*'] };
