/** @type {import('next').NextConfig} */
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // HSTS preload — only meaningful in production over HTTPS, harmless on http://localhost
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    // - script 'unsafe-inline' is required by Next.js' inline runtime;
    //   tighten with nonces later if we adopt strict-csp.
    // - connect/img allow Supabase project + storage + Facebook Graph + Gemini.
    // - frame-ancestors 'none' matches X-Frame-Options: DENY for modern browsers.
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://scontent.fbkk*.fna.fbcdn.net https://*.fbcdn.net",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://graph.facebook.com https://generativelanguage.googleapis.com",
    ].join('; '),
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

module.exports = nextConfig
