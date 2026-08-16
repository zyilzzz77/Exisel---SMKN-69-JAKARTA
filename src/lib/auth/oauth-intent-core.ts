import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const OAUTH_INTENT_MAX_AGE_SECONDS = 10 * 60; // 10 menit

type OAuthIntentPayload = {
  stateHash: string;
  returnTo: string;
  exp: number;
};

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET tidak terkonfigurasi.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function serializeOAuthIntent(payload: OAuthIntentPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function deserializeOAuthIntent(raw: string): OAuthIntentPayload | null {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = sign(body);
  const receivedBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (
    receivedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(receivedBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<OAuthIntentPayload>;
    if (
      typeof parsed.stateHash !== "string" ||
      typeof parsed.returnTo !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    return parsed as OAuthIntentPayload;
  } catch {
    return null;
  }
}

/**
 * Hanya izinkan path internal. Menolak URL absolut, protocol-relative,
 * dan skema berbahaya (javascript:, dll).
 */
export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/dashboard";
  const clean = value.trim();
  if (!clean.startsWith("/") || clean.startsWith("//")) {
    return "/dashboard";
  }
  if (clean.includes("\\") || /[^/a-zA-Z0-9._?&=#%:@-]/.test(clean)) {
    return "/dashboard";
  }
  if (clean.length > 2048) return "/dashboard";
  return clean;
}

export type ParsedOAuthIntent = OAuthIntentPayload;

/** Validasi payload intent: signature, expiry, dan binding ke state. */
export function validateOAuthIntentPayload(
  raw: string,
  receivedState: string,
  nowMs = Date.now(),
): { ok: boolean; returnTo?: string } {
  const payload = deserializeOAuthIntent(raw);
  if (!payload) return { ok: false };

  if (payload.exp * 1000 <= nowMs) return { ok: false };

  if (payload.stateHash !== sha256Hex(receivedState)) return { ok: false };

  return { ok: true, returnTo: payload.returnTo };
}