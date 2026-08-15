import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const ATTENDANCE_INTENT_TTL_MS = 10 * 60 * 1_000;

export const ATTENDANCE_INTENT_COOKIE = "exisel_attendance_intent";

export function generateIntentToken() {
  return randomBytes(32).toString("hex");
}

export function hashIntentToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}