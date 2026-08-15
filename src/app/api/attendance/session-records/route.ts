import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/database/prisma";
import { getJakartaDateKey, toDatabaseDate } from "@/lib/school-date";

export const dynamic = "force-dynamic";

const querySchema = z.string().uuid();

export async function GET(request: Request) {
  if (!(await getActiveSessionUser("ADMIN"))) {
    return NextResponse.json({ message: "Tidak terautentikasi." }, { status: 401 });
  }

  const extracurricularId = new URL(request.url).searchParams.get("extracurricularId");
  const parsed = querySchema.safeParse(extracurricularId);
  if (!parsed.success) {
    return NextResponse.json({ message: "Ekskul tidak valid." }, { status: 400 });
  }

  const attendanceDate = toDatabaseDate(getJakartaDateKey());
  const prisma = getPrisma();

  const [enrollmentCount, records] = await Promise.all([
    prisma.enrollment.count({
      where: {
        extracurricularId: parsed.data,
        status: "APPROVED",
      },
    }),
    prisma.attendance.findMany({
      where: {
        extracurricularId: parsed.data,
        attendanceDate,
        attendanceMethod: "QR",
        status: "PRESENT",
      },
      orderBy: { checkedInAt: "asc" },
      select: {
        id: true,
        checkedInAt: true,
        user: {
          select: {
            name: true,
            nis: true,
            className: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json(
    {
      present: records.length,
      total: enrollmentCount,
      records: records.map((record) => ({
        id: record.id,
        studentName: record.user.name,
        nis: record.user.nis,
        className: record.user.className,
        checkedInAt: record.checkedInAt?.toISOString() ?? "",
      })),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}