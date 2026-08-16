import assert from "node:assert/strict";
import test from "node:test";
import {
  isTurnstileEnabled,
  verifyTurnstile,
  assertProductionTurnstileConfig,
} from "./turnstile-core";
import {
  sanitizeReturnTo,
  sha256Hex,
  serializeOAuthIntent,
  validateOAuthIntentPayload,
} from "./oauth-intent-core";

const ORIGINAL_FETCH = globalThis.fetch;

function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

setNodeEnv("test");
process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
process.env.TURNSTILE_EXPECTED_HOSTNAME = "";

function mockSiteverifyResponse(payload: Record<string, unknown>) {
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

test("verifyTurnstile menolak token kosong", async () => {
  const result = await verifyTurnstile({ token: "", expectedAction: "login" });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "missing_token");
});

test("verifyTurnstile menolak token > 2048 chars", async () => {
  const result = await verifyTurnstile({
    token: "a".repeat(2049),
    expectedAction: "login",
  });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "invalid_token");
});

test("verifyTurnstile sukses dengan action dan hostname cocok", async () => {
  setNodeEnv("production");
  process.env.TURNSTILE_EXPECTED_HOSTNAME = "exisel.web.id";
  mockSiteverifyResponse({
    success: true,
    action: "login",
    hostname: "exisel.web.id",
    challenge_ts: "2026-08-16T00:00:00Z",
  });

  const result = await verifyTurnstile({ token: "valid-token", expectedAction: "login" });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.action, "login");
    assert.equal(result.hostname, "exisel.web.id");
  }

  setNodeEnv("test");
  process.env.TURNSTILE_EXPECTED_HOSTNAME = "";
});

test("verifyTurnstile menolak saat Cloudflare mengembalikan success=false", async () => {
  mockSiteverifyResponse({ success: false, "error-codes": ["invalid-input-response"] });
  const result = await verifyTurnstile({ token: "bad-token", expectedAction: "login" });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "invalid_token");
});

test("verifyTurnstile menolak action mismatch", async () => {
  mockSiteverifyResponse({
    success: true,
    action: "register",
    hostname: "exisel.web.id",
  });
  const result = await verifyTurnstile({ token: "valid-token", expectedAction: "login" });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "action_mismatch");
});

test("verifyTurnstile menolak hostname mismatch di production", async () => {
  setNodeEnv("production");
  process.env.TURNSTILE_EXPECTED_HOSTNAME = "exisel.web.id";
  mockSiteverifyResponse({
    success: true,
    action: "login",
    hostname: "evil.example.com",
  });
  const result = await verifyTurnstile({ token: "valid-token", expectedAction: "login" });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "hostname_mismatch");
  setNodeEnv("test");
  process.env.TURNSTILE_EXPECTED_HOSTNAME = "";
});

test("verifyTurnstile menangani timeout dengan AbortError", async () => {
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    const signal = init?.signal;
    return new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    });
  }) as typeof fetch;

  const result = await verifyTurnstile({ token: "slow-token", expectedAction: "login" });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "timeout");
});

test("verifyTurnstile menangani response bukan JSON", async () => {
  globalThis.fetch = (async () => {
    return new Response("not json", { status: 200 });
  }) as typeof fetch;
  const result = await verifyTurnstile({ token: "valid-token", expectedAction: "login" });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "invalid_response");
});

test("verifyTurnstile menangani network error (fail closed)", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  const result = await verifyTurnstile({ token: "valid-token", expectedAction: "login" });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "cloudflare_error");
});

test("isTurnstileEnabled false saat TURNSTILE_ENABLED=false", () => {
  process.env.TURNSTILE_ENABLED = "false";
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  assert.equal(isTurnstileEnabled(), false);
  process.env.TURNSTILE_ENABLED = "true";
});

test("isTurnstileEnabled true saat keys tersedia dan enabled", () => {
  process.env.TURNSTILE_ENABLED = "true";
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  assert.equal(isTurnstileEnabled(), true);
});

test("assertProductionTurnstileConfig menolak test keys di production", () => {
  setNodeEnv("production");
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  assert.throws(() => assertProductionTurnstileConfig());
  setNodeEnv("test");
});

test("sanitizeReturnTo hanya menerima path internal", () => {
  assert.equal(sanitizeReturnTo("/dashboard"), "/dashboard");
  assert.equal(sanitizeReturnTo("/kehadiran?token=abc"), "/kehadiran?token=abc");
  assert.equal(sanitizeReturnTo("https://evil.example"), "/dashboard");
  assert.equal(sanitizeReturnTo("//evil.example"), "/dashboard");
  assert.equal(sanitizeReturnTo("javascript:alert(1)"), "/dashboard");
  assert.equal(sanitizeReturnTo(null), "/dashboard");
  assert.equal(sanitizeReturnTo(""), "/dashboard");
});

test("sha256Hex konsisten", () => {
  assert.equal(
    sha256Hex("test"),
    "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  );
});

test("OAuth intent: valid dengan state cocok dan belum kedaluwarsa", () => {
  process.env.SESSION_SECRET = "test-secret";
  const state = "abc-state";
  const payload = {
    stateHash: sha256Hex(state),
    returnTo: "/dashboard",
    exp: Math.floor(Date.now() / 1000) + 300,
  };
  const serialized = serializeOAuthIntent(payload);
  const result = validateOAuthIntentPayload(serialized, state);
  assert.equal(result.ok, true);
  assert.equal(result.returnTo, "/dashboard");
});

test("OAuth intent: menolak state yang tidak cocok", () => {
  process.env.SESSION_SECRET = "test-secret";
  const payload = {
    stateHash: sha256Hex("state-a"),
    returnTo: "/dashboard",
    exp: Math.floor(Date.now() / 1000) + 300,
  };
  const serialized = serializeOAuthIntent(payload);
  const result = validateOAuthIntentPayload(serialized, "state-b");
  assert.equal(result.ok, false);
});

test("OAuth intent: menolak signature rusak", () => {
  process.env.SESSION_SECRET = "test-secret";
  const payload = {
    stateHash: sha256Hex("state"),
    returnTo: "/dashboard",
    exp: Math.floor(Date.now() / 1000) + 300,
  };
  const serialized = serializeOAuthIntent(payload);
  const result = validateOAuthIntentPayload(serialized.slice(0, -2) + "XX", "state");
  assert.equal(result.ok, false);
});

test("OAuth intent: menolak intent kedaluwarsa", () => {
  process.env.SESSION_SECRET = "test-secret";
  const state = "state";
  const payload = {
    stateHash: sha256Hex(state),
    returnTo: "/dashboard",
    exp: Math.floor(Date.now() / 1000) - 60,
  };
  const serialized = serializeOAuthIntent(payload);
  const result = validateOAuthIntentPayload(serialized, state);
  assert.equal(result.ok, false);
});

test.after(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});