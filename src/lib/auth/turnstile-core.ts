const SITEVERIFY_ENDPOINT =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const DEFAULT_TIMEOUT_MS = 5000;
const TEST_SITEKEY_PREFIX = "1x00000000000000000000";
const TEST_SECRET_PREFIX = "1x0000000000000000000000000000000AA";

export type TurnstileVerifyResult =
  | { success: true; hostname: string; action: string; challengeTs: string }
  | { success: false; reason: string };

export function getTurnstileEnv() {
  return {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "",
    secretKey:
      (
        process.env.TURNSTILE_SECRET_KEY ?? process.env.TURNSTILE_SECRET
      )?.trim() ?? "",
    expectedHostname:
      process.env.TURNSTILE_EXPECTED_HOSTNAME?.trim() || null,
    timeoutMs:
      Number(process.env.TURNSTILE_SITEVERIFY_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    enabledFlag: process.env.TURNSTILE_ENABLED?.trim().toLowerCase(),
  };
}

/**
 * Fail-closed production guard:
 * - test keys must never run in production
 * - missing keys in production (when enabled) must throw instead of silently bypassing
 */
export function assertProductionTurnstileConfig() {
  if (process.env.NODE_ENV !== "production") return;

  const { siteKey, secretKey } = getTurnstileEnv();

  if (siteKey.startsWith(TEST_SITEKEY_PREFIX) || secretKey.startsWith(TEST_SECRET_PREFIX)) {
    throw new Error(
      "Turnstile test keys tidak boleh digunakan di production.",
    );
  }

  if (siteKey && !secretKey) {
    throw new Error("TURNSTILE_SECRET_KEY wajib diisi di production.");
  }
}

export function isTurnstileEnabled(): boolean {
  const { siteKey, secretKey, enabledFlag } = getTurnstileEnv();

  if (enabledFlag === "false") return false;
  if (enabledFlag === "true") {
    assertProductionTurnstileConfig();
    return Boolean(siteKey && secretKey);
  }

  if (process.env.NODE_ENV === "production") {
    assertProductionTurnstileConfig();
    return Boolean(siteKey && secretKey);
  }

  // Development: hanya aktif bila kedua key tersedia (mis. test keys)
  return Boolean(siteKey && secretKey);
}

export async function verifyTurnstile(input: {
  token: string;
  remoteIp?: string;
  expectedAction: string;
}): Promise<TurnstileVerifyResult> {
  const { token, remoteIp, expectedAction } = input;

  if (typeof token !== "string" || token.trim() === "") {
    return { success: false, reason: "missing_token" };
  }

  if (token.length > 2048) {
    return { success: false, reason: "invalid_token" };
  }

  const { secretKey, expectedHostname, timeoutMs } = getTurnstileEnv();

  if (!secretKey) {
    throw new Error("TURNSTILE_SECRET_KEY tidak terkonfigurasi.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const form = new FormData();
    form.append("secret", secretKey);
    form.append("response", token);

    if (remoteIp) {
      form.append("remoteip", remoteIp);
    }

    form.append("idempotency_key", crypto.randomUUID());

    const response = await fetch(SITEVERIFY_ENDPOINT, {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: controller.signal,
    });

    let result: Record<string, unknown>;
    try {
      result = (await response.json()) as Record<string, unknown>;
    } catch {
      return { success: false, reason: "invalid_response" };
    }

    if (result.success !== true) {
      return { success: false, reason: "invalid_token" };
    }

    const isTestKey =
      secretKey.startsWith(TEST_SECRET_PREFIX) ||
      (result.metadata as { result_with_testing_key?: boolean } | undefined)
        ?.result_with_testing_key === true;

    if (result.action !== undefined) {
      if (result.action !== expectedAction) {
        return { success: false, reason: "action_mismatch" };
      }
    } else if (!isTestKey) {
      return { success: false, reason: "action_mismatch" };
    }

    if (
      process.env.NODE_ENV === "production" &&
      expectedHostname &&
      result.hostname !== expectedHostname
    ) {
      return { success: false, reason: "hostname_mismatch" };
    }

    return {
      success: true,
      hostname: typeof result.hostname === "string" ? result.hostname : "",
      action:
        typeof result.action === "string"
          ? result.action
          : isTestKey
            ? expectedAction
            : "",
      challengeTs:
        typeof result.challenge_ts === "string" ? result.challenge_ts : "",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, reason: "timeout" };
    }
    return { success: false, reason: "cloudflare_error" };
  } finally {
    clearTimeout(timeout);
  }
}