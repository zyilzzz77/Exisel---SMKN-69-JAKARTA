import "server-only";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/database/prisma";
import { readSession } from "@/lib/auth/session";
import {
  getStudentStatusDestination,
  type StudentStatus,
} from "@/lib/auth/student-status";

type UserRole = "STUDENT" | "ADMIN";

export async function getAuthenticatedSessionUser(requiredRole?: UserRole) {
  const session = await readSession();

  if (!session || (requiredRole && session.role !== requiredRole)) {
    return null;
  }

  return getPrisma().user.findFirst({
    where: {
      id: session.userId,
      ...(requiredRole ? { role: requiredRole } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      isActive: true,
      nis: true,
      className: true,
      rejectionReason: true,
      avatarUrl: true,
    },
  });
}

export async function getActiveSessionUser(requiredRole: UserRole) {
  const user = await getAuthenticatedSessionUser(requiredRole);

  if (
    !user?.isActive ||
    (requiredRole === "STUDENT" && user.status !== "APPROVED")
  ) {
    return null;
  }

  return user;
}

function studentDestination(user: {
  isActive: boolean;
  status: StudentStatus;
}) {
  return user.isActive
    ? getStudentStatusDestination(user.status)
    : "/suspended";
}

export async function requireApprovedStudent() {
  const user = await getAuthenticatedSessionUser("STUDENT");

  if (!user) {
    redirect("/login");
  }

  if (!user.isActive || user.status !== "APPROVED") {
    redirect(studentDestination(user));
  }

  return user;
}

export async function requireStudentStatus(
  allowedStatuses: readonly StudentStatus[],
) {
  const user = await getAuthenticatedSessionUser("STUDENT");

  if (!user) {
    redirect("/login");
  }

  if (!user.isActive) {
    if (allowedStatuses.includes("SUSPENDED")) return user;
    redirect("/suspended");
  }

  if (!allowedStatuses.includes(user.status)) {
    redirect(studentDestination(user));
  }

  return user;
}
