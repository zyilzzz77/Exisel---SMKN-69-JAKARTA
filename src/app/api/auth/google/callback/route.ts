import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  getGoogleOAuthConfig,
  GoogleOAuthError,
  GOOGLE_OAUTH_COOKIES,
  oauthValuesMatch,
} from "@/lib/auth/google-oauth";
import { createSession } from "@/lib/auth/session";
import { getStudentStatusDestination } from "@/lib/auth/student-status";
import { hasAttendanceIntentCookie } from "@/lib/attendance/attendance-intent";
import { getPrisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";

const OAUTH_COOKIE_PATH = "/api/auth/google";
const OAUTH_ONLY_PASSWORD_MARKER = "!GOOGLE_OAUTH_ONLY!";

function loginErrorUrl(requestUrl: string, code: string) {
  const url = new URL("/login", requestUrl);
  url.searchParams.set("googleError", code);
  return url;
}

async function clearOAuthCookies() {
  const cookieStore = await cookies();
  for (const name of Object.values(GOOGLE_OAUTH_COOKIES)) {
    cookieStore.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: OAUTH_COOKIE_PATH,
    });
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);
  const providerError = callbackUrl.searchParams.get("error");
  const code = callbackUrl.searchParams.get("code");
  const receivedState = callbackUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_COOKIES.state)?.value;
  const expectedNonce = cookieStore.get(GOOGLE_OAUTH_COOKIES.nonce)?.value;
  const codeVerifier = cookieStore.get(GOOGLE_OAUTH_COOKIES.verifier)?.value;

  try {
    if (providerError) {
      throw new GoogleOAuthError("google_cancelled");
    }

    if (
      !code ||
      !receivedState ||
      !expectedState ||
      !expectedNonce ||
      !codeVerifier ||
      !oauthValuesMatch(receivedState, expectedState)
    ) {
      throw new GoogleOAuthError("google_invalid_state");
    }

    const config = getGoogleOAuthConfig(request.url);
    const identity = await exchangeGoogleCode({
      code,
      codeVerifier,
      expectedNonce,
      config,
    });

    const prisma = getPrisma();
    const user = await prisma.$transaction(async (transaction) => {
      const [byGoogleId, byEmail] = await Promise.all([
        transaction.user.findUnique({
          where: { googleId: identity.googleId },
          select: {
            id: true,
            email: true,
            googleId: true,
            role: true,
            status: true,
            isActive: true,
          },
        }),
        transaction.user.findUnique({
          where: { email: identity.email },
          select: {
            id: true,
            email: true,
            googleId: true,
            role: true,
            status: true,
            isActive: true,
          },
        }),
      ]);

      if (byGoogleId && byEmail && byGoogleId.id !== byEmail.id) {
        throw new GoogleOAuthError("google_account_conflict");
      }

      const existing = byGoogleId ?? byEmail;
      if (existing) {
        if (existing.role !== "STUDENT") {
          throw new GoogleOAuthError("google_student_only");
        }

        if (
          existing.googleId &&
          existing.googleId !== identity.googleId
        ) {
          throw new GoogleOAuthError("google_account_conflict");
        }

        return transaction.user.update({
          where: { id: existing.id },
          data: {
            googleId: identity.googleId,
            avatarUrl: identity.avatarUrl,
          },
          select: {
            id: true,
            role: true,
            status: true,
            isActive: true,
          },
        });
      }

      return transaction.user.create({
        data: {
          email: identity.email,
          googleId: identity.googleId,
          avatarUrl: identity.avatarUrl,
          name: "",
          passwordHash: OAUTH_ONLY_PASSWORD_MARKER,
          role: "STUDENT",
          status: "INCOMPLETE",
          mustChangePassword: false,
        },
        select: {
          id: true,
          role: true,
          status: true,
          isActive: true,
        },
      });
    });

    await clearOAuthCookies();
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;
    await createSession({
      userId: user.id,
      role: user.role,
      ipAddress: clientIp,
      userAgent,
      createdBy: "google_oauth",
    });

    let destination = user.isActive
      ? getStudentStatusDestination(user.status)
      : "/suspended";

    if (destination === "/dashboard" && (await hasAttendanceIntentCookie())) {
      destination = "/attendance/resume";
    }

    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    await clearOAuthCookies();
    const errorCode =
      error instanceof GoogleOAuthError
        ? error.code
        : isUniqueConstraintError(error)
          ? "google_account_conflict"
          : "google_login_failed";

    return NextResponse.redirect(loginErrorUrl(request.url, errorCode));
  }
}
