/**
 * Observability helper untuk flow kehadiran QR (Subagent 1 — diagnostic phase).
 *
 * Helper ini hanya MEMBANGUN field log; integrasi ke route handler adalah
 * permintaan diff untuk lane A4 (lihat docs/incidents/qr-camera-incident-report.md).
 *
 * Field yang dicatat mengikuti rencana bagian 5:
 *   requestId, route, method, sessionValid, userIdHash, qrPresent,
 *   qrParseResult, qrExpiryResult, activityId, attendanceResult,
 *   dbErrorCategory, responseStatus, latencyMs.
 *
 * PANTANGAN (tidak pernah ditulis ke log, apa pun inputnya):
 *   - raw session token / cookie session
 *   - signature QR mentah (nilai parameter `s`)
 *   - OAuth token (authorization code, id_token, PKCE verifier)
 *   - password
 *   - API key / secret apa pun
 *
 * Implementasi memakai pendekatan WHITELIST: hanya field di tipe
 * AttendanceScanLogInput yang disalin; property ekstra diabaikan.
 */

import { createHash, randomUUID } from "node:crypto";

/** Header request-id yang dipakai seluruh stack (Next.js + Go core). */
export const REQUEST_ID_HEADER = "x-request-id";

const INCOMING_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Ambil request-id dari header masuk bila valid, jika tidak buat yang baru.
 * Selalu menghasilkan id 32 char hex (tanpa `-`) agar aman dipakai sebagai
 * referensi yang boleh ditampilkan ke user ("Kode referensi: <request-id>").
 */
export function resolveRequestId(incomingId?: string | null): string {
  const normalized = typeof incomingId === "string" ? incomingId.trim() : "";
  if (INCOMING_REQUEST_ID_PATTERN.test(normalized)) return normalized;
  return randomUUID().replace(/-/g, "");
}

/**
 * Hash satu-arah untuk userId agar identitas siswa tidak muncul mentah di log.
 * Output 16 karakter hex pertama dari SHA-256 — cukup untuk korelasi antar
 * log satu flow tanpa dapat dibalik menjadi UUID asli.
 */
export function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

/** Kategori error DB untuk keperluan klasifikasi status HTTP (rencana §6). */
export type DbErrorCategory =
  | "UNIQUE_VIOLATION"
  | "RECORD_NOT_FOUND"
  | "FOREIGN_KEY_VIOLATION"
  | "INVALID_VALUE"
  | "MISSING_RELATION"
  | "DATABASE_UNAVAILABLE"
  | "UNKNOWN";

/** Kode error Prisma yang dipetakan ke kategori deterministik. */
const PRISMA_CODE_MAP: Record<string, DbErrorCategory> = {
  P2001: "RECORD_NOT_FOUND",
  P2002: "UNIQUE_VIOLATION",
  P2003: "FOREIGN_KEY_VIOLATION",
  P2011: "FOREIGN_KEY_VIOLATION",
  P2025: "RECORD_NOT_FOUND",
  P1000: "DATABASE_UNAVAILABLE",
  P1001: "DATABASE_UNAVAILABLE",
  P1002: "DATABASE_UNAVAILABLE",
  P1008: "DATABASE_UNAVAILABLE",
  P1017: "DATABASE_UNAVAILABLE",
};

/** SQLSTATE PostgreSQL yang sering muncul dari query raw/Go core. */
const PG_SQLSTATE_MAP: Record<string, DbErrorCategory> = {
  "23505": "UNIQUE_VIOLATION",
  "23503": "FOREIGN_KEY_VIOLATION",
  "23514": "INVALID_VALUE",
  "22P02": "INVALID_VALUE",
  "42P01": "MISSING_RELATION",
  "08006": "DATABASE_UNAVAILABLE",
  "57P03": "DATABASE_UNAVAILABLE",
};

/**
 * Klasifikasikan error DB menjadi kategori deterministik tanpa pernah
 * menyalin pesan mentah error ke log utama. Pesan error tetap boleh
 * dicatat terpisah oleh pemanggil (console.error) selama tidak memuat
 * token/secret — Prisma message untuk P2001/P2002 dsb umumnya aman.
 */
