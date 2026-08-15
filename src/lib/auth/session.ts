import "server-only";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getPrisma } from "@/lib/database/prisma";
import {
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS,
  MAX_SESSIONS_PER_USER,
  hashSessionToken,
  parseDeviceName,
  resolveCookieSecure,
  type SessionPayload,
  type CreateSessionOptions,
} from "./session-core";

export {
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS,
  MAX_SESSIONS_PER_USER,
  hashSessionToken,
  parseDeviceName,
  type SessionPayload,
  type CreateSessionOptions,
};

function shouldUseSecureCookie() {
  return resolveCookieSecure(
    process.env.SESSION_COOKIE_SECURE,
    process.env.NODE_ENV,
  );
}

export async function createSession(options: CreateSessionOptions) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const prisma = getPrisma();

  let ipAddress = options.ipAddress;
  let userAgent = options.userAgent;

  if (!ipAddress || !userAgent) {
    try {
      const requestHeaders = await headers();
      if (!ipAddress) {
        ipAddress =
          requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          requestHeaders.get("x-real-ip") ||
          undefined;
      }
      if (!userAgent) {
        userAgent = requestHeaders.get("user-agent") || undefined;
      }
    } catch {
      // Headers may be unavailable in some non-request contexts
    }
  }

  const activeSessions = await prisma.session.findMany({
    where: {
      userId: options.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "asc" },
  });

  if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
    const toRevokeCount = activeSessions.length - MAX_SESSIONS_PER_USER + 1;
    const oldestToRevoke = activeSessions
      .slice(0, toRevokeCount)
      .map((s) => s.id);
    await prisma.session.updateMany({
      where: { id: { in: oldestToRevoke } },
      data: { revokedAt: new Date() },
    });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000);
  const deviceName =
    options.deviceName ||
    (userAgent ? parseDeviceName(userAgent) : "Unknown Device");

  const session = await prisma.session.create({
    data: {
      userId: options.userId,
      tokenHash,
      createdAt: now,
      expiresAt,
      lastSeenAt: now,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      deviceName,
      createdBy: options.createdBy || "login",
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax",
    expires: expiresAt,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
    priority: "high",
  });

  return {
    rawToken,
    sessionId: session.id,
    expiresAt,
  };
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!rawToken || typeof rawToken !== "string" || rawToken.length < 32) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);
  const prisma = getPrisma();

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            isActive: true,
            status: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    const now = new Date();

    if (session.revokedAt !== null || session.expiresAt <= now) {
      return null;
    }

    if (!session.user || !session.user.isActive) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
      return null;
    }

    if (
      !session.lastSeenAt ||
      now.getTime() - session.lastSeenAt.getTime() > 15 * 60 * 1000
    ) {
      prisma.session
        .update({
          where: { id: session.id },
          data: { lastSeenAt: now },
        })
        .catch(() => {});
    }

    return {
      userId: session.user.id,
      role: session.user.role,
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString(),
    };
  } catch (error) {
    console.error("Gagal membaca session:", error);
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    try {
      await getPrisma().session.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Ignore errors on logout cleanup
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function revokeAllUserSessions(userId: string) {
  const prisma = getPrisma();
  return prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeSessionById(userId: string, sessionId: string) {
  const prisma = getPrisma();
  return prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getUserActiveSessions(userId: string) {
  const prisma = getPrisma();
  return prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      lastSeenAt: true,
      ipAddress: true,
      deviceName: true,
      createdBy: true,
    },
  });
}

export async function cleanupExpiredSessions() {
  const prisma = getPrisma();
  const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return prisma.session.deleteMany({
    where: {
      expiresAt: { lt: threshold },
    },
  });
}
