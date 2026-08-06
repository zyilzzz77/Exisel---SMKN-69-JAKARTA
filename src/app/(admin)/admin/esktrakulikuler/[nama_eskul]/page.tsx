import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AttendanceSessionForm } from "@/components/forms/attendance-session-form";
import { readSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";
import {
  getJakartaDateKey,
  getSchoolDay,
  normalizePrismaJakartaTimestamp,
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
  Pramuka: "/logo-pramuka.png",
  Nihon: "/logo-nihon.png",
  Basket: "/logo-basket.png",
  ITC: "/logo-itc.png",
  "English Club": "/logo-english-club.png",
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(value)
    .replace(".", ":");
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
        where: { sessionDate: attendanceDate },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { code: true, expiresAt: true, createdAt: true },
      },
    },
  });

  const program = programs.find((item) => slugify(item.name) === requestedSlug);
  if (!program) notFound();
  const schedule = program.schedules[0];
  const activeSession = program.attendanceSessions[0];

  return (
    <main className={styles.page}>
      <div className={styles.announcement}>Portal pembina / kode kehadiran <span>Waktu Jakarta</span></div>
      <header className={styles.header}>
        <Link className={styles.brand} href="/admin/dashboard">
          <Image alt="Logo SMK Negeri 69 Jakarta" height={948} src="/logo-smkn69.png" width={758} />
          <span><strong>EXISEL</strong><small>Generator sesi kehadiran</small></span>
        </Link>
        <nav aria-label="Navigasi admin">
          <Link href="/admin/dashboard">Kehadiran</Link>
          <Link href="/admin/laporan">Laporan</Link>
          <Link href="/ekstrakurikuler">Katalog ekskul</Link>
        </nav>
      </header>

      <div className={styles.shell}>
        <Link className={styles.backLink} href="/admin/dashboard">← Kembali ke monitoring</Link>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Sesi hari ini / {dateKey}</p>
            <h1>Kode kehadiran <span>{program.name}.</span></h1>
            <p>Generate satu kode untuk dibagikan admin, guru, atau pembina saat kegiatan berlangsung.</p>
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
              <p>{formatTime(schedule.startTime)}–{formatTime(schedule.endTime)} · {schedule.location}</p>
            ) : (
              <p>Ekskul ini tidak terjadwal hari ini.</p>
            )}
            <p className={styles.muted}>{program.description}</p>
          </article>
          <article className={styles.sessionCard}>
            <span className={styles.cardNumber}>02 / Sesi kode</span>
            {activeSession ? (
              <div className={styles.currentCode}>
                <small>Kode aktif</small>
                <strong>{activeSession.code}</strong>
                <span>
                  Berlaku sampai {formatTime(normalizePrismaJakartaTimestamp(activeSession.expiresAt))}
                </span>
              </div>
            ) : (
              <p className={styles.muted}>Belum ada kode aktif untuk agenda ini.</p>
            )}
            {schedule ? <AttendanceSessionForm extracurricularId={program.id} /> : null}
            <p className={styles.sessionRule}>Kode otomatis berakhir 15 menit setelah waktu selesai kegiatan.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
