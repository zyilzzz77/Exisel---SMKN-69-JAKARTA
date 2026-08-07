import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import {
  ATTENDANCE_QR_ROTATION_MS,
  createAttendanceQrPayload,
} from "@/lib/attendance/rotating-qr";
import { getPrisma } from "@/lib/database/prisma";
import { getJakartaDateKey, toDatabaseDate } from "@/lib/school-date";

export const dynamic = "force-dynamic";

const querySchema = z.string().uuid();

export async function GET(request: Request) {
  const session = await readSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Tidak terautentikasi." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("extracurricularId");
  const parsedId = querySchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ message: "Ekskul tidak valid." }, { status: 400 });
  }

  const dateKey = getJakartaDateKey();
  const attendanceSession = await getPrisma().attendanceSession.findUnique({
    where: {
      extracurricularId_sessionDate: {
        extracurricularId: parsedId.data,
        sessionDate: toDatabaseDate(dateKey),
      },
    },
    select: { code: true, expiresAt: true },
  });

  if (!attendanceSession || attendanceSession.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ message: "Sesi QR belum aktif atau sudah berakhir." }, { status: 404 });
  }

  const qr = createAttendanceQrPayload({
    extracurricularId: parsedId.data,
    dateKey,
    sessionNonce: attendanceSession.code,
  });

  return NextResponse.json(
    {
      ...qr,
      rotationMs: ATTENDANCE_QR_ROTATION_MS,
      sessionEndsAt: attendanceSession.expiresAt.toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
