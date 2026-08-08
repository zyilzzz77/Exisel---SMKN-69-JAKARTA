import { readSession } from "@/lib/auth/session";
import { getAttendanceProgramReports } from "@/lib/attendance/report";
import { ATTENDANCE_TRACKING_START_DATE } from "@/lib/attendance/reconcile";
import { getPrisma } from "@/lib/database/prisma";
import { buildAttendanceExcelBuffer } from "@/lib/attendance/excel-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const dayLabels: Record<string, string> = {
  MONDAY: "Senin",
  TUESDAY: "Selasa",
  WEDNESDAY: "Rabu",
  THURSDAY: "Kamis",
  FRIDAY: "Jumat",
  SATURDAY: "Sabtu",
  SUNDAY: "Minggu",
};

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(value)
    .replace(".", ":");
}

function safeFilename(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || "ekstrakurikuler";
}

export async function GET(request: Request) {
  const session = await readSession();

  if (!session || session.role !== "ADMIN") {
    return Response.json(
      { message: "Login admin/guru diperlukan untuk mengunduh laporan." },
      { status: 401 },
    );
  }

  const admin = await getPrisma().user.findFirst({
    where: { id: session.userId, role: "ADMIN", isActive: true },
    select: { id: true },
  });

  if (!admin) {
    return Response.json(
      { message: "Akun admin/guru tidak aktif." },
      { status: 403 },
    );
  }

  const extracurricularId = new URL(request.url).searchParams.get("ekskul");
  if (!extracurricularId || !UUID_PATTERN.test(extracurricularId)) {
    return Response.json({ message: "Ekskul tidak valid." }, { status: 400 });
  }

  const report = (await getAttendanceProgramReports(extracurricularId))[0];
  if (!report) {
    return Response.json({ message: "Ekskul tidak ditemukan." }, { status: 404 });
  }

  const scheduleLabel = report.schedules.length
    ? report.schedules
        .map(
          (schedule) =>
            `${dayLabels[schedule.day] ?? schedule.day}, ${formatTime(
              schedule.startTime,
            )}–${formatTime(schedule.endTime)} • ${schedule.location}`,
        )
        .join(" | ")
    : "Jadwal belum tersedia";
  const workbookPayload = {
    ...report,
    startDate: report.agendaDates[0] ?? ATTENDANCE_TRACKING_START_DATE,
    scheduleLabel,
  };

  try {
    const workbookBytes = await buildAttendanceExcelBuffer(workbookPayload);
    const filename = `kehadiran-${safeFilename(report.name)}-${report.throughDate}.xlsx`;

    return new Response(new Uint8Array(workbookBytes), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
          filename,
        )}`,
        "Content-Length": String(workbookBytes.byteLength),
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Gagal membuat laporan Excel:", error);
    return Response.json(
      { message: "Laporan Excel belum dapat dibuat. Coba kembali." },
      { status: 500 },
    );
  }
}
