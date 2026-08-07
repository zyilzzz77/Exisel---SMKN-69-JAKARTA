import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const ATTENDANCE_QR_ROTATION_MS = 4_000;
const QR_VERSION = "1";
const QR_PREFIX = "exisel://attendance";

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
}) {
  const now = input.now ?? Date.now();
  const bucket = Math.floor(now / ATTENDANCE_QR_ROTATION_MS);
  const url = new URL(QR_PREFIX);
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
  },
) {
  try {
    const url = new URL(payload);
    if (`${url.protocol}//${url.host}` !== QR_PREFIX) return false;
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
