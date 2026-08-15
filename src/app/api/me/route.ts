import { NextResponse } from "next/server";
import { getAuthenticatedSessionUser } from "@/lib/auth/authorization";
import { readSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const [session, user] = await Promise.all([
    readSession(),
    getAuthenticatedSessionUser(),
  ]);

  if (!session || !user) {
    return NextResponse.json(
      { authenticated: false, error: "UNAUTHENTICATED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        nis: user.nis,
        className: user.className,
        avatarUrl: user.avatarUrl,
      },
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
