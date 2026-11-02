import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No CSP yet: needs tuning for Next.js inline scripts and fonts. HSTS comes from Vercel
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      // Same origin for the browser, so session cookies stay first-party (matters for iOS PWAs)
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:3001"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
