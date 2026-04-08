import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval'",                                          // Three.js shader compilation requires unsafe-eval
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",             // Tailwind uses inline styles
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://img.youtube.com https://*.ytimg.com",
      "media-src 'self' data: blob:",
      "connect-src 'self' https://api.groq.com https://api.cerebras.ai https://api.cobalt.tools https://cobalt-api.ayo.tf",
      "worker-src 'self' blob:",                                                   // Three.js workers
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  serverExternalPackages: [],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: 'https://neurotest.live' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
