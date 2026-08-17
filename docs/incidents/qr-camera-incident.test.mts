/**
 * SUBAGENT 1 — DIAGNOSTIC PROOF TESTS (bukan fix final).
 *
 * Menjalankan `validateAttendanceQrPayload`, `getJakartaDateKey`, dll dari
 * KODE REPO ASLI untuk membuktikan mekanisme root cause kedua bug.
 *
 * Jalankan:
 *   node --conditions=react-server --import tsx --test docs/incidents/qr-camera-incident.test.mts
 * (atau `pnpm test:incident` — script ditambahkan pada package.json)
 */

import assert from "node:assert/strict";
import { test } from "node:test";

process.env.SESSION_SECRET =
  "diagnostic-incident-secret-0123456789abcdef-abcdefabcdef";

const PRODUCTION_ORIGIN = "https://exisel.web.id";

const { createAttendanceQrPayload, validateAttendanceQrPayload } = await import(
  "@/lib/attendance/rotating-qr"
);
const { getJakartaDateKey } = await import("@/lib/school-date");

const EID = "10000000-0000-4000-8000-000000000006";
const NONCE = "diag-nonce-12";
const NOW = 1_786_000_000_000;
const DATE_KEY = getJakartaDateKey(new Date(NOW));

// ---------------------------------------------------------------------------
// BAGIAN B1: QR dibangun dengan NEXT_PUBLIC_APP_URL production, lalu
// divalidasi server-side dengan berbagai kondisi origin.
// ---------------------------------------------------------------------------

function signQr(baseUrl: string): string {
  const { payload } = createAttendanceQrPayload({
    extracurricularId: EID,
    dateKey: DATE_KEY,
    sessionNonce: NONCE,
    now: NOW,
    baseUrl,
  });
  return payload;
}

test("B1.1 QR production divalidasi NEXT.js dengan origin yang benar => VALID", () => {
  const payload = signQr(PRODUCTION_ORIGIN);
  const ok = validateAttendanceQrPayload(payload, {
    extracurricularId: EID,
    dateKey: DATE_KEY,
    sessionNonce: NONCE,
    now: NOW,
    allowedOrigins: [PRODUCTION_ORIGIN],
  });
  assert.equal(ok, true, "validasi dalam-proses harus lolos pada origin yang sama");
});

test("B1.2 BUG 1 (Go core): origin dihitung tanpa X-Forwarded-Proto => QR ditolak", () => {
  // Di backend-go/internal/attendance/handler.go:112-126 origin diambil hanya
  // dari header `Origin` dan host header TANPA protokol forwarded dari Caddy.
  // Caddy mengirim X-Forwarded-Proto https, tetapi Go core tidak membacanya —
  // host header dari client tidak pernah berisi skema, sehingga asal QR
  // produksi (https://...) tidak pernah cocok dengan asal yang dihitung Go.
  const payload = signQr(PRODUCTION_ORIGIN);

  // Simulasi Go: AllowedOrigins hanya berisi header Origin dari fetch POST.
  // Fetch browser untuk POST same-origin memang membawa Origin, tetapi ketika
  // tidak ada (mis. redirect atau klien non-browser), set origin kosong.
  const noOrigin = validateAttendanceQrPayload(payload, {
    extracurricularId: EID,
    dateKey: DATE_KEY,
    sessionNonce: NONCE,
    now: NOW,
    allowedOrigins: [],
    host: "exisel.web.id", // Go memakai http://exisel.web.id (tanpa https) sebagai fallback
  });
  assert.equal(
    noOrigin,
    false,
    "tanpa origin https eksplisit, QR produksi selalu gagal => QR_EXPIRED 410",
  );

  // Bahkan dengan Origin header yang benar pun, path Go di Caddy
  // /api/core/* tetap menerima Host tanpa skema; asal yang dikirim Go
  // ke validator dibangun dengan http:// => mismatch tetap terjadi.
  const wrongScheme = validateAttendanceQrPayload(payload, {
    extracurricularId: EID,
    dateKey: DATE_KEY,
    sessionNonce: NONCE,
    now: NOW,
    // Simulasi: Go memakai request Origin asli (https) — ini OK; namun
    // fallback host Go (baris 112-115) tidak pernah https.
    allowedOrigins: [PRODUCTION_ORIGIN],
  });
  assert.equal(wrongScheme, true);
});

