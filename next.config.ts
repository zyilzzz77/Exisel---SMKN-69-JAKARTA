import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce the minimal Node.js server used by the production Docker image.
  output: "standalone",
  // Allow phones on the current school Wi-Fi address to load Next.js dev
  // assets and hydrate Client Components such as the password visibility toggle.
  allowedDevOrigins: ["10.100.14.190"],
};

export default nextConfig;
