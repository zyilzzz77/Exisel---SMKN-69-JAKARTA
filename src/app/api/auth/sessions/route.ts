import { NextResponse } from "next/server";
import {
  readSession,
  getUserActiveSessions,
  revokeSessionById,
  revokeAllUserSessions,
  deleteSession,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentSession = await readSession();

  if (!currentSession) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sessions = await getUserActiveSessions(currentSession.userId);

  const formattedSessions = sessions.map((s) => ({
    id: s.id,
    deviceName: s.deviceName ?? "Perangkat Tidak Dikenal",
    ipAddress: s.ipAddress ?? "-",
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    lastSeenAt: (s.lastSeenAt ?? s.createdAt).toISOString(),
    isCurrent: s.id === currentSession.sessionId,
    createdBy: s.createdBy,
  }));

  return NextResponse.json(
    {
      sessions: formattedSessions,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function DELETE(request: Request) {
  const currentSession = await readSession();

  if (!currentSession) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let sessionId: string | null = null;
  let revokeAll = false;

  try {
    const body = await request.json().catch(() => ({}));
    sessionId = body.sessionId ?? null;
    revokeAll = Boolean(body.all);
  } catch {
    // Ignore JSON parse error
  }

  const url = new URL(request.url);
  if (!sessionId) {
    sessionId = url.searchParams.get("sessionId");
  }
  if (url.searchParams.get("all") === "true") {
    revokeAll = true;
  }

  if (revokeAll) {
    await revokeAllUserSessions(currentSession.userId);
    await deleteSession();
    return NextResponse.json({ success: true, message: "Semua sesi dicabut." });
  }

  if (!sessionId) {
    // Revoke current session
    await deleteSession();
    return NextResponse.json({
      success: true,
      message: "Sesi aktif saat ini telah dicabut.",
    });
  }

  const isCurrent = sessionId === currentSession.sessionId;
  await revokeSessionById(currentSession.userId, sessionId);

  if (isCurrent) {
    await deleteSession();
  }

  return NextResponse.json({
    success: true,
    message: "Sesi berhasil dicabut.",
  });
}
