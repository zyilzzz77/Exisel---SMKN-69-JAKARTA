import assert from "node:assert";
import { createHmac, timingSafeEqual } from "node:crypto";

const ATTENDANCE_QR_ROTATION_MS = 25_000;
const QR_VERSION = "1";
const SESSION_SECRET = "test-secret-at-least-32-chars-long-0123456789";

function qrBaseUrl(host) {
  if (host) return `http://${host}`;
  return "http://localhost:3000";
}

function qrScanOrigin(host) {
  try {
    return new URL(qrBaseUrl(host)).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function qrScanPath() {
  return "/attendance/scan";
}

function signature(input) {
  const message = [
    QR_VERSION,
    input.extracurricularId,
    input.dateKey,
    input.bucket,
    input.sessionNonce,
  ].join(".");

  return createHmac("sha256", SESSION_SECRET)
    .update(message)
    .digest("base64url");
}

function createAttendanceQrPayload(input) {
  const now = input.now ?? Date.now();
  const bucket = Math.floor(now / ATTENDANCE_QR_ROTATION_MS);
  const baseUrl = input.baseUrl?.trim() || qrBaseUrl(input.host);
  const url = new URL(qrScanPath(), baseUrl);
  url.searchParams.set("v", QR_VERSION);
  url.searchParams.set("e", input.extracurricularId);
  url.searchParams.set("d", input.dateKey);
  url.searchParams.set("t", String(bucket));
  url.searchParams.set("s", signature({ ...input, bucket }));

  return {
    payload: url.toString(),
    expiresAt: (bucket + 1) * ATTENDANCE_QR_ROTATION_MS,
  };
}

function validateAttendanceQrPayload(payload, input) {
  try {
    const url = new URL(payload);
    const originSet = new Set([
      qrScanOrigin(input.host),
      ...(input.allowedOrigins ?? []).filter(Boolean),
    ]);

    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    ) {
      originSet.add("http://localhost:3000");
      originSet.add("http://127.0.0.1:3000");
      if (url.port) {
        originSet.add(`http://localhost:${url.port}`);
        originSet.add(`http://127.0.0.1:${url.port}`);
      }
    }

    if (!originSet.has(url.origin)) return false;
    if (url.pathname !== qrScanPath()) return false;
    if (url.searchParams.get("v") !== QR_VERSION) return false;
    if (url.searchParams.get("e") !== input.extracurricularId) return false;
    if (url.searchParams.get("d") !== input.dateKey) return false;

    const bucketText = url.searchParams.get("t") ?? "";
    const suppliedSignature = url.searchParams.get("s") ?? "";
    if (!/^\d+$/.test(bucketText) || !/^[A-Za-z0-9_-]{43}$/.test(suppliedSignature)) {
      return false;
    }

    const bucket = Number(bucketText);
    if (!Number.isSafeInteger(bucket)) return false;

    const currentBucket = Math.floor(
      (input.now ?? Date.now()) / ATTENDANCE_QR_ROTATION_MS,
    );

    const isBucketValid = bucket === currentBucket || bucket === currentBucket - 1;
    if (!isBucketValid) return false;

    const expected = signature({ ...input, bucket });
    return timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expected));
  } catch {
    return false;
  }
}

const input = {
  extracurricularId: "e1000000-0000-0000-0000-000000000001",
  dateKey: "2026-08-17",
  sessionNonce: "nonce-123",
  host: "localhost:3000",
};

// 1. Validasi waktu sama (bucket 0)
const now = 1755400000000;
const { payload } = createAttendanceQrPayload({ ...input, now });
const validSameTime = validateAttendanceQrPayload(payload, {
  ...input,
  now,
  allowedOrigins: ["http://localhost:3000"],
});
assert.strictEqual(validSameTime, true, "Payload harus valid pada waktu yang sama");

// 2. Validasi toleransi 1 rotation window (bucket - 1) -> 27 detik kemudian saat QR display berpindah
const laterWithinGrace = now + ATTENDANCE_QR_ROTATION_MS + 2000;
const validWithGrace = validateAttendanceQrPayload(payload, {
  ...input,
  now: laterWithinGrace,
  allowedOrigins: ["http://localhost:3000"],
});
assert.strictEqual(validWithGrace, true, "Payload harus tetap diterima dengan toleransi 1 bucket");

// 3. QR yang terlalu lama (> 2 rotasi / >50s) harus ditolak
const tooLate = now + (ATTENDANCE_QR_ROTATION_MS * 2) + 5000;
const invalidExpired = validateAttendanceQrPayload(payload, {
  ...input,
  now: tooLate,
  allowedOrigins: ["http://localhost:3000"],
});
assert.strictEqual(invalidExpired, false, "QR kadaluarsa lebih dari 2 rotasi harus ditolak");

// 4. Toleransi origin 127.0.0.1 vs localhost
const validCrossLocalhost = validateAttendanceQrPayload(payload, {
  ...input,
  now,
  host: "127.0.0.1:3000",
  allowedOrigins: ["http://127.0.0.1:3000"],
});
assert.strictEqual(validCrossLocalhost, true, "Localhost dan 127.0.0.1 harus saling kompatibel");

console.log("Semua unit assertion test rotating QR lolos 100%!");
