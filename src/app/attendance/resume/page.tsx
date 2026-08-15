import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AttendanceResumeView } from "@/components/attendance/attendance-resume-view";
import { readSession } from "@/lib/auth/session";
import { getStudentStatusDestination } from "@/lib/auth/student-status";
import { getPrisma } from "@/lib/database/prisma";

export const metadata: Metadata = {
  title: "Selesaikan Absensi — EXISEL",
};

export const dynamic = "force-dynamic";

export default async function AttendanceResumePage() {
  const session = await readSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const user = await getPrisma().user.findFirst({
    where: { id: session.userId, role: "STUDENT" },
    select: { id: true, status: true, isActive: true },
  });

  if (!user) redirect("/login");

  if (!user.isActive || user.status !== "APPROVED") {
    redirect(getStudentStatusDestination(user.status));
  }

  return <AttendanceResumeView />;
}