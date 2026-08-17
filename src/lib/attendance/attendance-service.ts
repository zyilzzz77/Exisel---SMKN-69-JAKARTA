import "server-only";

import { getPrisma } from "@/lib/database/prisma";

export type AttendanceErrorCode =
  | "QR_INVALID"
  | "QR_EXPIRED"
  | "QR_REVOKED"
  | "ATTENDANCE_CLOSED"
  | "LOGIN_REQUIRED"
  | "INTENT_INVALID"
  | "INTENT_EXPIRED"
  | "INTENT_CONSUMED"
  | "ALREADY_ATTENDED"
  | "NOT_EXTRACURRICULAR_MEMBER"
  | "ACCOUNT_DISABLED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

export type ProcessAttendanceResult =
  | {
      status: "success";
      attendanceId: string;
      programName: string;
      checkedInAt: Date;
    }
  | {
      status: "already_attended";
      programName: string;
    }
  | { status: "error"; error: AttendanceErrorCode };

export async function processAttendance(input: {
  userId: string;
  attendanceSessionId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<ProcessAttendanceResult> {
  const prisma = getPrisma();

  try {
    return await prisma.$transaction(async (transaction) => {
      const student = await transaction.user.findFirst({
        where: {
          id: input.userId,
          role: "STUDENT",
          status: "APPROVED",
          isActive: true,
        },
        select: { id: true },
      });

      if (!student) return { status: "error" as const, error: "ACCOUNT_DISABLED" as const };

      const session = await transaction.attendanceSession.findUnique({
        where: { id: input.attendanceSessionId },
        select: {
          id: true,
          expiresAt: true,
          sessionDate: true,
          extracurricular: {
            select: { id: true, name: true, isActive: true },
          },
        },
      });

      if (!session || session.extracurricular.isActive !== true) {
        return { status: "error" as const, error: "ATTENDANCE_CLOSED" as const };
      }

      const now = Date.now();
      if (session.expiresAt.getTime() <= now) {
        return { status: "error" as const, error: "ATTENDANCE_CLOSED" as const };
      }

      const enrollment = await transaction.enrollment.findFirst({
        where: {
          userId: input.userId,
          extracurricularId: session.extracurricular.id,
          status: "APPROVED",
        },
        select: { userId: true, extracurricularId: true },
      });

      if (!enrollment) {
        return {
          status: "error" as const,
          error: "NOT_EXTRACURRICULAR_MEMBER" as const,
        };
      }

      const existing = await transaction.attendance.findUnique({
        where: {
          userId_extracurricularId_attendanceDate: {
            userId: input.userId,
            extracurricularId: session.extracurricular.id,
            attendanceDate: session.sessionDate,
          },
        },
        select: { id: true },
      });

      if (existing) {
        return {
          status: "already_attended" as const,
          programName: session.extracurricular.name,
        };
      }

      const record = await transaction.attendance.create({
        data: {
          userId: input.userId,
          extracurricularId: session.extracurricular.id,
          attendanceDate: session.sessionDate,
          status: "PRESENT",
          attendanceMethod: "QR",
          attendanceSessionId: session.id,
          checkedInAt: new Date(now),
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
        select: { id: true },
      });

      return {
        status: "success" as const,
        attendanceId: record.id,
        programName: session.extracurricular.name,
        checkedInAt: new Date(now),
      };
    });
  } catch (error) {
    const isUniqueViolation =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002";

    if (isUniqueViolation) {
      return { status: "already_attended", programName: "" };
    }

    // Unexpected failure: map to INTERNAL_ERROR (never QR_INVALID) so the
    // route returns 500 with a requestId for tracing, matching the shared
    // Go/Next error contract.
    console.error("Gagal memproses kehadiran:", error);
    return { status: "error", error: "INTERNAL_ERROR" };
  }
}