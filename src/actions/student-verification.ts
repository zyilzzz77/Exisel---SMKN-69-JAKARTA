"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import { canTransitionStudentStatus } from "@/lib/auth/student-status";
import { getPrisma } from "@/lib/database/prisma";

const studentIdSchema = z.string().uuid();
const rejectionReasonSchema = z
  .string()
  .trim()
  .min(5, "Alasan penolakan minimal 5 karakter.")
  .max(1000, "Alasan penolakan maksimal 1000 karakter.");

type AdminTransition =
  | {
      from: "PENDING";
      to: "APPROVED";
      action: "STUDENT_APPROVED";
      reason?: never;
    }
  | {
      from: "PENDING";
      to: "REJECTED";
      action: "STUDENT_REJECTED";
      reason: string;
    }
  | {
      from: "APPROVED";
      to: "SUSPENDED";
      action: "STUDENT_SUSPENDED";
      reason?: never;
    }
  | {
      from: "SUSPENDED";
      to: "APPROVED";
      action: "STUDENT_UNSUSPENDED";
      reason?: never;
    };

export type StudentVerificationActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const successMessages: Record<AdminTransition["action"], string> = {
  STUDENT_APPROVED: "Akun siswa berhasil disetujui.",
  STUDENT_REJECTED: "Pendaftaran siswa berhasil ditolak.",
  STUDENT_SUSPENDED: "Akses siswa berhasil ditangguhkan.",
  STUDENT_UNSUSPENDED: "Akses siswa berhasil diaktifkan kembali.",
};

async function applyTransition(
  studentId: string,
  transition: AdminTransition,
): Promise<StudentVerificationActionState> {
  const admin = await getActiveSessionUser("ADMIN");
  if (!admin) redirect("/admin/login");

  if (!canTransitionStudentStatus(transition.from, transition.to)) {
    return {
      status: "error",
      message: "Perubahan status tersebut tidak diizinkan.",
    };
  }

  const now = new Date();
  const data =
    transition.to === "APPROVED" && transition.from === "PENDING"
      ? {
          status: transition.to,
          approvedAt: now,
          approvedById: admin.id,
          rejectionReason: null,
          rejectedAt: null,
          rejectedById: null,
        }
      : transition.to === "REJECTED"
        ? {
            status: transition.to,
            rejectionReason: transition.reason,
            rejectedAt: now,
            rejectedById: admin.id,
            approvedAt: null,
            approvedById: null,
          }
        : { status: transition.to };

  const changed = await getPrisma().$transaction(async (transaction) => {
    const update = await transaction.user.updateMany({
      where: {
        id: studentId,
        role: "STUDENT",
        status: transition.from,
      },
      data,
    });

    if (update.count !== 1) return false;

    await transaction.auditLog.create({
      data: {
        adminId: admin.id,
        targetUserId: studentId,
        action: transition.action,
        metadata: transition.reason ? { reason: transition.reason } : undefined,
      },
    });

    return true;
  });

  if (!changed) {
    return {
      status: "error",
      message:
        "Status siswa sudah berubah, kemungkinan diproses admin lain. Tutup dialog untuk memperbarui data.",
    };
  }

  return {
    status: "success",
    message: successMessages[transition.action],
  };
}

function parsedStudentId(formData: FormData) {
  return studentIdSchema.safeParse(formData.get("studentId"));
}

export async function approveStudentAction(
  _previousState: StudentVerificationActionState,
  formData: FormData,
): Promise<StudentVerificationActionState> {
  const studentId = parsedStudentId(formData);
  if (!studentId.success) {
    return { status: "error", message: "Data siswa tidak valid." };
  }

  return applyTransition(studentId.data, {
    from: "PENDING",
    to: "APPROVED",
    action: "STUDENT_APPROVED",
  });
}

export async function rejectStudentAction(
  _previousState: StudentVerificationActionState,
  formData: FormData,
): Promise<StudentVerificationActionState> {
  const studentId = parsedStudentId(formData);
  const reason = rejectionReasonSchema.safeParse(formData.get("reason"));
  if (!studentId.success || !reason.success) {
    return {
      status: "error",
      message: "Pilih siswa dan isi alasan penolakan minimal 5 karakter.",
    };
  }

  return applyTransition(studentId.data, {
    from: "PENDING",
    to: "REJECTED",
    action: "STUDENT_REJECTED",
    reason: reason.data,
  });
}

export async function suspendStudentAction(
  _previousState: StudentVerificationActionState,
  formData: FormData,
): Promise<StudentVerificationActionState> {
  const studentId = parsedStudentId(formData);
  if (!studentId.success) {
    return { status: "error", message: "Data siswa tidak valid." };
  }

  return applyTransition(studentId.data, {
    from: "APPROVED",
    to: "SUSPENDED",
    action: "STUDENT_SUSPENDED",
  });
}

export async function unsuspendStudentAction(
  _previousState: StudentVerificationActionState,
  formData: FormData,
): Promise<StudentVerificationActionState> {
  const studentId = parsedStudentId(formData);
  if (!studentId.success) {
    return { status: "error", message: "Data siswa tidak valid." };
  }

  return applyTransition(studentId.data, {
    from: "SUSPENDED",
    to: "APPROVED",
    action: "STUDENT_UNSUSPENDED",
  });
}
