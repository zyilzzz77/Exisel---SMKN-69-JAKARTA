"use server";

import { createHash } from "node:crypto";
import { hash, verify } from "argon2";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/database/prisma";
import { createSession, deleteSession } from "@/lib/auth/session";

const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Masukkan alamat email yang valid.")
    .max(254, "Email terlalu panjang."),
  password: z
    .string()
    .min(6, "Password minimal terdiri dari 6 karakter.")
    .max(128, "Password maksimal terdiri dari 128 karakter."),
});

export type LoginState = {
  status: "idle" | "error" | "blocked" | "unavailable";
  message: string;
  errors?: {
    email?: string[];
    password?: string[];
  };
};

async function authenticateAction(
  requiredRole: "STUDENT" | "ADMIN",
  redirectTo: string,
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;

    return {
      status: "error",
      message: "Periksa kembali data yang kamu masukkan.",
      errors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    };
  }

  const requestHeaders = await headers();
  const clientAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "local";
  const throttleKey = createHash("sha256")
    .update(`${result.data.email}|${clientAddress}`)
    .digest("hex");

  try {
    const prisma = getPrisma();
    const throttle = await prisma.loginThrottle.findUnique({
      where: { key: throttleKey },
    });

    if (throttle?.blockedUntil && throttle.blockedUntil > new Date()) {
      return {
        status: "blocked",
        message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: result.data.email },
      select: {
        id: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    });

    let passwordValid = false;
    if (user) {
      passwordValid = await verify(user.passwordHash, result.data.password).catch(
        () => false,
      );
    } else {
      await hash(result.data.password, {
        type: 2,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
    }

    if (!user?.isActive || !passwordValid || user.role !== requiredRole) {
      const blockedUntil = await prisma.$transaction(async (transaction) => {
        const current = await transaction.loginThrottle.findUnique({
          where: { key: throttleKey },
        });
        const now = new Date();
        const previousCount =
          current?.blockedUntil && current.blockedUntil <= now
            ? 0
            : (current?.attemptCount ?? 0);
        const attemptCount = previousCount + 1;
        const nextBlockedUntil =
          attemptCount >= MAX_LOGIN_ATTEMPTS
            ? new Date(now.getTime() + BLOCK_DURATION_MS)
            : null;

        await transaction.loginThrottle.upsert({
          where: { key: throttleKey },
          create: {
            key: throttleKey,
            attemptCount,
            blockedUntil: nextBlockedUntil,
            lastAttemptAt: now,
          },
          update: {
            attemptCount,
            blockedUntil: nextBlockedUntil,
            lastAttemptAt: now,
          },
        });

        return nextBlockedUntil;
      });

      return {
        status: blockedUntil ? "blocked" : "error",
        message: blockedUntil
          ? "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
          : "Email atau password tidak sesuai.",
      };
    }

    await prisma.loginThrottle.deleteMany({ where: { key: throttleKey } });
    await createSession({ userId: user.id, role: user.role });
  } catch {
    return {
      status: "unavailable",
      message:
        "Database akun belum dapat diakses. Hubungi admin sekolah atau coba lagi nanti.",
    };
  }

  redirect(redirectTo);
}

export async function loginAction(
  previousState: LoginState,
  formData: FormData,
) {
  return authenticateAction("STUDENT", "/dashboard", previousState, formData);
}

export async function adminLoginAction(
  previousState: LoginState,
  formData: FormData,
) {
  return authenticateAction(
    "ADMIN",
    "/admin/dashboard",
    previousState,
    formData,
  );
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function adminLogoutAction() {
  await deleteSession();
  redirect("/admin/login");
}
