import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AttendanceResumeView } from "@/components/attendance/attendance-resume-view";
import { hasAttendanceIntentCookie } from "@/lib/attendance/attendance-intent";
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

  const studentSession = session;

  // Kegagalan DB tidak boleh membuat deep-link resume crash/500 — arahkan ke
  // halaman error deterministik (plan §22). `redirect` mengembalikan `never`
  // sehingga helper ini selalu menghasilkan record atau redirect.
  async function lookupStudent() {
    try {
      return await getPrisma().user.findFirst({
        where: { id: studentSession.userId, role: "STUDENT" },
        select: { id: true, status: true, isActive: true },
      });
    } catch {
      return redirect("/attendance/error?code=DATABASE_UNAVAILABLE");
    }
  }

  const user = await lookupStudent();

  if (!user) redirect("/login");

  if (!user.isActive || user.status !== "APPROVED") {
    redirect(getStudentStatusDestination(user.status));
  }

  // Deep-link /attendance/resume harus tetap deterministik jika intent hilang
  // atau kedaluwarsa (mis. cookie intent tidak ada): tampilkan error
  // deterministik dengan link ke /kehadiran alih-alih memutar POST kosong.
  // Konsumsi intent tetap dilakukan oleh POST /api/attendance/resume di view;
  // di sini hanya fast-fail saat jelas tidak ada intent untuk dikonsumsi.
  if (!(await hasAttendanceIntentCookie())) {
    redirect("/attendance/error?code=INTENT_EXPIRED");
  }

  return <AttendanceResumeView />;
}
