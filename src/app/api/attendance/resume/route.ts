import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import { processAttendance } from "@/lib/attendance/attendance-service";
import {
  clearAttendanceIntentCookie,
  consumeAttendanceIntent,
  getPendingAttendanceIntent,
} from "@/lib/attendance/attendance-intent";
import { checkRateLimit, requestClientIp } from "@/lib/attendance/rate-limit";
import { getPrisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";

const RESUME_LIMIT_PER_MINUTE = 10;

export async function POST(request: Request) {
  const clientIp = requestClientIp(request);
  const rate = checkRateLimit(`resume:${clientIp}`, RESUME_LIMIT_PER_MINUTE);
  if (!rate.allowed) {
    return NextResponse.json(
      { message: "Terlalu banyak percobaan. Coba lagi sebentar lagi.", error: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const user = await getActiveSessionUser("STUDENT");
  if (!user) {
    return NextResponse.json(
      { message: "Silakan login untuk melanjutkan.", error: "LOGIN_REQUIRED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const pending = await getPendingAttendanceIntent();
  if (!pending) {
    await clearAttendanceIntentCookie();
    return NextResponse.json(
      { message: "Tidak ada absensi yang tertunda.", error: "NO_PENDING_INTENT" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (pending.error) {
    await clearAttendanceIntentCookie();
    const message =
      pending.error === "INTENT_EXPIRED"
        ? "Waktu menyelesaikan absensi sudah habis. Silakan pindai QR kembali."
        : "Absensi tertunda sudah digunakan. Silakan pindai QR kembali.";
    return NextResponse.json(
      { message, error: pending.error },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }

  const prisma = getPrisma();
  const session = await prisma.attendanceSession.findUnique({
    where: { id: pending.intent.attendanceSessionId },
    select: {
      id: true,
      expiresAt: true,
      extracurricular: { select: { id: true, name: true, isActive: true } },
    },
  });

  if (!session || session.extracurricular.isActive !== true || session.expiresAt.getTime() <= Date.now()) {
    await consumeAttendanceIntent(pending.intent.id);
    return NextResponse.json(
      { message: "Sesi absensi sudah ditutup. Silakan hubungi admin.", error: "ATTENDANCE_CLOSED" },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }

  const userAgent = request.headers.get("user-agent") || undefined;
  const outcome = await processAttendance({
    userId: user.id,
    attendanceSessionId: session.id,
    ipAddress: clientIp,
    userAgent,
  });

  if (outcome.status === "error") {
    return NextResponse.json(
      { message: "Kehadiran belum dapat disimpan. Silakan pindai QR kembali.", error: outcome.error },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }

  await consumeAttendanceIntent(pending.intent.id);

  return NextResponse.json(
    {
      message: "Kehadiran kamu sudah tercatat.",
      status: outcome.status,
      programName: outcome.programName,
      ...(outcome.status === "success"
        ? { checkedInAt: outcome.checkedInAt.toISOString() }
        : {}),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}