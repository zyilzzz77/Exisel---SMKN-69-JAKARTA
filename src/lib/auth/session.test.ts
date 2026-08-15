import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  hashSessionToken,
  parseDeviceName,
  resolveCookieSecure,
  SESSION_DURATION_SECONDS,
  MAX_SESSIONS_PER_USER,
} from "./session-core";

test("hashSessionToken menghasilkan hash SHA-256 yang konsisten dan akurat", () => {
  const token = "test-session-token-1234567890abcdef";
  const expectedHash = createHash("sha256").update(token).digest("hex");
  const actualHash = hashSessionToken(token);

  assert.equal(actualHash, expectedHash);
  assert.equal(actualHash.length, 64);
});

test("durasi session tepat 30 hari (2,592,000 detik)", () => {
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
  assert.equal(SESSION_DURATION_SECONDS, thirtyDaysInSeconds);
  assert.equal(SESSION_DURATION_SECONDS, 2592000);
});

test("kebijakan multi-device membatasi maksimal 5 sesi aktif per user", () => {
  assert.equal(MAX_SESSIONS_PER_USER, 5);
});

test("parseDeviceName memformat nama OS dan browser dengan rapi", () => {
  const windowsChrome =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  assert.equal(parseDeviceName(windowsChrome), "Windows 10/11 / Chrome");

  const androidChrome =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
  assert.equal(parseDeviceName(androidChrome), "Android / Chrome");

  const iPhoneSafari =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
  assert.equal(parseDeviceName(iPhoneSafari), "iOS / Safari");

  const macSafari =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
  assert.equal(parseDeviceName(macSafari), "macOS / Safari");

  assert.equal(parseDeviceName(null), "Unknown Device");
  assert.equal(parseDeviceName(""), "Unknown Device");
});

test("resolveCookieSecure mengembalikan nilai yang sesuai konfigurasi", () => {
  assert.equal(resolveCookieSecure("true", "development"), true);
  assert.equal(resolveCookieSecure("false", "production"), false);
  assert.equal(resolveCookieSecure(undefined, "production"), true);
  assert.equal(resolveCookieSecure(undefined, "development"), false);
});
