import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/app/attendance/attendance.module.css";

export const metadata: Metadata = {
  title: "Absensi Gagal — EXISEL",
};

// Halaman error menerima `code`, `message`, dan `requestId` via query string,
// jadi jangan pernah di-cache agar setiap kode tampil sesuai permintaan.
export const dynamic = "force-dynamic";

type ErrorCopy = {
  title: string;
  hint: string;
};

// Semua kode error deterministik (plan §22 + kode domain attendance-service).
// Kunci dibandingkan dalam UPPERCASE sehingga alias/typo casing (mis.
// "INVALID_QR" vs "QR_INVALID") tetap terpetakan dan tidak jatuh ke fallback
// netral. Fallback sengaja tidak membocorkan detail teknis.
const ERROR_COPY: Record<string, ErrorCopy> = {
  QR_INVALID: {
    title: "QR tidak valid.",
    hint: "Pastikan kamu memindai QR kehadiran EXISEL yang benar.",
  },
  INVALID_QR: {
    title: "QR tidak valid.",
    hint: "Pastikan kamu memindai QR kehadiran EXISEL yang benar.",
  },
  QR_EXPIRED: {
    title: "QR sudah kedaluwarsa. Minta QR terbaru kepada pengurus ekskul.",
    hint: "QR kehadiran berganti secara berkala, jadi QR lama tidak bisa dipakai lagi.",
  },
  QR_REVOKED: {
    title: "QR sudah dinonaktifkan. Minta QR terbaru kepada pengurus ekskul.",
    hint: "Pengurus ekskul mengganti QR ini. Gunakan QR yang paling baru.",
  },
  ALREADY_ATTENDED: {
    title: "Kehadiranmu sudah tercatat.",
    hint: "Tidak perlu absen ulang. Sampai jumpa di kegiatan ekskul!",
  },
  ATTENDANCE_ALREADY_RECORDED: {
    title: "Kehadiranmu sudah tercatat.",
    hint: "Tidak perlu absen ulang. Sampai jumpa di kegiatan ekskul!",
  },
  ALREADY_PRESENT: {
    title: "Kehadiranmu sudah tercatat.",
    hint: "Tidak perlu absen ulang. Sampai jumpa di kegiatan ekskul!",
  },
  ATTENDANCE_CLOSED: {
    title: "Waktu absensi sudah ditutup.",
    hint: "Sesi absensi sudah berakhir. Hubungi pengurus ekskul jika ada kendala.",
  },
  WINDOW_CLOSED: {
    title: "Waktu absensi sudah ditutup.",
    hint: "Sesi absensi sudah berakhir. Hubungi pengurus ekskul jika ada kendala.",
  },
  ATTENDANCE_WINDOW_CLOSED: {
    title: "Waktu absensi sudah ditutup.",
    hint: "Sesi absensi sudah berakhir. Hubungi pengurus ekskul jika ada kendala.",
  },
  NOT_EXTRACURRICULAR_MEMBER: {
    title: "Kamu belum terdaftar di ekskul ini.",
    hint: "Daftar dahulu ke ekskul ini sebelum bisa absen lewat QR.",
  },
  NOT_ELIGIBLE: {
    title: "Kamu belum terdaftar di ekskul ini.",
    hint: "Daftar dahulu ke ekskul ini sebelum bisa absen lewat QR.",
  },
  ACCOUNT_DISABLED: {
    title: "Akun kamu tidak aktif atau belum disetujui.",
    hint: "Hubungi admin atau wali kelas untuk mengaktifkan akunmu.",
  },
  UNAUTHENTICATED: {
    title: "Kamu perlu masuk terlebih dahulu.",
    hint: "Masuk dengan akun EXISEL-mu untuk menyelesaikan absensi ini.",
  },
  LOGIN_REQUIRED: {
    title: "Kamu perlu masuk terlebih dahulu.",
    hint: "Masuk dengan akun EXISEL-mu untuk menyelesaikan absensi ini.",
  },
  RATE_LIMITED: {
    title: "Terlalu banyak percobaan. Coba sebentar lagi.",
    hint: "Tunggu beberapa saat, lalu pindai QR kembali.",
  },
  DATABASE_UNAVAILABLE: {
    title: "Sistem kehadiran sedang bermasalah.",
    hint: "Kehadiranmu belum tercatat. Coba lagi beberapa saat atau hubungi pengurus ekskul.",
  },
  SERVER_ERROR: {
    title: "Sistem kehadiran sedang bermasalah.",
    hint: "Kehadiranmu belum tercatat. Coba lagi beberapa saat atau hubungi pengurus ekskul.",
  },
  INTERNAL_ERROR: {
    title: "Sistem kehadiran sedang bermasalah.",
    hint: "Kehadiranmu belum tercatat. Coba lagi beberapa saat atau hubungi pengurus ekskul.",
  },
  UNAVAILABLE: {
    title: "Tidak dapat menghubungi server.",
    hint: "Periksa koneksi internetmu, lalu coba lagi.",
  },
  INTENT_INVALID: {
    title: "Absensi tertunda tidak ditemukan.",
    hint: "Silakan pindai QR kehadiran lagi untuk memulai ulang absensi.",
  },
  NO_PENDING_INTENT: {
    title: "Absensi tertunda tidak ditemukan.",
    hint: "Silakan pindai QR kehadiran lagi untuk memulai ulang absensi.",
  },
  INTENT_EXPIRED: {
    title: "Waktu absensi tertunda sudah habis. Silakan pindai QR kembali.",
    hint: "Absensi harus diselesaikan segera setelah scan. Pindai QR terbaru.",
  },
  INTENT_CONSUMED: {
    title: "Absensi tertunda sudah digunakan.",
    hint: "Absensi ini sudah selesai diproses. Cek statusmu di halaman kehadiran.",
  },
  FORBIDDEN: {
    title: "Kamu tidak memiliki akses untuk absensi ini.",
    hint: "Hubungi pengurus ekskul atau admin bila merasa ini keliru.",
  },
};

