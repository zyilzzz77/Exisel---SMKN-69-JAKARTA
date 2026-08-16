import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createGoogleAuthorizationRequest,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_COOKIES,
} from "@/lib/auth/google-oauth";
import { sanitizeInternalRedirect } from "@/lib/auth/url";
import { isTurnstileEnabled, verifyTurnstile } from "@/lib/auth/turnstile";
import { getClientIp } from "@/lib/auth/ip";
import { checkRateLimit } from "@/lib/attendance/rate-limit";
import {
  createOAuthIntentCookie,
  sanitizeReturnTo,
} from "@/lib/auth/oauth-intent";

export const dynamic = "force-dynamic";

const OAUTH_COOKIE_MAX_AGE = 10 * 60;
const OAUTH_COOKIE_PATH = "/api/auth/google";
const GOOGLE_START_LIMIT_PER_MINUTE = 10;

export async function POST(request: Request) {
  const clientIp = getClientIp(request) ?? "local";

  try {
    const body = (await request.json().catch(() => ({}))) as {
      turnstileToken?: unknown;
      returnTo?: unknown;
    };

    const turnstileToken = body.turnstileToken;
    if (typeof turnstileToken !== "string" || turnstileToken.length > 2048) {
      return NextResponse.json(
        { ok: false, code: "TURNSTILE_FAILED" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 1. Rate limit sebelum Siteverify (agar traffic buruk tidak membanjiri Siteverify)
    const rate = checkRateLimit(
      `google-start:${clientIp}`,
      GOOGLE_START_LIMIT_PER_MINUTE,
    );
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, code: "RATE_LIMITED" },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 2. Siteverify
    if (isTurnstileEnabled()) {
      try {
        const turnstile = await verifyTurnstile({
          token: turnstileToken,
          remoteIp: clientIp === "local" ? undefined : clientIp,
          expectedAction: "login",
        });
        if (!turnstile.success) {
          return NextResponse.json(
            { ok: false, code: "TURNSTILE_FAILED" },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }
      } catch (error) {
        console.error("[GOOGLE START] Turnstile error:", error);
        return NextResponse.json(
          { ok: false, code: "TURNSTILE_FAILED" },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    // 3. OAuth state + nonce + PKCE verifier
    const config = getGoogleOAuthConfig(request.url, request);
    const authorization = createGoogleAuthorizationRequest(config);
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: OAUTH_COOKIE_MAX_AGE,
      path: OAUTH_COOKIE_PATH,
      priority: "high" as const,
    };

    cookieStore.set(
      GOOGLE_OAUTH_COOKIES.state,
      authorization.state,
      cookieOptions,
    );
    cookieStore.set(
      GOOGLE_OAUTH_COOKIES.nonce,
      authorization.nonce,
      cookieOptions,
    );
    cookieStore.set(
      GOOGLE_OAUTH_COOKIES.verifier,
      authorization.verifier,
      cookieOptions,
    );

    // 4. OAuth intent (one-time, signed, terikat ke state hash)
    await createOAuthIntentCookie({
      state: authorization.state,
      returnTo: sanitizeReturnTo(body.returnTo),
    });

    return NextResponse.json(
      { ok: true, authorizationUrl: authorization.authorizationUrl },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[GOOGLE START] error:", error);
    return NextResponse.json(
      { ok: false, code: "GOOGLE_START_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}