import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/database/prisma";
import { readSession } from "@/lib/auth/session";
import { requireApprovedStudent } from "@/lib/auth/authorization";
import { getStudentStatusDestination } from "@/lib/auth/student-status";
import { reconcilePastAttendances } from "@/lib/attendance/reconcile";
import { getJakartaDateKey, toDatabaseDate } from "@/lib/school-date";

export const verifySession = cache(async () => {
  const session = await readSession();

  if (!session?.userId) {
    redirect("/login");
  }

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const user = await getPrisma().user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      className: true,
      isActive: true,
      status: true,
      mustChangePassword: true,
    },
  });

  if (!user?.isActive) {
    redirect("/login");
  }

  if (user.role === "STUDENT" && user.status !== "APPROVED") {
    redirect(getStudentStatusDestination(user.status));
  }

  return user;
});

export const getStudentDashboard = cache(async () => {
  const approvedStudent = await requireApprovedStudent();
  const dateKey = getJakartaDateKey();
  const attendanceDate = toDatabaseDate(dateKey);
  await reconcilePastAttendances(dateKey);
  const prisma = getPrisma();
  const [user, extracurriculars] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id: approvedStudent.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        className: true,
        isActive: true,
        mustChangePassword: true,
        enrollments: {
          where: {
            status: { in: ["PENDING", "APPROVED"] },
          },
          orderBy: { registeredAt: "desc" },
          select: {
            id: true,
            status: true,
            registeredAt: true,
            extracurricular: {
              select: {
                id: true,
                name: true,
                schedules: {
                  orderBy: { day: "asc" },
                  select: {
                    id: true,
                    day: true,
                    startTime: true,
                    endTime: true,
                    location: true,
                  },
                },
                attendances: {
                  where: {
                    userId: approvedStudent.id,
                    attendanceDate,
                  },
                  select: {
                    status: true,
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    prisma.extracurricular.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        capacity: true,
        schedules: {
          orderBy: { day: "asc" },
          select: {
            day: true,
            startTime: true,
            endTime: true,
            location: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: { in: ["PENDING", "APPROVED"] } },
            },
          },
        },
      },
    }),
  ]);

  if (!user?.isActive || user.role !== "STUDENT") {
    redirect("/login");
  }

  return { user, extracurriculars };
});

export const getPublicExtracurricularData = cache(async () => {
  const session = await readSession();
  const prisma = getPrisma();

  const [extracurriculars, currentUser] = await Promise.all([
    prisma.extracurricular.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        capacity: true,
        schedules: {
          orderBy: { day: "asc" },
          select: {
            id: true,
            day: true,
            startTime: true,
            endTime: true,
            location: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: { in: ["PENDING", "APPROVED"] } },
            },
          },
        },
      },
    }),
    session?.userId
      ? prisma.user.findUnique({
          where: { id: session.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            className: true,
            isActive: true,
            status: true,
            enrollments: {
              where: { status: { in: ["PENDING", "APPROVED"] } },
              select: {
                id: true,
                status: true,
                registeredAt: true,
                extracurricularId: true,
                extracurricular: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        })
      : null,
  ]);

  return {
    extracurriculars,
    user:
      currentUser?.isActive && currentUser.status === "APPROVED"
        ? currentUser
        : null,
  };
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getStudentRegistrationData = cache(
  async (extracurricularId?: string) => {
    const approvedStudent = await requireApprovedStudent();
    const prisma = getPrisma();
    const validExtracurricularId =
      extracurricularId && UUID_PATTERN.test(extracurricularId)
        ? extracurricularId
        : undefined;

    const [user, extracurricular] = await prisma.$transaction([
      prisma.user.findUnique({
        where: { id: approvedStudent.id },
        select: {
          id: true,
          name: true,
          nis: true,
          role: true,
          className: true,
          isActive: true,
          enrollments: {
            where: {
              extracurricularId:
                validExtracurricularId ??
                "00000000-0000-0000-0000-000000000000",
            },
            select: {
              id: true,
              status: true,
              registeredAt: true,
            },
            take: 1,
          },
        },
      }),
      prisma.extracurricular.findFirst({
        where: {
          id:
            validExtracurricularId ??
            "00000000-0000-0000-0000-000000000000",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          capacity: true,
          schedules: {
            orderBy: { day: "asc" },
            select: {
              day: true,
              startTime: true,
              endTime: true,
              location: true,
            },
          },
          _count: {
            select: {
              enrollments: {
                where: { status: { in: ["PENDING", "APPROVED"] } },
              },
            },
          },
        },
      }),
    ]);

    if (!user?.isActive || user.role !== "STUDENT") {
      redirect("/login");
    }

    return {
      user,
      extracurricular,
      enrollment: user.enrollments?.[0] ?? null,
    };
  },
);
