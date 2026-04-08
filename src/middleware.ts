import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory rate limiter — effective per Vercel instance.
// For production at scale, replace with Upstash Redis.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetTime - now };
}

// Periodically clean up stale entries (max 1000 entries to prevent memory leak)
function cleanupRateLimitMap() {
  const now = Date.now();
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap) {
      if (now > value.resetTime) rateLimitMap.delete(key);
    }
  }
}

function getClientIp(request: NextRequest): string {
  // On Vercel, x-forwarded-for is set by the edge network and is trustworthy
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // First IP is the client IP on Vercel
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export function middleware(request: NextRequest) {
  // Handle CORS preflight for API routes
  if (request.method === 'OPTIONS' && request.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://neurotest.live',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Block requests with excessively large Content-Length (1MB for JSON, skip for FormData)
  const contentLength = request.headers.get('content-length');
  const contentType = request.headers.get('content-type') || '';
  if (contentLength && !contentType.includes('multipart/form-data')) {
    if (parseInt(contentLength) > 1024 * 1024) { // 1MB for non-file requests
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }
  }

  // Rate limit analysis API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = getClientIp(request);
    cleanupRateLimitMap();

    // Strict rate limit for expensive AI analysis endpoints: 5 requests per minute
    if (request.nextUrl.pathname.startsWith('/api/analyze') ||
        request.nextUrl.pathname.startsWith('/api/profile') ||
        request.nextUrl.pathname.startsWith('/api/brain-history')) {
      const { allowed, remaining, resetIn } = rateLimit(ip, 5, 60000);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a minute before trying again.' },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil(resetIn / 1000).toString(),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }

      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
