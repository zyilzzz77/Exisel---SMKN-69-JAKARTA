import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones on the current school Wi-Fi address to load Next.js dev
  // assets and hydrate Client Components such as the password visibility toggle.
  allowedDevOrigins: ["10.100.14.190"],
};

export default nextConfig;
