import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce the minimal Node.js server used by the production Docker image.
  output: "standalone",
  // Caddy strips this header too, but disabling it here also protects direct
  // container responses and avoids disclosing the framework unnecessarily.
  poweredByHeader: false,
  // Allow phones on the school Wi-Fi / LAN to load Next.js dev assets and
  // hydrate Client Components such as the password visibility toggle.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "10.100.14.190",
    "192.168.110.14",
    "192.168.1.4",
  ],
};

export default nextConfig;