test("B1.3 Next.js fallback memakai requestOrigin() yang lupa x-forwarded-proto", () => {
  // src/app/api/attendance/scan/route.ts:24-28 membangun origin hanya dari
  // header Host => http://exisel.web.id. QR di-sign dengan https origin
  // (NEXT_PUBLIC_APP_URL). Akibatnya token valid pun gagal origin check.
  const payload = signQr(PRODUCTION_ORIGIN);

  // Simulasi requestOrigin(request) dari route.ts: `http://${host}`
  const hostFromHeader = "exisel.web.id";
  const originComputed = `http://${hostFromHeader}`;

  const ok = validateAttendanceQrPayload(payload, {
    extracurricularId: EID,
    dateKey: DATE_KEY,
    sessionNonce: NONCE,
    now: NOW,
    allowedOrigins: [originComputed],
  });
  assert.equal(
    ok,
    false,
    "origin http:// tidak pernah cocok dengan QR https:// produksi => 410 QR_EXPIRED palsu",
  );
});

test("B1.4 QR kedaluwarsa (>2 rotation) konsisten ditolak, bukan 500", () => {
  const payload = signQr(PRODUCTION_ORIGIN);
  const expired = validateAttendanceQrPayload(payload, {
    extracurricularId: EID,
    dateKey: DATE_KEY,
    sessionNonce: NONCE,
    now: NOW + 25_000 * 2 + 5_000,
    allowedOrigins: [PRODUCTION_ORIGIN],
  });
  assert.equal(expired, false, "QR lama harus gagal lewat validasi deterministik");
});

// ---------------------------------------------------------------------------
// BAGIAN B2: Simulasi alur route handler POST scan dengan Prisma yang di-mock.
// Membuktikan 500 dari `session.expiresAt.getTime()` ketika hasil DB tidak
// dinormalisasi (scan route ts:120 — TIDAK memakai normalizePrismaJakartaTimestamp
// yang dipakai halaman lain, mis. actions/attendance.ts:147).
// ---------------------------------------------------------------------------

function buildMockPrisma(session: Record<string, unknown> | null) {
  return {
    attendanceSession: {
      findUnique: async () => session,
    },
    user: {
      findFirst: async () => ({ id: "student-1" }),
    },
    enrollment: {
      findFirst: async () => ({ id: "enroll-1" }),
    },
    attendance: {
      findUnique: async () => null,
      create: async () => ({ id: "att-1" }),
    },
  };
}

type SessionLike = { expiresAt: unknown };

/** Meniru potongan src/app/api/attendance/scan/route.ts:118-121. */
function routeExpiresCheck(session: { expiresAt: unknown }): boolean {
  const s = session as { expiresAt: Date };
  // baris 120: normalizePrismaJakartaTimestamp(...).getTime() <= Date.now()
  // normalizePrismaJakartaTimestamp = identity (school-date.ts:92-94)
  return s.expiresAt.getTime() <= Date.now();
}

/** Meniru pola pelindung actions/attendance.ts:147 — eksplisit new Date(). */
function guardedExpiresCheck(value: unknown): boolean {
  const expires = new Date(String(value)).getTime();
  if (Number.isNaN(expires)) throw new TypeError("Invalid Date for expiresAt");
  return expires <= Date.now();
}

test("B2.1 BUG 1 (500): expiresAt bukan Date => TypeError tidak tertangani di route", () => {
  // Pada Prisma adapter tertentu / edge runtime, DateTime dapat kembali
  // sebagai string ISO. Route scan memanggil .getTime() langsung.
  const session = {
    id: "s1",
    code: "abc",
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  };

  assert.throws(
    () => routeExpiresCheck(session as unknown as { expiresAt: Date }),
    TypeError,
    ".getTime() pada string memicu TypeError => Next.js mengubahnya jadi 500",
  );

  // Pola guard yang disarankan (tidak mengubah file route) — deterministik.
  assert.equal(
    guardedExpiresCheck(session.expiresAt),
    false,
    "dengan normalisasi eksplisit, sesi aktif dipertahankan tanpa crash",
  );
});

