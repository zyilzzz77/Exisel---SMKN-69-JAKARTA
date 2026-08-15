"use server";

import { redirect } from "next/navigation";
import {
  getAuthenticatedSessionUser,
  requireStudentStatus,
} from "@/lib/auth/authorization";
import { getStudentStatusDestination } from "@/lib/auth/student-status";
import { getPrisma } from "@/lib/database/prisma";
import { studentRegistrationSchema } from "@/lib/student/registration";

export type StudentRegistrationState = {
  status: "idle" | "success" | "error" | "unavailable";
  message: string;
  redirectTo?: string;
  errors?: {
    name?: string[];
    nis?: string[];
    className?: string[];
  };
};

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function submitStudentRegistrationAction(
  _previousState: StudentRegistrationState,
  formData: FormData,
): Promise<StudentRegistrationState> {
  const parsed = studentRegistrationSchema.safeParse({
    name: formData.get("name"),
    nis: formData.get("nis"),
    className: formData.get("className"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Periksa kembali data siswa yang kamu masukkan.",
      errors: {
        name: errors.name,
        nis: errors.nis,
        className: errors.className,
      },
    };
  }

  const user = await requireStudentStatus(["INCOMPLETE", "REJECTED"]);
  const prisma = getPrisma();

  try {
    const duplicateNis = await prisma.user.findUnique({
      where: { nis: parsed.data.nis },
      select: { id: true },
    });

    if (duplicateNis && duplicateNis.id !== user.id) {
      return {
        status: "error",
        message: "NIS tersebut sudah digunakan akun siswa lain.",
        errors: { nis: ["NIS sudah terdaftar. Hubungi admin jika ini NIS kamu."] },
      };
    }

    const updated = await prisma.user.updateMany({
      where: {
        id: user.id,
        role: "STUDENT",
        status: { in: ["INCOMPLETE", "REJECTED"] },
      },
      data: {
        name: parsed.data.name,
        nis: parsed.data.nis,
        className: parsed.data.className,
        status: "PENDING",
        rejectionReason: null,
        approvedAt: null,
        approvedById: null,
        rejectedAt: null,
        rejectedById: null,
      },
    });

    if (updated.count !== 1) {
      const latest = await getAuthenticatedSessionUser("STUDENT");
      if (latest) redirect(getStudentStatusDestination(latest.status));

      return {
        status: "error",
        message: "Status akun berubah. Silakan login kembali.",
      };
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        status: "error",
        message: "NIS tersebut sudah digunakan akun siswa lain.",
        errors: { nis: ["NIS sudah terdaftar. Hubungi admin jika ini NIS kamu."] },
      };
    }

    return {
      status: "unavailable",
      message: "Data belum dapat dikirim. Coba kembali beberapa saat lagi.",
    };
  }

  return {
    status: "success",
    message: "Data berhasil dikirim dan sedang menunggu verifikasi admin.",
    redirectTo: "/pending",
  };
}

export async function refreshStudentStatusAction() {
  const user = await getAuthenticatedSessionUser("STUDENT");
  if (!user) redirect("/login");

  redirect(
    user.isActive ? getStudentStatusDestination(user.status) : "/suspended",
  );
}
