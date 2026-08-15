import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { processAttendance } from "@/lib/attendance/attendance-service";
import { createAttendanceIntent } from "@/lib/attendance/attendance-intent";
import { validateAttendanceQrPayload } from "@/lib/attendance/rotating-qr";
import { checkRateLimit, requestClientIp } from "@/lib/attendance/rate-limit";
import { getPrisma } from "@/lib/database/prisma";
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

function requestOrigin(request: Request): string {
  const host = request.headers.get("host");
  if (host) return `http://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const clientIp = requestClientIp(request);
  const rate = checkRateLimit(`scan:${clientIp}`, SCAN_LIMIT_PER_MINUTE);
  if (!rate.allowed) {
    return NextResponse.json(
      { message: "Terlalu banyak percobaan. Coba lagi sebentar lagi.", error: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Permintaan tidak valid.", error: "QR_INVALID" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "QR kehadiran tidak valid.", error: "QR_INVALID" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const prisma = getPrisma();
  const dateKey = getJakartaDateKey();
  const attendanceDate = toDatabaseDate(dateKey);

  let tokenUrl: URL;
  try {
    tokenUrl = new URL(parsed.data.token);
  } catch {
    return NextResponse.json(
      { message: "QR kehadiran tidak valid.", error: "QR_INVALID" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
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
    normalizePrismaJakartaTimestamp(attendanceSession.expiresAt).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      { message: "Sesi absensi sudah ditutup atau belum aktif.", error: "ATTENDANCE_CLOSED" },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }

  const payloadValid = validateAttendanceQrPayload(parsed.data.token, {
    extracurricularId: attendanceSession.extracurricularId,
    dateKey,
    sessionNonce: attendanceSession.code,
    allowedOrigins: [requestOrigin(request)],
  });

  if (!payloadValid) {
    return NextResponse.json(
      { message: "QR sudah berganti atau tidak valid. Silakan pindai QR terbaru.", error: "QR_EXPIRED" },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }

  const authSession = await readSession();

  if (!authSession) {
    await createAttendanceIntent({
      attendanceSessionId: attendanceSession.id,
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json(
      {
        message: "Silakan login untuk melanjutkan absensi.",
        error: "LOGIN_REQUIRED",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
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
    return NextResponse.json(
      { message: "Akun siswa tidak aktif atau belum disetujui.", error: "ACCOUNT_DISABLED" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
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

  return NextResponse.json(
    { message: "Kehadiran belum dapat disimpan. Coba lagi.", error: outcome.error },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}