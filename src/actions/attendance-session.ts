"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";
import {
  getJakartaDateKey,
  getSchoolDay,
  normalizePrismaJakartaTimestamp,
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

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(value)
    .replace(".", ":");
}

function sessionExpiry(dateKey: string, endTime: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const expiry = new Date(
    `${dateKey}T${pad(endTime.getUTCHours())}:${pad(endTime.getUTCMinutes())}:${pad(
      endTime.getUTCSeconds(),
    )}.000Z`,
  );
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
          select: { endTime: true },
        },
      },
    });

    const endTime = program?.schedules[0]?.endTime;
    if (!program || !endTime) {
      return {
        status: "error",
        message: "Ekskul ini tidak memiliki jadwal kegiatan hari ini.",
      };
    }

    const expiresAt = sessionExpiry(dateKey, endTime);
    if (expiresAt.getTime() <= Date.now()) {
      return {
        status: "error",
        message: `Sesi ${program.name} sudah berakhir pada ${formatTime(expiresAt)} dan tidak dapat dibuat ulang hari ini.`,
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

    const existingExpiresAt = existing
      ? normalizePrismaJakartaTimestamp(existing.expiresAt)
      : null;
    if (existing && existingExpiresAt && existingExpiresAt.getTime() > Date.now()) {
      return {
        status: "success",
        code: existing.code,
        expiresAt: formatTime(existingExpiresAt),
        message: `Kode ${program.name} masih aktif sampai ${formatTime(existingExpiresAt)}.`,
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

    revalidatePath(`/admin/esktrakulikuler/${program.name.toLowerCase().replaceAll(" ", "-")}`);
    revalidatePath("/kehadiran");
    return {
      status: "success",
      code,
      expiresAt: formatTime(expiresAt),
      message: `Kode ${program.name} aktif sampai ${formatTime(expiresAt)}.`,
    };
  } catch {
    return {
      status: "error",
      message: "Kode belum dapat dibuat. Pastikan database aktif lalu coba lagi.",
    };
  }
}
