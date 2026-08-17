import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { processAttendance } from "@/lib/attendance/attendance-service";
import { createAttendanceIntent } from "@/lib/attendance/attendance-intent";
import { validateAttendanceQrPayload } from "@/lib/attendance/rotating-qr";
import { checkRateLimit, requestClientIp } from "@/lib/attendance/rate-limit";
import { getPrisma } from "@/lib/database/prisma";
import { coreFetch } from "@/lib/core-api/client";
import {
  getJakartaDateKey,
  normalizePrismaJakartaTimestamp,
  toDatabaseDate,
} from "@/lib/school-date";

export const dynamic = "force-dynamic";

const SCAN_LIMIT_PER_MINUTE = 20;

const scanSchema = z.object({
  token: z.string().trim().max(512, "QR kehadiran tidak valid."),
});

// Shared attendance error contract: { message, error: CODE } with these codes.
// Keep in sync with backend-go/internal/attendance error codes.
const UNEXPECTED_ERROR_MESSAGE = "Sistem kehadiran sedang bermasalah.";

function newRequestId(): string {
  return crypto.randomUUID();
}

function jsonErrorResponse(
  message: string,
  error: string,
  status: number,
  requestId?: string,
) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (requestId) headers["X-Request-ID"] = requestId;

  const body: Record<string, string> = { message, error };
  // Reference code in the body is only added for unexpected 5xx.
  if (requestId && status >= 500) body.requestId = requestId;

  return NextResponse.json(body, { status, headers });
}

