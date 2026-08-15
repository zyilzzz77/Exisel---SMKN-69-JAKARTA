import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const ATTENDANCE_QR_ROTATION_MS = 15_000;
const QR_VERSION = "1";

function qrBaseUrl(host?: string | null) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured;
  if (host) return `http://${host}`;
  return "http://localhost:3000";
}

function qrScanOrigin(host?: string | null) {
  try {
    return new URL(qrBaseUrl(host)).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function qrScanPath() {
  return "/attendance/scan";
}

function signingKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET minimal 32 karakter belum dikonfigurasi.");
  }
  return secret;
}

function signature(input: {
  extracurricularId: string;
  dateKey: string;
  bucket: number;
  sessionNonce: string;
}) {
  const message = [
    QR_VERSION,
    input.extracurricularId,
    input.dateKey,
    input.bucket,
    input.sessionNonce,
  ].join(".");

  return createHmac("sha256", signingKey())
    .update(message)
    .digest("base64url");
}

export function createAttendanceQrPayload(input: {
  extracurricularId: string;
  dateKey: string;
  sessionNonce: string;
  now?: number;
  baseUrl?: string;
  host?: string | null;
}) {
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

export function validateAttendanceQrPayload(
  payload: string,
  input: {
    extracurricularId: string;
    dateKey: string;
    sessionNonce: string;
    now?: number;
    allowedOrigins?: string[];
    host?: string | null;
  },
) {
  try {
    const url = new URL(payload);
    const allowedOrigins = new Set<string>([
      qrScanOrigin(input.host),
      ...(input.allowedOrigins ?? []),
    ]);
    if (!allowedOrigins.has(url.origin)) return false;
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
    const currentBucket = Math.floor(
      (input.now ?? Date.now()) / ATTENDANCE_QR_ROTATION_MS,
    );
    if (!Number.isSafeInteger(bucket) || bucket !== currentBucket) return false;

    const expected = signature({ ...input, bucket });
    return timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expected));
  } catch {
    return false;
  }
}