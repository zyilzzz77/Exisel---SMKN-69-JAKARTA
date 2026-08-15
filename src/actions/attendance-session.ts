"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/database/prisma";
import { getJakartaDateKey, toDatabaseDate } from "@/lib/school-date";

const sessionSchema = z.object({
  extracurricularId: z.string().uuid("Ekskul tidak valid."),
});

export type AttendanceSessionState = {
  status: "idle" | "success" | "error";
  message: string;
  expiresAt?: string;
};

const SESSION_SAFETY_LIMIT_MS = 24 * 60 * 60 * 1_000;

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

  const admin = await getActiveSessionUser("ADMIN");
  if (!admin) {
    return { status: "error", message: "Sesi admin berakhir. Silakan login kembali." };
  }

  const dateKey = getJakartaDateKey();
  const attendanceDate = toDatabaseDate(dateKey);
  const prisma = getPrisma();

  try {
    const program = await prisma.extracurricular.findFirst({
      where: {
        id: parsed.data.extracurricularId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!program) {
      return {
        status: "error",
        message: "Ekskul tidak ditemukan atau sedang tidak aktif.",
      };
    }
    const expiresAt = new Date(Date.now() + SESSION_SAFETY_LIMIT_MS);
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
        message: `Sesi QR ${program.name} masih aktif. Tekan Selesai sebelum membuat sesi baru.`,
      };
    }

    const code = randomBytes(6).toString("hex");
    await prisma.attendanceSession.upsert({
      where: {
        extracurricularId_sessionDate: {
          extracurricularId: program.id,
          sessionDate: attendanceDate,
        },
      },
      create: {
        extracurricularId: program.id,
        createdById: admin.id,
        sessionDate: attendanceDate,
        code,
        expiresAt,
      },
      update: {
        createdById: admin.id,
        code,
        expiresAt,
      },
    });

    revalidatePath(`/admin/esktrakulikuler/${slugify(program.name)}`);
    revalidatePath("/admin/laporan");
    revalidatePath("/kehadiran");
    return {
      status: "success",
      message: `QR absensi ${program.name} aktif. Tekan Selesai setelah absensi selesai.`,
    };
  } catch {
    return {
      status: "error",
      message: "Sesi QR belum dapat dibuat. Pastikan database aktif lalu coba lagi.",
    };
  }
}

export async function finishAttendanceSessionAction(
  _previousState: AttendanceSessionState,
  formData: FormData,
): Promise<AttendanceSessionState> {
  const parsed = sessionSchema.safeParse({
    extracurricularId: formData.get("extracurricularId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Ekskul tidak valid." };
  }

  if (!(await getActiveSessionUser("ADMIN"))) {
    return { status: "error", message: "Sesi admin berakhir. Silakan login kembali." };
  }

  const dateKey = getJakartaDateKey();
  const attendanceDate = toDatabaseDate(dateKey);
  const prisma = getPrisma();

  try {
    const program = await prisma.extracurricular.findFirst({
      where: { id: parsed.data.extracurricularId, isActive: true },
      select: { id: true, name: true },
    });
    if (!program) {
      return { status: "error", message: "Ekskul tidak ditemukan atau sedang tidak aktif." };
    }

    const result = await prisma.attendanceSession.updateMany({
      where: {
        extracurricularId: program.id,
        sessionDate: attendanceDate,
        expiresAt: { gt: new Date() },
      },
      data: {
        code: randomBytes(6).toString("hex"),
        expiresAt: new Date(),
      },
    });

    revalidatePath(`/admin/esktrakulikuler/${slugify(program.name)}`);
    revalidatePath("/admin/laporan");
    revalidatePath("/kehadiran");

    return result.count > 0
      ? { status: "success", message: `Sesi ${program.name} selesai. QR lama sudah kedaluwarsa dan sesi baru dapat dibuat.` }
      : { status: "error", message: `Tidak ada sesi QR ${program.name} yang sedang aktif.` };
  } catch {
    return { status: "error", message: "Sesi QR belum dapat diselesaikan. Coba lagi." };
  }
}
