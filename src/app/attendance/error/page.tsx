import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/app/attendance/attendance.module.css";

export const metadata: Metadata = {
  title: "Absensi Gagal — EXISEL",
};

const errorTitles: Record<string, string> = {
  QR_INVALID: "QR absensi tidak valid.",
  QR_EXPIRED: "QR absensi sudah tidak berlaku.",
  QR_REVOKED: "QR absensi sudah dinonaktifkan.",
  ATTENDANCE_CLOSED: "Sesi absensi sudah ditutup.",
  ALREADY_ATTENDED: "Kamu sudah absen hari ini.",
  NOT_EXTRACURRICULAR_MEMBER:
    "Kamu belum terdaftar di ekskul ini. Daftar dahulu sebelum bisa absen.",
  ACCOUNT_DISABLED: "Akun tidak aktif.",
  INTENT_INVALID: "Absensi tertunda tidak valid.",
  INTENT_EXPIRED: "Waktu absensi sudah habis.",
  INTENT_CONSUMED: "Absensi tertunda sudah digunakan.",
  LOGIN_REQUIRED: "Login dibutuhkan untuk menyelesaikan absensi.",
};

type PageProps = {
  searchParams: Promise<{ code?: string; message?: string }>;
};

export default async function AttendanceErrorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const code = params.code ?? "QR_INVALID";
  const title = errorTitles[code] ?? "Absensi belum dapat disimpan.";
  const message = params.message;

  const isNotMember = code === "NOT_EXTRACURRICULAR_MEMBER";

  return (
    <main className={styles.page}>
      <section className={`${styles.card} ${styles.errorCard}`} aria-live="polite">
        <p className={styles.step}>Absensi QR</p>
        <h1>{title}</h1>
        <p>{message ?? "Hubungi admin atau pindai QR terbaru."}</p>
        {isNotMember ? (
          <div className={styles.errorActions}>
            <Link className={styles.primaryButton} href="/ekstrakurikuler">
              Lihat daftar ekskul
            </Link>
            <Link className={styles.secondaryButton} href="/dashboard">
              Kembali ke dashboard
            </Link>
          </div>
        ) : (
          <Link className={styles.primaryButton} href="/dashboard">
            Kembali ke dashboard
          </Link>
        )}
      </section>
    </main>
  );
}