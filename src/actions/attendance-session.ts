"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";
import {
  formatTimestampTime,
  getJakartaDateKey,
  getSchoolDay,
  toDatabaseDate,
} from "@/lib/school-date";

const sessionSchema = z.object({
  extracurricularId: z.string().uuid("Ekskul tidak valid."),
});

export type AttendanceSessionState = {
  status: "idle" | "success" | "error";
  message: string;
  code?: string;
  expiresAt?: string;
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sessionExpiry(dateKey: string, endTime: string) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(endTime);
  if (!match) return null;

  const [, hour, minute, second = "00"] = match;
  const expiry = new Date(`${dateKey}T${hour}:${minute}:${second}.000+07:00`);
  if (Number.isNaN(expiry.getTime())) return null;

  expiry.setUTCMinutes(expiry.getUTCMinutes() + 15);
  return expiry;
}

export async function generateAttendanceSessionAction(
  _previousState: AttendanceSessionState,
  formData: FormData,
): Promise<AttendanceSessionState> {
  const parsed = sessionSchema.safeParse({
    extracurricularId: formData.get("extracurricularId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Ekskul tidak valid." };
  }

  const session = await readSession();
  if (!session || session.role !== "ADMIN") {
    return { status: "error", message: "Sesi admin berakhir. Silakan login kembali." };
  }

  const dateKey = getJakartaDateKey();
  const day = getSchoolDay(dateKey);
  const attendanceDate = toDatabaseDate(dateKey);
  const prisma = getPrisma();

  try {
    const program = await prisma.extracurricular.findFirst({
      where: {
        id: parsed.data.extracurricularId,
        isActive: true,
        schedules: { some: { day } },
      },
      select: {
        id: true,
        name: true,
        schedules: {
          where: { day },
          orderBy: { endTime: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    });

    const scheduleId = program?.schedules[0]?.id;
    if (!program || !scheduleId) {
      return {
        status: "error",
        message: "Ekskul ini tidak memiliki jadwal kegiatan hari ini.",
      };
    }

    // Prisma's PostgreSQL adapter currently normalizes TIME columns as Date
    // values inconsistently. Read the TIME value as text so 17:00 remains
    // 17:00 when combined with today's Jakarta date.
    const scheduleTimes = await prisma.$queryRaw<Array<{ endTime: string }>>`
      SELECT "end_time"::text AS "endTime"
      FROM "schedules"
      WHERE "id" = CAST(${scheduleId} AS uuid)
      LIMIT 1
    `;
    const expiresAt = scheduleTimes[0]?.endTime
      ? sessionExpiry(dateKey, scheduleTimes[0].endTime)
      : null;

    if (!expiresAt) {
      return {
        status: "error",
        message: "Waktu selesai kegiatan tidak valid. Periksa jadwal ekskul.",
      };
    }

    if (expiresAt.getTime() <= Date.now()) {
      return {
        status: "error",
        message: `Sesi ${program.name} sudah berakhir pada ${formatTimestampTime(expiresAt)} dan tidak dapat dibuat ulang hari ini.`,
      };
    }
    const existing = await prisma.attendanceSession.findUnique({
      where: {
        extracurricularId_sessionDate: {
          extracurricularId: program.id,
          sessionDate: attendanceDate,
        },
      },
      select: { code: true, expiresAt: true },
    });

    if (existing && existing.expiresAt.getTime() > Date.now()) {
      return {
        status: "success",
        code: existing.code,
        expiresAt: formatTimestampTime(existing.expiresAt),
        message: `Kode ${program.name} masih aktif sampai ${formatTimestampTime(existing.expiresAt)}.`,
      };
    }

    const code = String(randomInt(100000, 1000000));
    await prisma.attendanceSession.upsert({
      where: {
        extracurricularId_sessionDate: {
          extracurricularId: program.id,
          sessionDate: attendanceDate,
        },
      },
      create: {
        extracurricularId: program.id,
        createdById: session.userId,
        sessionDate: attendanceDate,
        code,
        expiresAt,
      },
      update: {
        createdById: session.userId,
        code,
        expiresAt,
      },
    });

    revalidatePath(`/admin/esktrakulikuler/${slugify(program.name)}`);
    revalidatePath("/admin/laporan");
    revalidatePath("/kehadiran");
    return {
      status: "success",
      code,
      expiresAt: formatTimestampTime(expiresAt),
      message: `Kode ${program.name} aktif sampai ${formatTimestampTime(expiresAt)}.`,
    };
  } catch {
    return {
      status: "error",
      message: "Kode belum dapat dibuat. Pastikan database aktif lalu coba lagi.",
    };
  }
}