const FALLBACK_COPY: ErrorCopy = {
  title: "Absensi belum dapat disimpan.",
  hint: "Coba lagi beberapa saat. Jika masih gagal, hubungi pengurus ekskul.",
};

// Kelompok kode yang boleh menampilkan kode referensi requestId (plan §22).
const SERVER_ERROR_CODES = new Set([
  "DATABASE_UNAVAILABLE",
  "SERVER_ERROR",
  "INTERNAL_ERROR",
]);

// Kelompok kode login: tombol utama mengarah ke /login.
const LOGIN_CODES = new Set(["UNAUTHENTICATED", "LOGIN_REQUIRED"]);

// Kelompok yang kehilangan intent / QR tidak ditemukan lagi: tautkan ke
// halaman kehadiran sebagai pemulihan (deep-link /attendance/resume aman).
const INTENT_LOST_CODES = new Set([
  "INTENT_INVALID",
  "INTENT_EXPIRED",
  "INTENT_CONSUMED",
  "NO_PENDING_INTENT",
]);

// Kelompok bukan anggota ekskul.
const NOT_MEMBER_CODES = new Set(["NOT_EXTRACURRICULAR_MEMBER", "NOT_ELIGIBLE"]);

type PageProps = {
  searchParams: Promise<{
    code?: string | string[];
    message?: string | string[];
    requestId?: string | string[];
  }>;
};

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AttendanceErrorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawCode = firstParam(params.code)?.trim().toUpperCase();
  const code = rawCode || "QR_INVALID";
  const copy = ERROR_COPY[code] ?? FALLBACK_COPY;

  // Override teks dari API tetap dihormati (perilaku sebelumnya).
  const messageOverride = firstParam(params.message)?.trim();
  const hint = messageOverride || copy.hint;

  // Kode referensi hanya ditampilkan untuk kegagalan server dan divalidasi
  // formatnya agar tidak menampilkan input mentah yang tidak terduga.
  const rawRequestId = firstParam(params.requestId)?.trim();
  const requestId =
    SERVER_ERROR_CODES.has(code) &&
    rawRequestId &&
    /^[A-Za-z0-9._-]{1,64}$/.test(rawRequestId)
      ? rawRequestId
      : null;

  return (
    <main className={styles.page}>
      <section className={`${styles.card} ${styles.errorCard}`} aria-live="polite">
        <p className={styles.step}>Absensi QR</p>
        <h1>{copy.title}</h1>
        <p>{hint}</p>
        {requestId ? (
          <p className={styles.referenceCode}>Kode referensi: {requestId}</p>
        ) : null}
        {LOGIN_CODES.has(code) ? (
          <div className={styles.errorActions}>
            <Link className={styles.primaryButton} href="/login">
              Masuk
            </Link>
            <Link className={styles.secondaryButton} href="/dashboard">
              Kembali ke dashboard
            </Link>
          </div>
        ) : NOT_MEMBER_CODES.has(code) ? (
          <div className={styles.errorActions}>
            <Link className={styles.primaryButton} href="/ekstrakurikuler">
              Lihat daftar ekskul
            </Link>
            <Link className={styles.secondaryButton} href="/dashboard">
              Kembali ke dashboard
            </Link>
          </div>
        ) : INTENT_LOST_CODES.has(code) ? (
          <div className={styles.errorActions}>
            <Link className={styles.primaryButton} href="/kehadiran">
              Buka halaman kehadiran
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
