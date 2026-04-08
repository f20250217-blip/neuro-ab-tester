import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter (resets on cold start, good enough for Vercel)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap) {
    if (now > value.resetTime) rateLimitMap.delete(key);
  }
}, 60000);

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Rate limit API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // 10 requests per minute for analysis endpoints
    if (request.nextUrl.pathname.startsWith('/api/analyze') ||
        request.nextUrl.pathname.startsWith('/api/profile') ||
        request.nextUrl.pathname.startsWith('/api/brain-history')) {
      if (!rateLimit(ip, 10, 60000)) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a minute before trying again.' },
          { status: 429 }
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
