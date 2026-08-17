import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { requireApprovedStudent } from "@/lib/auth/authorization";
import { reconcilePastAttendances } from "@/lib/attendance/reconcile";
import { getAttendanceProgramReports } from "@/lib/attendance/report";
import { getPrisma } from "@/lib/database/prisma";
import {
  formatSchoolDate,
  getJakartaDateKey,
  getSchoolDay,
  isValidDateKey,
  normalizePrismaJakartaTimestamp,
  shiftSchoolDateKey,
  toDatabaseDate,
} from "@/lib/school-date";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const adminStatuses = [
  "ALL",
  "PRESENT",
  "EXCUSED",
  "ABSENT",
  "MISSING",
] as const;
type AdminAttendanceStatus = (typeof adminStatuses)[number];
type AttendanceRowStatus = Exclude<AdminAttendanceStatus, "ALL">;

function isAdminStatus(value: string | undefined): value is AdminAttendanceStatus {
  return adminStatuses.includes(value as AdminAttendanceStatus);
}

export const getStudentAttendanceData = cache(
  async (selectedExtracurricularId?: string) => {
    const student = await requireApprovedStudent();

    const dateKey = getJakartaDateKey();
    await reconcilePastAttendances(dateKey);
    const attendanceDate = toDatabaseDate(dateKey);
    const day = getSchoolDay(dateKey);
    const user = await getPrisma().user.findFirst({
      where: {
        id: student.id,
        role: "STUDENT",
        status: "APPROVED",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        nis: true,
        className: true,
        avatarUrl: true,
        enrollments: {
          where: {
            status: "APPROVED",
            extracurricular: {
              isActive: true,
              OR: [
                { schedules: { some: { day } } },
                {
                  attendanceSessions: {
                    some: {
                      sessionDate: attendanceDate,
                      expiresAt: { gt: new Date() },
                    },
                  },
                },
                {
                  attendances: {
                    some: {
                      userId: student.id,
                      attendanceDate,
                    },
                  },
                },
              ],
            },
          },
          orderBy: { registeredAt: "asc" },
          select: {
            extracurricular: {
              select: {
                id: true,
                name: true,
                description: true,
                schedules: {
                  where: { day },
                  orderBy: { startTime: "asc" },
                  select: {
                    day: true,
                    startTime: true,
                    endTime: true,
                    location: true,
                  },
                },
                attendances: {
                  where: {
                    userId: student.id,
                    attendanceDate,
                  },
                  select: {
                    id: true,
                    status: true,
                    reason: true,
                    submittedAt: true,
                  },
                  take: 1,
                },
                attendanceSessions: {
                  where: {
                    sessionDate: attendanceDate,
                    expiresAt: { gt: new Date() },
                  },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { expiresAt: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      redirect("/login");
    }

    const eligiblePrograms = user.enrollments.map(({ extracurricular }) => ({
      ...extracurricular,
      attendance: extracurricular.attendances[0] ?? null,
      attendanceCodeExpiresAt:
        extracurricular.attendanceSessions[0]?.expiresAt
          ? normalizePrismaJakartaTimestamp(
              extracurricular.attendanceSessions[0].expiresAt,
            )
          : null,
    }));
    const validSelectedId =
      selectedExtracurricularId && UUID_PATTERN.test(selectedExtracurricularId)
        ? selectedExtracurricularId
        : undefined;
    const selectedProgram = validSelectedId
      ? (eligiblePrograms.find((program) => program.id === validSelectedId) ??
        eligiblePrograms[0] ??
        null)
      : (eligiblePrograms[0] ?? null);

    return {
      user,
      dateKey,
      formattedDate: formatSchoolDate(dateKey),
      day,
      eligiblePrograms,
      selectedProgram,
    };
  },
);

export const getAdminAttendanceDashboard = cache(
  async (input: {
    date?: string;
    extracurricularId?: string;
    status?: string;
    search?: string;
  }) => {
    const session = await readSession();

    if (!session || session.role !== "ADMIN") {
      redirect("/admin/login");
    }

    const dateKey = isValidDateKey(input.date)
      ? input.date
      : getJakartaDateKey();
    await reconcilePastAttendances();
    const attendanceDate = toDatabaseDate(dateKey);
    const nextAttendanceDate = toDatabaseDate(shiftSchoolDateKey(dateKey, 1));
    const day = getSchoolDay(dateKey);
    const extracurricularId =
      input.extracurricularId && UUID_PATTERN.test(input.extracurricularId)
        ? input.extracurricularId
        : undefined;
    const selectedStatus = isAdminStatus(input.status) ? input.status : "ALL";
    const search = input.search?.trim().slice(0, 80) ?? "";
    const prisma = getPrisma();

    const [admin, extracurriculars, enrollments, attendances] =
      await prisma.$transaction([
        prisma.user.findFirst({
          where: { id: session.userId, role: "ADMIN", isActive: true },
          select: { id: true, name: true, email: true },
        }),
        prisma.extracurricular.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            schedules: {
              where: { day },
              select: { id: true },
            },
          },
        }),
        prisma.enrollment.findMany({
          where: {
            status: "APPROVED",
            registeredAt: { lt: nextAttendanceDate },
            ...(extracurricularId ? { extracurricularId } : {}),
            user: { role: "STUDENT", isActive: true },
            extracurricular: {
              isActive: true,
              schedules: { some: { day } },
            },
          },
          orderBy: [
            { extracurricular: { name: "asc" } },
            { user: { name: "asc" } },
          ],
          select: {
            userId: true,
            extracurricularId: true,
            user: {
              select: {
                name: true,
                nis: true,
                className: true,
              },
            },
            extracurricular: {
              select: { name: true },
            },
          },
        }),
        prisma.attendance.findMany({
          where: {
            attendanceDate,
            ...(extracurricularId ? { extracurricularId } : {}),
          },
          select: {
            userId: true,
            extracurricularId: true,
            status: true,
            reason: true,
            submittedAt: true,
          },
        }),
      ]);

    if (!admin) {
      redirect("/admin/login");
    }

    const attendanceByEnrollment = new Map(
      attendances.map((attendance) => [
        `${attendance.userId}:${attendance.extracurricularId}`,
        attendance,
      ]),
    );
    const scheduledRows = enrollments.map((enrollment) => {
      const attendance = attendanceByEnrollment.get(
        `${enrollment.userId}:${enrollment.extracurricularId}`,
      );
      const status: AttendanceRowStatus = attendance?.status ?? "MISSING";

      return {
        userId: enrollment.userId,
        extracurricularId: enrollment.extracurricularId,
        studentName: enrollment.user.name,
        nis: enrollment.user.nis,
        className: enrollment.user.className,
        extracurricularName: enrollment.extracurricular.name,
        status,
        reason: attendance?.reason ?? null,
        submittedAt: attendance?.submittedAt ?? null,
      };
    });
    const normalizedSearch = search.toLocaleLowerCase("id-ID");
    const rows = scheduledRows.filter((row) => {
      const matchesStatus =
        selectedStatus === "ALL" || row.status === selectedStatus;
      const matchesSearch =
        !normalizedSearch ||
        [row.studentName, row.nis, row.className, row.extracurricularName]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase("id-ID").includes(normalizedSearch),
          );

      return matchesStatus && matchesSearch;
    });

    return {
      admin,
      dateKey,
      formattedDate: formatSchoolDate(dateKey),
      day,
      extracurriculars,
      selectedExtracurricularId: extracurricularId ?? "ALL",
      selectedStatus,
      search,
      rows,
      stats: {
        scheduled: scheduledRows.length,
        present: scheduledRows.filter((row) => row.status === "PRESENT").length,
        excused: scheduledRows.filter((row) => row.status === "EXCUSED").length,
        absent: scheduledRows.filter((row) => row.status === "ABSENT").length,
        missing: scheduledRows.filter((row) => row.status === "MISSING").length,
      },
    };
  },
);

export const getAdminAttendanceReports = cache(
  async (selectedExtracurricularId?: string) => {
    const session = await readSession();

    if (!session || session.role !== "ADMIN") {
      redirect("/admin/login");
    }

    const [admin, programReports] = await Promise.all([
      getPrisma().user.findFirst({
        where: { id: session.userId, role: "ADMIN", isActive: true },
        select: { id: true, name: true, email: true },
      }),
      getAttendanceProgramReports(),
    ]);

    if (!admin) {
      redirect("/admin/login");
    }

    const requestedProgramId =
      selectedExtracurricularId && UUID_PATTERN.test(selectedExtracurricularId)
        ? selectedExtracurricularId
        : undefined;
    const validProgramId = programReports.some(
      (report) => report.id === requestedProgramId,
    )
      ? requestedProgramId
      : undefined;
    const analyzedReports = validProgramId
      ? programReports.filter((report) => report.id === validProgramId)
      : programReports;
    const students = analyzedReports
      .flatMap((report) =>
        report.members.map((member) => ({
          userId: member.userId,
          extracurricularId: report.id,
          extracurricularName: report.name,
          studentName: member.name,
          nis: member.nis,
          className: member.className,
          present: member.present,
          excused: member.excused,
          absent: member.absent,
          missing: member.missing,
          totalAgenda: member.totalAgenda,
          attendanceRate: member.attendanceRate,
          activityLevel: member.activityLevel,
        })),
      )
      .sort(
        (left, right) =>
          right.attendanceRate - left.attendanceRate ||
          right.present - left.present ||
          left.studentName.localeCompare(right.studentName, "id-ID"),
      );
    const totalExpected = analyzedReports.reduce(
      (total, report) => total + report.summary.totalExpected,
      0,
    );
    const totalPresent = analyzedReports.reduce(
      (total, report) => total + report.summary.present,
      0,
    );

    return {
      admin,
      extracurriculars: programReports.map((report) => ({
        id: report.id,
        name: report.name,
      })),
      selectedExtracurricularId: validProgramId ?? "ALL",
      analytics: {
        summary: {
          memberships: analyzedReports.reduce(
            (total, report) => total + report.summary.members,
            0,
          ),
          agenda: analyzedReports.reduce(
            (total, report) => total + report.summary.agenda,
            0,
          ),
          present: totalPresent,
          excused: analyzedReports.reduce(
            (total, report) => total + report.summary.excused,
            0,
          ),
          absent: analyzedReports.reduce(
            (total, report) => total + report.summary.absent,
            0,
          ),
          attendanceRate: totalExpected > 0 ? totalPresent / totalExpected : 0,
        },
        programs: programReports.map((report) => ({
          id: report.id,
          name: report.name,
          members: report.summary.members,
          agenda: report.summary.agenda,
          present: report.summary.present,
          attendanceRate: report.summary.attendanceRate,
        })),
        students,
      },
    };
  },
);
