import "server-only";

import { cookies } from "next/headers";
import {
  OAUTH_INTENT_MAX_AGE_SECONDS,
  serializeOAuthIntent,
  sha256Hex,
  validateOAuthIntentPayload,
} from "./oauth-intent-core";

export { sanitizeReturnTo, sha256Hex } from "./oauth-intent-core";

export const OAUTH_INTENT_COOKIE = "exisel_google_oauth_intent";
const OAUTH_COOKIE_PATH = "/api/auth/google";

/**
 * Simpan OAuth intent sebagai cookie HttpOnly bertanda tangan (HMAC).
 * Intent terikat ke SHA-256(OAuth state) sehingga hanya bisa dipakai
 * pada callback dengan state yang sama, sekali pakai, dan kedaluwarsa 10 menit.
 */
export async function createOAuthIntentCookie(input: {
  state: string;
  returnTo: string;
}) {
  const payload = {
    stateHash: sha256Hex(input.state),
    returnTo: input.returnTo,
    exp: Math.floor(Date.now() / 1000) + OAUTH_INTENT_MAX_AGE_SECONDS,
  };

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_INTENT_COOKIE, serializeOAuthIntent(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OAUTH_INTENT_MAX_AGE_SECONDS,
    path: OAUTH_COOKIE_PATH,
    priority: "high",
  });
}

export async function validateOAuthIntentCookie(
  receivedState: string,
): Promise<{ ok: boolean; returnTo?: string }> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(OAUTH_INTENT_COOKIE)?.value;
  if (!raw) return { ok: false };

  return validateOAuthIntentPayload(raw, receivedState);
}

/** Hapus intent (consume / one-time). */
export async function consumeOAuthIntentCookie() {
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_INTENT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: OAUTH_COOKIE_PATH,
  });
}