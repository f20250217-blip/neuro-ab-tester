import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Use Upstash Redis rate limiter if configured, otherwise fall back to in-memory
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Sliding window: 5 requests per 60 seconds per IP
const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      analytics: true,
      prefix: 'neurotest:ratelimit',
    })
  : null;

// In-memory fallback (per-instance, used when Upstash is not configured)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function memoryRateLimit(ip: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetIn: number } {
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

function cleanupRateLimitMap() {
  const now = Date.now();
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap) {
      if (now > value.resetTime) rateLimitMap.delete(key);
    }
  }
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function middleware(request: NextRequest) {
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
    if (parseInt(contentLength) > 1024 * 1024) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }
  }

  // Rate limit expensive AI analysis endpoints
  if (request.nextUrl.pathname.startsWith('/api/analyze') ||
      request.nextUrl.pathname.startsWith('/api/profile') ||
      request.nextUrl.pathname.startsWith('/api/brain-history')) {

    const ip = getClientIp(request);

    if (ratelimit) {
      // Upstash Redis rate limiting (works across all Vercel instances)
      const { success, remaining, reset } = await ratelimit.limit(ip);
      if (!success) {
        const resetIn = Math.max(0, reset - Date.now());
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
    } else {
      // Fallback: in-memory rate limiting (per-instance only)
      cleanupRateLimitMap();
      const { allowed, remaining, resetIn } = memoryRateLimit(ip, 5, 60000);
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
