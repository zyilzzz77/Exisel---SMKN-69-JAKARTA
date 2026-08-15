import { NextResponse } from "next/server";
import { getAuthenticatedSessionUser } from "@/lib/auth/authorization";
import { getStudentStatusDestination } from "@/lib/auth/student-status";
import { getPrisma } from "@/lib/database/prisma";
import { studentRegistrationSchema } from "@/lib/student/registration";

export const dynamic = "force-dynamic";

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const requestOrigin = new URL(request.url).origin;
  let configuredOrigin = requestOrigin;

  try {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      configuredOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
    }
  } catch {
    // A malformed optional public URL must not turn registration into a 500.
    // Falling back to the actual request origin still keeps the check strict.
  }

  return origin === requestOrigin || origin === configuredOrigin;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }

  const user = await getAuthenticatedSessionUser("STUDENT");
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  if (!user.isActive || !["INCOMPLETE", "REJECTED"].includes(user.status)) {
    return NextResponse.json(
      {
        error: "INVALID_ACCOUNT_STATE",
        redirectTo: user.isActive
          ? getStudentStatusDestination(user.status)
          : "/suspended",
      },
      { status: 409 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = studentRegistrationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const changed = await getPrisma().user.updateMany({
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

    if (changed.count !== 1) {
      return NextResponse.json(
        { error: "INVALID_ACCOUNT_STATE" },
        { status: 409 },
      );
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "DUPLICATE_NIS" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "REGISTRATION_UNAVAILABLE" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { status: "PENDING", redirectTo: "/pending" },
    { status: 201 },
  );
}