export function classifyDbError(error: unknown): DbErrorCategory {
  if (typeof error !== "object" || error === null) return "UNKNOWN";

  const record = error as { code?: unknown; meta?: unknown };

  if (typeof record.code === "string") {
    const prisma = PRISMA_CODE_MAP[record.code];
    if (prisma) return prisma;
    const sqlstate = PG_SQLSTATE_MAP[record.code];
    if (sqlstate) return sqlstate;
    if (/^P1\d{3}$/.test(record.code)) return "DATABASE_UNAVAILABLE";
    if (/^P2\d{3}$/.test(record.code)) return "INVALID_VALUE";
  }

  const message =
    "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  if (
    /can'?t reach database|connection refused|ECONNREFUSED|connect ETIMEDOUT|pool timed out/i.test(
      message,
    )
  ) {
    return "DATABASE_UNAVAILABLE";
  }

  return "UNKNOWN";
}

/** Hasil parse struktural token QR — TANPA nilai signature mentah. */
export type SafeQrSummary =
  | {
      parse: "OK";
      path: string;
      version: string | null;
      hasActivityParam: boolean;
      dateKey: string | null;
      signatureLength: number;
    }
  | { parse: "MALFORMED_URL" };

/**
 * Parse aman payload QR untuk log. Sengaja TIDAK menyalin nilai parameter
 * `s` (signature) dan `t` (bucket) mentah-mentah; hanya keberadaan + panjang.
 */
export function safeQrSummary(payload: string): SafeQrSummary {
  try {
    const url = new URL(payload);
    return {
      parse: "OK",
      path: url.pathname,
      version: url.searchParams.get("v"),
      hasActivityParam: Boolean(url.searchParams.get("e")),
      dateKey: url.searchParams.get("d"),
      signatureLength: url.searchParams.get("s")?.length ?? 0,
    };
  } catch {
    return { parse: "MALFORMED_URL" };
  }
}

export type QrParseOutcome =
  | "OK"
  | "MALFORMED_URL"
  | "MISSING_PARAMS"
  | "ORIGIN_MISMATCH"
  | "EXPIRED_BUCKET"
  | "SIGNATURE_MISMATCH";

export type QrExpiryOutcome = "ACTIVE" | "EXPIRED" | "NO_SESSION" | "UNKNOWN";

export type AttendanceScanLogInput = {
  requestId: string;
  route: string;
  method: string;
  sessionValid: boolean;
  userIdHash?: string | null;
  qrPresent?: boolean;
  qrParseResult?: QrParseOutcome;
  qrExpiryResult?: QrExpiryOutcome;
  activityId?: string | null;
  attendanceResult?: string | null;
  dbErrorCategory?: DbErrorCategory | null;
  responseStatus: number;
  latencyMs: number;
};

/** Entri log terstruktur; field whitelist, tanpa secret. */
export function buildAttendanceScanLog(
  input: AttendanceScanLogInput,
): Record<string, string | number | boolean | null> {
  return {
    timestamp: new Date().toISOString(),
    requestId: input.requestId,
    route: input.route,
    method: input.method,
    sessionValid: input.sessionValid,
    userIdHash: input.userIdHash ?? null,
    qrPresent: input.qrPresent ?? false,
    qrParseResult: input.qrParseResult ?? null,
    qrExpiryResult: input.qrExpiryResult ?? null,
    activityId: input.activityId ?? null,
    attendanceResult: input.attendanceResult ?? null,
    dbErrorCategory: input.dbErrorCategory ?? null,
    responseStatus: input.responseStatus,
    latencyMs: input.latencyMs,
  };
}

/** Serialisasi satu baris log JSON. */
export function toLogLine(entry: Record<string, string | number | boolean | null>): string {
  return JSON.stringify(entry);
}

/**
 * Ukuran stopwatch sederhana berbasis performance.now() untuk latencyMs.
 */
export function startLatencyTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}
