import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AttendanceScanView } from "@/components/attendance/attendance-scan-view";
import { readSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";

export const metadata: Metadata = {
  title: "Absensi QR — EXISEL",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttendanceScanPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const headerStore = await headers();
  const host = headerStore.get("host");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    (host ? `http://${host}` : "http://localhost:3000");
  const url = new URL("/attendance/scan", baseUrl);
  for (const key of ["v", "e", "d", "t", "s"]) {
    const value = params[key];
    if (typeof value === "string" && value) url.searchParams.set(key, value);
  }

  const payload = url.toString();

  if (!url.searchParams.get("e") || !url.searchParams.get("s")) {
    redirect("/attendance/error?code=QR_INVALID");
  }

  const session = await readSession();

  if (session) {
    const user = await getPrisma().user.findFirst({
      where: {
        id: session.userId,
        role: "STUDENT",
        status: "APPROVED",
        isActive: true,
      },
      select: { id: true },
    });

    if (!user) {
      redirect("/login");
    }
  }

  return <AttendanceScanView payload={payload} />;
}