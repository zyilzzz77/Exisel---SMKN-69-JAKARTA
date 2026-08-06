import "server-only";

import { getPrisma } from "@/lib/database/prisma";
import {
  ATTENDANCE_TRACKING_START_DATE,
  reconcilePastAttendances,
} from "@/lib/attendance/reconcile";
import {
  getJakartaDateKey,
  getSchoolDay,
  shiftSchoolDateKey,
  toDatabaseDate,
} from "@/lib/school-date";

export type ReportAttendanceStatus =
  | "PRESENT"
  | "EXCUSED"
  | "ABSENT"
  | "MISSING"
  | "NOT_ENROLLED";

export type AttendanceReportMember = {
  userId: string;
  nis: string | null;
  name: string;
  className: string | null;
  enrolledAt: string;
  statuses: Array<{
    dateKey: string;
    status: ReportAttendanceStatus;
    reason: string | null;
  }>;
  present: number;
  excused: number;
  absent: number;
  missing: number;
  totalAgenda: number;
  attendanceRate: number;
  activityLevel: string;
};

export type AttendanceProgramReport = {
  id: string;
  name: string;
  description: string | null;
  generatedAt: Date;
  throughDate: string;
  agendaDates: string[];
  schedules: Array<{
    day: string;
    startTime: Date;
    endTime: Date;
    location: string;
  }>;
  members: AttendanceReportMember[];
  summary: {
    members: number;
    agenda: number;
    present: number;
    excused: number;
    absent: number;
    missing: number;
    totalExpected: number;
    attendanceRate: number;
  };
};

function getActivityLevel(rate: number, totalAgenda: number) {
  if (totalAgenda === 0) return "Belum ada agenda";
  if (rate >= 0.8) return "Sangat aktif";
  if (rate >= 0.6) return "Aktif";
  if (rate >= 0.4) return "Perlu ditingkatkan";
  return "Perlu perhatian";
}

function buildAgendaDates(
  startDateKey: string,
  throughDateKey: string,
  scheduledDays: Set<string>,
) {
  const dates: string[] = [];
  let cursor = startDateKey;

  while (cursor <= throughDateKey) {
    if (scheduledDays.has(getSchoolDay(cursor))) dates.push(cursor);
    cursor = shiftSchoolDateKey(cursor, 1);
  }

  return dates;
}

export async function getAttendanceProgramReports(programId?: string) {
  const throughDate = getJakartaDateKey();
  await reconcilePastAttendances(throughDate);

  const programs = await getPrisma().extracurricular.findMany({
    where: {
      isActive: true,
      ...(programId ? { id: programId } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      schedules: {
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
        select: {
          day: true,
          startTime: true,
          endTime: true,
          location: true,
        },
      },
      enrollments: {
        where: {
          status: "APPROVED",
          registeredAt: {
            lt: toDatabaseDate(shiftSchoolDateKey(throughDate, 1)),
          },
          user: { role: "STUDENT", isActive: true },
        },
        orderBy: { user: { name: "asc" } },
        select: {
          userId: true,
          registeredAt: true,
          user: {
            select: {
              nis: true,
              name: true,
              className: true,
            },
          },
        },
      },
      attendances: {
        where: {
          attendanceDate: {
            gte: toDatabaseDate(ATTENDANCE_TRACKING_START_DATE),
            lte: toDatabaseDate(throughDate),
          },
          user: { role: "STUDENT", isActive: true },
        },
        select: {
          userId: true,
          attendanceDate: true,
          status: true,
          reason: true,
        },
      },
    },
  });

  return programs.map((program): AttendanceProgramReport => {
    const earliestEnrollment = program.enrollments.reduce<string | null>(
      (earliest, enrollment) => {
        const enrolledAt = getJakartaDateKey(enrollment.registeredAt);
        if (!earliest || enrolledAt < earliest) return enrolledAt;
        return earliest;
      },
      null,
    );
    const reportStart =
      earliestEnrollment && earliestEnrollment > ATTENDANCE_TRACKING_START_DATE
        ? earliestEnrollment
        : ATTENDANCE_TRACKING_START_DATE;
    const scheduledDays = new Set(
      program.schedules.map((schedule) => schedule.day),
    );
    const agendaDates = buildAgendaDates(reportStart, throughDate, scheduledDays);
    const attendanceByMemberDate = new Map(
      program.attendances.map((attendance) => [
        `${attendance.userId}:${getJakartaDateKey(attendance.attendanceDate)}`,
        attendance,
      ]),
    );

    const members = program.enrollments.map((enrollment): AttendanceReportMember => {
      const enrolledAt = getJakartaDateKey(enrollment.registeredAt);
      const statuses = agendaDates.map((dateKey) => {
        if (dateKey < enrolledAt) {
          return {
            dateKey,
            status: "NOT_ENROLLED" as const,
            reason: null,
          };
        }

        const attendance = attendanceByMemberDate.get(
          `${enrollment.userId}:${dateKey}`,
        );
        const status: ReportAttendanceStatus =
          attendance?.status ?? (dateKey < throughDate ? "ABSENT" : "MISSING");

        return {
          dateKey,
          status,
          reason: attendance?.reason ?? null,
        };
      });
      const expectedStatuses = statuses.filter(
        (attendance) => attendance.status !== "NOT_ENROLLED",
      );
      const present = expectedStatuses.filter(
        (attendance) => attendance.status === "PRESENT",
      ).length;
      const excused = expectedStatuses.filter(
        (attendance) => attendance.status === "EXCUSED",
      ).length;
      const absent = expectedStatuses.filter(
        (attendance) => attendance.status === "ABSENT",
      ).length;
      const missing = expectedStatuses.filter(
        (attendance) => attendance.status === "MISSING",
      ).length;
      const totalAgenda = expectedStatuses.length;
      const attendanceRate = totalAgenda > 0 ? present / totalAgenda : 0;

      return {
        userId: enrollment.userId,
        nis: enrollment.user.nis,
        name: enrollment.user.name,
        className: enrollment.user.className,
        enrolledAt,
        statuses,
        present,
        excused,
        absent,
        missing,
        totalAgenda,
        attendanceRate,
        activityLevel: getActivityLevel(attendanceRate, totalAgenda),
      };
    });
    const totalExpected = members.reduce(
      (total, member) => total + member.totalAgenda,
      0,
    );
    const present = members.reduce((total, member) => total + member.present, 0);
    const excused = members.reduce((total, member) => total + member.excused, 0);
    const absent = members.reduce((total, member) => total + member.absent, 0);
    const missing = members.reduce((total, member) => total + member.missing, 0);

    return {
      id: program.id,
      name: program.name,
      description: program.description,
      generatedAt: new Date(),
      throughDate,
      agendaDates,
      schedules: program.schedules,
      members,
      summary: {
        members: members.length,
        agenda: agendaDates.length,
        present,
        excused,
        absent,
        missing,
        totalExpected,
        attendanceRate: totalExpected > 0 ? present / totalExpected : 0,
      },
    };
  });
}