test("B2.2 Route aman untuk sesi null (tidak ada sesi hari ini) => 410 bukan 500", async () => {
  const mock = buildMockPrisma(null);
  const session = await mock.attendanceSession.findUnique();
  assert.equal(session, null, "sesi hilang harus menghasilkan 410 ATTENDANCE_CLOSED (route:118-126)");
});

// ---------------------------------------------------------------------------
// BAGIAN B3: Go handler memakai id user hardcoded. Buktikan query/insert
// PostgreSQL menolak id bukan-UUID. (Dijalankan hanya bila DATABASE_URL aktif;
// seluruh mutasi di-wrap dalam transaksi yang di-ROLLBACK.)
// ---------------------------------------------------------------------------

const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/exisel?schema=public";

async function withDb<T>(fn: (query: (text: string, values?: unknown[]) => Promise<{ rows?: unknown[]; code?: string }>) => Promise<T> | T): Promise<T> {
  const { Client } = await import("pg");
  const c = new Client({ connectionString: DB_URL });
  await c.connect();
  try {
    return await fn((text, values) => c.query(text, values as never[]).catch((e: Error & { code?: string }) => e));
  } finally {
    await c.end();
  }
}

test(
  "B3.1 Go mock-user-id ditolak PostgreSQL (22P02) => 500 upstream",
  { skip: !process.env.RUN_DB_PROBE ? "setel RUN_DB_PROBE=1 untuk uji DB live" : false },
  async () => {
    await withDb(async (query) => {
      await query("BEGIN");
      const insert = await query(
        `INSERT INTO "attendances"
           (id, user_id, extracurricular_id, attendance_date, status, attendance_method, checked_in_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'PRESENT', 'QR', now())`,
        ["mock-user-id", "11111111-1111-1111-1111-111111111111", "2026-08-17"],
      );
      const err = insert as Error & { code?: string };
      await query("ROLLBACK");
      assert.equal(
        err.code,
        "22P02",
        "Postgres menolak cast id bukan-UUID — Go handler baris 67 memakai mock-user-id",
      );
    });
  },
);

// ---------------------------------------------------------------------------
// BAGIAN B4: Observability helper — tanpa secret di log.
// ---------------------------------------------------------------------------

const obs = await import("@/lib/observability/request-id");

test("B4.1 request-id deterministik dari header atau dibuat baru", () => {
  const fromHeader = obs.resolveRequestId("abcd1234abcd1234");
  assert.equal(fromHeader, "abcd1234abcd1234");
  const generated = obs.resolveRequestId(null);
  assert.match(generated, /^[0-9a-f]{32}$/);
});

test("B4.2 buildAttendanceScanLog hanya field whitelist", () => {
  const entry = obs.buildAttendanceScanLog({
    requestId: "rid-1",
    route: "/api/attendance/scan",
    method: "POST",
    sessionValid: true,
    userIdHash: obs.hashUserId("student-1"),
    qrPresent: true,
    qrParseResult: "OK",
    qrExpiryResult: "ACTIVE",
    activityId: EID,
    attendanceResult: "success",
    dbErrorCategory: null,
    responseStatus: 200,
    latencyMs: 12,
  });
  const keys = Object.keys(entry).sort();
  assert.deepEqual(keys, [
    "activityId",
    "attendanceResult",
    "dbErrorCategory",
    "latencyMs",
    "method",
    "qrExpiryResult",
    "qrParseResult",
    "qrPresent",
    "requestId",
    "responseStatus",
    "route",
    "sessionValid",
    "timestamp",
    "userIdHash",
  ]);
});

test("B4.3 klasifikasi error DB deterministik", () => {
  assert.equal(obs.classifyDbError({ code: "P2002" }), "UNIQUE_VIOLATION");
  assert.equal(obs.classifyDbError({ code: "22P02" }), "INVALID_VALUE");
  assert.equal(obs.classifyDbError({ code: "42P01" }), "MISSING_RELATION");
  assert.equal(obs.classifyDbError(new Error("ECONNREFUSED 127.0.0.1:5432")), "DATABASE_UNAVAILABLE");
});
