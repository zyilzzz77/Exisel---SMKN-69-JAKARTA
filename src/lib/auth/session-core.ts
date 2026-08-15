import { createHash } from "node:crypto";

export const SESSION_COOKIE =
  process.env.SESSION_COOKIE_NAME || "exisel_session";
export const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days (2,592,000 seconds)
export const MAX_SESSIONS_PER_USER = 5;

export type SessionPayload = {
  userId: string;
  role: "STUDENT" | "ADMIN";
  sessionId: string;
  expiresAt: string;
};

export type CreateSessionOptions = {
  userId: string;
  role?: "STUDENT" | "ADMIN";
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  createdBy?: string;
};

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseDeviceName(userAgent?: string | null): string {
  if (!userAgent) return "Unknown Device";
  let os = "Unknown OS";
  if (/Windows NT 10/i.test(userAgent)) os = "Windows 10/11";
  else if (/Windows/i.test(userAgent)) os = "Windows";
  else if (/Android/i.test(userAgent)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(userAgent)) os = "iOS";
  else if (/Mac OS X/i.test(userAgent)) os = "macOS";
  else if (/Linux/i.test(userAgent)) os = "Linux";

  let browser = "Browser";
  if (/Edg\//i.test(userAgent)) browser = "Edge";
  else if (/Chrome\//i.test(userAgent)) browser = "Chrome";
  else if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent))
    browser = "Safari";
  else if (/Firefox\//i.test(userAgent)) browser = "Firefox";

  return `${os} / ${browser}`;
}

export function resolveCookieSecure(
  configuredValue?: string,
  nodeEnv?: string,
): boolean {
  if (configuredValue === "true") return true;
  if (configuredValue === "false") return false;
  return nodeEnv === "production";
}