function requestOrigin(request: Request): string {
  const host = request.headers.get("host");
  if (host) return `http://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const useGo = process.env.USE_GO_ATTENDANCE === "true";

  // Rate limit every scan attempt at the edge of this handler — this must
  // protect the endpoint even when the Go core proxy path is enabled.
  const clientIp = requestClientIp(request);
  const rate = checkRateLimit(`scan:${clientIp}`, SCAN_LIMIT_PER_MINUTE);
  if (!rate.allowed) {
    return jsonErrorResponse(
      "Terlalu banyak percobaan. Coba lagi sebentar lagi.",
      "RATE_LIMITED",
      429,
    );
  }

  if (useGo) {
    try {
      const cloned = request.clone();
      const body = await cloned.json().catch(() => ({}));
      // Forward the request origin so the Go core's QR origin validation
      // matches this handler's (requestOrigin). coreFetch does not propagate
      // Origin by itself; without it, Go validates against an empty origin
      // set and rejects every real QR payload as QR_EXPIRED.
      const forwardedOrigin =
        request.headers.get("origin") ?? requestOrigin(request);
      const coreRes = await coreFetch<{
        message?: string;
        status?: string;
        extracurricularId?: string;
        programName?: string;
        checkedInAt?: string;
      }>("/api/core/v1/attendance/scan", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { origin: forwardedOrigin },
      });

      const isCoreUnavailable =
        coreRes.code === "CORE_UNREACHABLE" ||
        coreRes.code === "GATEWAY_TIMEOUT";

      if (coreRes.ok && coreRes.data) {
        return NextResponse.json(coreRes.data, {
          status: coreRes.status,
          headers: { "Cache-Control": "no-store" },
        });
      }

      // A Go core 5xx (e.g. DATABASE_UNAVAILABLE / INTERNAL_ERROR / panic
      // recovered by Chi) must NEVER be forwarded to the user. Fall back to
      // the Next.js handler so attendance keeps working in degraded state.
      //
      // A Go core 401 (UNAUTHENTICATED) is ALSO routed to the fallback: Go has
      // no attendance-intent concept, but the logged-out Google-Lens deep-link
      // flow (plan §11/§20) must create an intent and return LOGIN_REQUIRED so
      // the QR token survives the OAuth round-trip. Without this, the raw Go
      // 401 would skip the intent and break the resume flow.
      //
      // Every other 4xx business rejection is passed through as-is so
      // deterministic errors (QR_INVALID, QR_EXPIRED, ATTENDANCE_CLOSED,
      // NOT_EXTRACURRICULAR_MEMBER, ACCOUNT_DISABLED) reach the client.
      const shouldFallback =
        isCoreUnavailable || coreRes.status >= 500 || coreRes.status === 401;

      if (!coreRes.ok && !shouldFallback) {
        return jsonErrorResponse(
          coreRes.error ?? UNEXPECTED_ERROR_MESSAGE,
          coreRes.code ?? "INTERNAL_ERROR",
          coreRes.status,
        );
      }

      // coreRes OK-but-no-data or 5xx/unreachable: fall through to the
      // Next.js processAttendance path below.
      if (shouldFallback) {
        console.error(
          "[attendance/scan] Go core degraded; falling back to Next handler",
          {
            status: coreRes.status,
            code: coreRes.code ?? "UNKNOWN",
          },
        );
      }
    } catch (err) {
      // If Go core call itself throws, fall back to Next.js handler.
      console.error(
        "[attendance/scan] Go core proxy error; falling back to Next handler",
        err instanceof Error ? err.message : "unknown",
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErrorResponse("QR kehadiran tidak valid.", "QR_INVALID", 400);
  }

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorResponse("QR kehadiran tidak valid.", "QR_INVALID", 400);
  }

  const prisma = getPrisma();
  const dateKey = getJakartaDateKey();
  const attendanceDate = toDatabaseDate(dateKey);

  let tokenUrl: URL;
  try {
    tokenUrl = new URL(parsed.data.token);
  } catch {
    return jsonErrorResponse("QR kehadiran tidak valid.", "QR_INVALID", 400);
  }
  const extracurricularId = tokenUrl.searchParams.get("e") ?? "";

  const attendanceSession = await prisma.attendanceSession.findUnique({
    where: {
      extracurricularId_sessionDate: {
        extracurricularId,
        sessionDate: attendanceDate,
      },
    },
    select: { id: true, code: true, expiresAt: true, extracurricularId: true },
  });

  if (
    !attendanceSession ||
    normalizePrismaJakartaTimestamp(attendanceSession.expiresAt).getTime() <=
      Date.now()
  ) {
    return jsonErrorResponse(
      "Sesi absensi sudah ditutup atau belum aktif.",
      "ATTENDANCE_CLOSED",
      410,
    );
  }

  const payloadValid = validateAttendanceQrPayload(parsed.data.token, {
    extracurricularId: attendanceSession.extracurricularId,
    dateKey,
    sessionNonce: attendanceSession.code,
    allowedOrigins: [requestOrigin(request)],
  });

  if (!payloadValid) {
    return jsonErrorResponse(
      "QR sudah berganti atau tidak valid. Silakan pindai QR terbaru.",
      "QR_EXPIRED",
      410,
    );
  }

  const authSession = await readSession();

  if (!authSession) {
    await createAttendanceIntent({
      attendanceSessionId: attendanceSession.id,
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return jsonErrorResponse(
      "Silakan login untuk melanjutkan absensi.",
      "LOGIN_REQUIRED",
      401,
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      id: authSession.userId,
      role: "STUDENT",
      status: "APPROVED",
      isActive: true,
    },
    select: { id: true },
  });

  if (!user) {
    return jsonErrorResponse(
      "Akun siswa tidak aktif atau belum disetujui.",
      "ACCOUNT_DISABLED",
      403,
    );
  }

  // Perketat keanggotaan: siswa wajib terdaftar (enrollment APPROVED) pada
  // ekskul yang QR-nya dipindai sebelum boleh absen. Dicek eksplisit di sini
  // dan diulang secara transaksional di processAttendance.
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: user.id,
      extracurricularId: attendanceSession.extracurricularId,
      status: "APPROVED",
    },
    select: { id: true },
  });

  if (!enrollment) {
    return jsonErrorResponse(
      "Kamu belum terdaftar di ekskul ini. Daftar dahulu sebelum bisa absen.",
      "NOT_EXTRACURRICULAR_MEMBER",
      403,
    );
  }

  const outcome = await processAttendance({
    userId: user.id,
    attendanceSessionId: attendanceSession.id,
    ipAddress: clientIp,
    userAgent: request.headers.get("user-agent") || undefined,
  });

  if (outcome.status === "success") {
    return NextResponse.json(
      {
        message: "Kehadiran kamu sudah tercatat.",
        status: "success",
        extracurricularId: attendanceSession.extracurricularId,
        programName: outcome.programName,
        checkedInAt: outcome.checkedInAt.toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (outcome.status === "already_attended") {
    return NextResponse.json(
      {
        message: "Kehadiran kamu sudah tercatat.",
        status: "already_attended",
        extracurricularId: attendanceSession.extracurricularId,
        programName: outcome.programName,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Error shape mapping — must match Go core codes so both systems agree.
  switch (outcome.error) {
    case "ACCOUNT_DISABLED":
      return jsonErrorResponse(
        "Akun siswa tidak aktif atau belum disetujui.",
        "ACCOUNT_DISABLED",
        403,
      );
    case "NOT_EXTRACURRICULAR_MEMBER":
      return jsonErrorResponse(
        "Kamu belum terdaftar di ekskul ini. Daftar dahulu sebelum bisa absen.",
        "NOT_EXTRACURRICULAR_MEMBER",
        403,
      );
    case "QR_EXPIRED":
    case "QR_REVOKED":
      return jsonErrorResponse(
        "QR sudah berganti atau tidak valid. Silakan pindai QR terbaru.",
        "QR_EXPIRED",
        410,
      );
    case "QR_INVALID":
    case "INTENT_INVALID":
      return jsonErrorResponse("QR kehadiran tidak valid.", "QR_INVALID", 400);
    case "INTENT_EXPIRED":
    case "INTENT_CONSUMED":
      return jsonErrorResponse(
        "Sesi absensi sudah ditutup atau belum aktif.",
        "ATTENDANCE_CLOSED",
        410,
      );
    case "ATTENDANCE_CLOSED":
      return jsonErrorResponse(
        "Sesi absensi sudah ditutup atau belum aktif.",
        "ATTENDANCE_CLOSED",
        410,
      );
    case "LOGIN_REQUIRED":
      return jsonErrorResponse(
        "Silakan login untuk melanjutkan absensi.",
        "LOGIN_REQUIRED",
        401,
      );
    case "ALREADY_ATTENDED":
      // Defensive: already_attended is surfaced as success shape above.
      return NextResponse.json(
        {
          message: "Kehadiran kamu sudah tercatat.",
          status: "already_attended",
          extracurricularId: attendanceSession.extracurricularId,
          programName: "",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    case "FORBIDDEN":
      return jsonErrorResponse(
        "Hanya siswa yang dapat melakukan absensi.",
        "FORBIDDEN",
        403,
      );
    default: {
      // Defensive only: exhaustive union means this branch is unreachable.
      // INTERNAL_ERROR: unexpected failure; attach requestId for tracing.
      const requestId = newRequestId();
      console.error("[attendance/scan] INTERNAL_ERROR in processAttendance", {
        requestId,
      });
      return jsonErrorResponse(
        UNEXPECTED_ERROR_MESSAGE,
        "INTERNAL_ERROR",
        500,
        requestId,
      );
    }
  }
}
