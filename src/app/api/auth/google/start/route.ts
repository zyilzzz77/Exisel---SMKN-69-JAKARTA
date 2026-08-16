import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createGoogleAuthorizationRequest,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_COOKIES,
} from "@/lib/auth/google-oauth";
import { sanitizeInternalRedirect } from "@/lib/auth/url";

export const dynamic = "force-dynamic";

const OAUTH_COOKIE_MAX_AGE = 10 * 60;
const OAUTH_COOKIE_PATH = "/api/auth/google";

export async function GET(request: Request) {
  try {
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

    return NextResponse.redirect(authorization.authorizationUrl);
  } catch {
    return NextResponse.redirect(
      sanitizeInternalRedirect("/login?googleError=google_not_configured", request),
    );
  }
}
