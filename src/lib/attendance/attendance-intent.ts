import "server-only";

import { cookies } from "next/headers";
import { getPrisma } from "@/lib/database/prisma";
import {
  ATTENDANCE_INTENT_COOKIE,
  ATTENDANCE_INTENT_TTL_MS,
  generateIntentToken,
  hashIntentToken,
} from "@/lib/attendance/qr-token";

export async function createAttendanceIntent(input: {
  attendanceSessionId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const rawToken = generateIntentToken();
  const prisma = getPrisma();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ATTENDANCE_INTENT_TTL_MS);

  await prisma.attendanceIntent.create({
    data: {
      intentTokenHash: hashIntentToken(rawToken),
      attendanceSessionId: input.attendanceSessionId,
      expiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(ATTENDANCE_INTENT_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.floor(ATTENDANCE_INTENT_TTL_MS / 1_000),
    path: "/",
  });

  return { rawToken, expiresAt };
}

export async function getPendingAttendanceIntent() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ATTENDANCE_INTENT_COOKIE)?.value;

  if (!rawToken || typeof rawToken !== "string" || rawToken.length < 32) {
    return null;
  }

  const intentTokenHash = hashIntentToken(rawToken);
  const prisma = getPrisma();

  try {
    const intent = await prisma.attendanceIntent.findUnique({
      where: { intentTokenHash },
      select: {
        id: true,
        attendanceSessionId: true,
        expiresAt: true,
        consumedAt: true,
      },
    });

    if (!intent) return null;
    const now = Date.now();

    if (intent.consumedAt) return { intent, error: "INTENT_CONSUMED" as const };
    if (intent.expiresAt.getTime() <= now) {
      return { intent, error: "INTENT_EXPIRED" as const };
    }

    return { intent, error: null };
  } catch {
    return null;
  }
}

export async function hasAttendanceIntentCookie() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ATTENDANCE_INTENT_COOKIE)?.value;
  return Boolean(rawToken && rawToken.length >= 32);
}

export async function clearAttendanceIntentCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ATTENDANCE_INTENT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function consumeAttendanceIntent(intentId: string) {
  const prisma = getPrisma();
  const result = await prisma.attendanceIntent.updateMany({
    where: { id: intentId, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await clearAttendanceIntentCookie();
  return result.count > 0;
}