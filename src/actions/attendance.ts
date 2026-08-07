"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";
import { validateAttendanceQrPayload } from "@/lib/attendance/rotating-qr";
import {
  getJakartaDateKey,
  getSchoolDay,
  normalizePrismaJakartaTimestamp,
  toDatabaseDate,
} from "@/lib/school-date";

const attendanceSchema = z
  .object({
    extracurricularId: z.string().uuid("Ekskul tidak valid."),
    status: z.enum(["PRESENT", "EXCUSED"], {
      message: "Pilih Hadir atau Izin.",
    }),
    attendanceToken: z.string().trim().max(512, "QR kehadiran tidak valid."),
    reason: z.string().trim().max(500, "Alasan maksimal 500 karakter."),
  })
  .superRefine((value, context) => {
    if (value.status === "PRESENT" && !value.attendanceToken) {
      context.addIssue({
        code: "custom",
        path: ["attendanceToken"],
        message: "Pindai QR kehadiran terbaru dari admin/guru.",
      });
    }

    if (value.status === "EXCUSED" && value.reason.length < 5) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Alasan izin minimal 5 karakter.",
      });
    }
  });

export type AttendanceState = {
  status: "idle" | "success" | "alreadySubmitted" | "error" | "unavailable";
  message: string;
  errors?: {
    extracurricularId?: string[];
    status?: string[];
    attendanceToken?: string[];
    reason?: string[];
  };
};

export async function submitAttendanceAction(
  _previousState: AttendanceState,
  formData: FormData,
): Promise<AttendanceState> {
  const parsed = attendanceSchema.safeParse({
    extracurricularId: formData.get("extracurricularId"),
    status: formData.get("status"),
    attendanceToken: formData.get("attendanceToken") ?? "",
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Periksa status, QR kehadiran, atau alasan izin.",
      errors: {
        extracurricularId: errors.extracurricularId,
        status: errors.status,
        attendanceToken: errors.attendanceToken,
        reason: errors.reason,
      },
    };
  }

  const session = await readSession();
  if (!session || session.role !== "STUDENT") {
    return {
      status: "error",
      message: "Sesi siswa berakhir. Silakan login kembali.",
    };
  }

  const dateKey = getJakartaDateKey();
  const attendanceDate = toDatabaseDate(dateKey);
  const day = getSchoolDay(dateKey);
  const prisma = getPrisma();

  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const enrollment = await transaction.enrollment.findFirst({
        where: {
          userId: session.userId,
          extracurricularId: parsed.data.extracurricularId,
          status: "APPROVED",
          user: { role: "STUDENT", isActive: true },
          extracurricular: {
            isActive: true,
            schedules: { some: { day } },
          },
        },
        select: {
          userId: true,
          extracurricularId: true,
        },
      });

      if (!enrollment) return "ineligible" as const;

      const existingAttendance = await transaction.attendance.findUnique({
        where: {
          userId_extracurricularId_attendanceDate: {
            userId: enrollment.userId,
            extracurricularId: enrollment.extracurricularId,
            attendanceDate,
          },
        },
        select: { id: true },
      });

      if (existingAttendance) return "duplicate" as const;

      if (parsed.data.status === "PRESENT") {
        const sessionCode = await transaction.attendanceSession.findUnique({
          where: {
            extracurricularId_sessionDate: {
              extracurricularId: enrollment.extracurricularId,
              sessionDate: attendanceDate,
            },
          },
          select: { code: true, expiresAt: true },
        });

        if (
          !sessionCode ||
          normalizePrismaJakartaTimestamp(sessionCode.expiresAt).getTime() <
            Date.now() ||
          !validateAttendanceQrPayload(parsed.data.attendanceToken, {
            extracurricularId: enrollment.extracurricularId,
            dateKey,
            sessionNonce: sessionCode.code,
          })
        ) {
          return "invalidCode" as const;
        }
      }

      await transaction.attendance.create({
        data: {
          userId: enrollment.userId,
          extracurricularId: enrollment.extracurricularId,
          attendanceDate,
          status: parsed.data.status,
          reason: parsed.data.status === "EXCUSED" ? parsed.data.reason : null,
        },
      });

      return "created" as const;
    });

    if (outcome === "ineligible") {
      return {
        status: "error",
        message:
          "Kehadiran hanya dapat diisi untuk ekskul aktif yang terjadwal hari ini.",
      };
    }

    if (outcome === "duplicate") {
      return {
        status: "alreadySubmitted",
        message:
          "Kehadiran hari ini sudah pernah disubmit dan tidak dapat diubah.",
      };
    }

    if (outcome === "invalidCode") {
      return {
        status: "error",
        message:
          "QR sudah berganti atau tidak valid. Arahkan kamera ke QR terbaru; pemindai akan mencoba kembali otomatis.",
        errors: { attendanceToken: ["QR tidak valid atau sudah kedaluwarsa."] },
      };
    }
  } catch {
    const existingAttendance = await prisma.attendance
      .findUnique({
        where: {
          userId_extracurricularId_attendanceDate: {
            userId: session.userId,
            extracurricularId: parsed.data.extracurricularId,
            attendanceDate,
          },
        },
        select: { id: true },
      })
      .catch(() => null);

    if (existingAttendance) {
      return {
        status: "alreadySubmitted",
        message:
          "Kehadiran hari ini sudah pernah disubmit dan tidak dapat diubah.",
      };
    }

    return {
      status: "unavailable",
      message: "Kehadiran belum dapat disimpan. Coba kembali beberapa saat lagi.",
    };
  }

  revalidatePath("/kehadiran");
  revalidatePath("/admin/dashboard");

  return {
    status: "success",
    message: "Kehadiran tersimpan dan sudah dapat dilihat admin/guru.",
  };
}
