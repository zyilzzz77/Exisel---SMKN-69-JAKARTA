import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const googleJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_ENDPOINT));

export const GOOGLE_OAUTH_COOKIES = {
  state: "exisel_google_state",
  nonce: "exisel_google_nonce",
  verifier: "exisel_google_verifier",
} as const;

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  allowedEmailDomain: string | null;
};

export type GoogleIdentity = {
  googleId: string;
  email: string;
  avatarUrl: string | null;
};

export class GoogleOAuthError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "GoogleOAuthError";
  }
}

function base64Url(bytes: Buffer) {
  return bytes.toString("base64url");
}

function configuredRedirectUri(requestUrl: string) {
  const explicitRedirect = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicitRedirect) return explicitRedirect;

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const origin = configuredAppUrl
    ? new URL(configuredAppUrl).origin
    : new URL(requestUrl).origin;

  return new URL("/api/auth/google/callback", origin).toString();
}

export function getGoogleOAuthConfig(requestUrl: string): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new GoogleOAuthError("google_not_configured");
  }

  let redirectUri: string;
  try {
    redirectUri = configuredRedirectUri(requestUrl);
  } catch {
    throw new GoogleOAuthError("google_invalid_configuration");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    allowedEmailDomain:
      process.env.GOOGLE_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase() || null,
  };
}

export function createGoogleAuthorizationRequest(
  config: GoogleOAuthConfig,
) {
  const state = base64Url(randomBytes(32));
  const nonce = base64Url(randomBytes(32));
  const verifier = base64Url(randomBytes(48));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);

  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  return { authorizationUrl, state, nonce, verifier };
}

export function oauthValuesMatch(received: string, expected: string) {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);

  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}

export async function exchangeGoogleCode(input: {
  code: string;
  codeVerifier: string;
  expectedNonce: string;
  config: GoogleOAuthConfig;
}): Promise<GoogleIdentity> {
  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: input.config.clientId,
        client_secret: input.config.clientSecret,
        redirect_uri: input.config.redirectUri,
        grant_type: "authorization_code",
        code_verifier: input.codeVerifier,
      }),
      cache: "no-store",
    });
  } catch {
    throw new GoogleOAuthError("google_unavailable");
  }

  if (!response.ok) {
    throw new GoogleOAuthError("google_exchange_failed");
  }

  const tokens = (await response.json()) as { id_token?: unknown };
  if (typeof tokens.id_token !== "string") {
    throw new GoogleOAuthError("google_missing_id_token");
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(tokens.id_token, googleJwks, {
      algorithms: ["RS256"],
      audience: input.config.clientId,
      issuer: GOOGLE_ISSUERS,
    }));
  } catch {
    throw new GoogleOAuthError("google_invalid_id_token");
  }

  if (
    typeof payload.nonce !== "string" ||
    !oauthValuesMatch(payload.nonce, input.expectedNonce)
  ) {
    throw new GoogleOAuthError("google_invalid_nonce");
  }

  if (
    typeof payload.sub !== "string" ||
    !payload.sub ||
    payload.sub.length > 255 ||
    typeof payload.email !== "string" ||
    payload.email_verified !== true
  ) {
    throw new GoogleOAuthError("google_unverified_email");
  }

  const email = payload.email.trim().toLowerCase();
  if (!email || email.length > 254 || !email.includes("@")) {
    throw new GoogleOAuthError("google_invalid_email");
  }

  if (
    input.config.allowedEmailDomain &&
    email.split("@")[1] !== input.config.allowedEmailDomain
  ) {
    throw new GoogleOAuthError("google_domain_not_allowed");
  }

  const avatarUrl =
    typeof payload.picture === "string" && payload.picture.length <= 2048
      ? payload.picture
      : null;

  return { googleId: payload.sub, email, avatarUrl };
}
