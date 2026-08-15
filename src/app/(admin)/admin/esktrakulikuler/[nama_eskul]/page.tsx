import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin-header";
import { AttendanceQrDisplay } from "@/components/attendance-qr-display";
import { AttendanceLivePanel } from "@/components/attendance/attendance-live-panel";
import { AttendanceSessionForm } from "@/components/forms/attendance-session-form";
import { readSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";
import {
  formatScheduleTime,
  getJakartaDateKey,
  getSchoolDay,
  toDatabaseDate,
} from "@/lib/school-date";
import styles from "./admin-eskul.module.css";

type PageProps = { params: Promise<{ nama_eskul: string }> };

const dayLabels: Record<string, string> = {
  MONDAY: "Senin",
  TUESDAY: "Selasa",
  WEDNESDAY: "Rabu",
  THURSDAY: "Kamis",
  FRIDAY: "Jumat",
  SATURDAY: "Sabtu",
  SUNDAY: "Minggu",
};

const logos: Record<string, string> = {
  Pramuka: "/logo-pramuka.webp",
  Nihon: "/logo-nihon.webp",
  Basket: "/logo-basket.webp",
  ITC: "/logo-itc.webp",
  "English Club": "/logo-english-club.webp",
  Futsal: "/logo-futsal.webp",
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nama_eskul } = await params;
  return { title: `Kode Kehadiran ${nama_eskul} — EXISEL` };
}

export default async function AdminExtracurricularSessionPage({ params }: PageProps) {
  const session = await readSession();
  if (!session || session.role !== "ADMIN") redirect("/admin/login");

  const { nama_eskul } = await params;
  const requestedSlug = slugify(decodeURIComponent(nama_eskul).replaceAll("_", " "));
  const dateKey = getJakartaDateKey();
  const day = getSchoolDay(dateKey);
  const attendanceDate = toDatabaseDate(dateKey);
  const programs = await getPrisma().extracurricular.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      schedules: {
        where: { day },
        orderBy: { startTime: "asc" },
        select: { day: true, startTime: true, endTime: true, location: true },
      },
      attendanceSessions: {
        where: { sessionDate: attendanceDate, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { expiresAt: true, createdAt: true },
      },
    },
  });

const program = programs.find((item) => slugify(item.name) === requestedSlug);
  if (!program) notFound();
  const admin = await getPrisma().user.findUnique({
    where: { id: session.userId },
    select: { name: true, isActive: true },
  });
  if (!admin?.isActive) redirect("/admin/login");
  const schedule = program.schedules[0];
  const activeSession = program.attendanceSessions[0] ?? null;

  return (
    <main className={styles.page}>
      <AdminHeader
        activeItem="attendance"
        adminName={admin.name}
        announcement="Portal pembina / kode kehadiran • Waktu Jakarta"
        brandSubtitle="Generator sesi kehadiran"
        roleLabel="Admin / Pembina"
      />

      <div className={styles.shell}>
        <Link className={styles.backLink} href="/admin/dashboard">← Kembali ke monitoring</Link>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Sesi hari ini / {dateKey}</p>
            <h1>QR kehadiran <span>{program.name}.</span></h1>
            <p>Tampilkan QR dinamis kepada siswa. QR berganti setiap 25 detik dan token sebelumnya langsung kedaluwarsa.</p>
          </div>
          <div className={styles.logoFrame}>
            {logos[program.name] ? <Image alt={`Logo ${program.name}`} height={220} src={logos[program.name]} width={220} /> : <strong>{program.name.slice(0, 2).toUpperCase()}</strong>}
          </div>
        </section>

        <section className={styles.grid}>
          <article className={styles.infoCard}>
            <span className={styles.cardNumber}>01 / Agenda</span>
            <h2>{dayLabels[day] ?? day}</h2>
            {schedule ? (
              <p>{formatScheduleTime(schedule.startTime)}–{formatScheduleTime(schedule.endTime)} · {schedule.location}</p>
            ) : (
              <p>Ekskul ini tidak terjadwal hari ini.</p>
            )}
            <p className={styles.muted}>{program.description}</p>
          </article>
          <article className={styles.sessionCard}>
            <span className={styles.cardNumber}>02 / Sesi QR dinamis</span>
            {activeSession ? (
              <>
                <AttendanceQrDisplay extracurricularId={program.id} programName={program.name} />
                <p className={styles.qrSessionEnd}>Sesi aktif sampai pembina menekan Selesai</p>
              </>
            ) : (
              <p className={styles.muted}>Belum ada QR aktif untuk agenda ini.</p>
            )}
            <AttendanceSessionForm active={Boolean(activeSession)} extracurricularId={program.id} />
            <p className={styles.sessionRule}>QR berganti setiap 25 detik dan token lama langsung kedaluwarsa. Siswa memindai QR dengan Google Lens/kamera; jika sudah login, kehadiran langsung tercatat.</p>
          </article>

          <article className={styles.liveCard}>
            <span className={styles.cardNumber}>03 / Kehadiran langsung</span>
            <AttendanceLivePanel programId={program.id} programName={program.name} />
          </article>
        </section>
      </div>
    </main>
  );
}
