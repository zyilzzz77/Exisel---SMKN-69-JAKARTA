import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { getAuthenticatedSessionUser } from "@/lib/auth/authorization";
import { getStudentStatusDestination } from "@/lib/auth/student-status";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Masuk Siswa — EXISEL",
  description:
    "Masuk ke EXISEL dengan akun Google atau kredensial siswa yang sudah terdaftar.",
};

const googleErrorMessages: Record<string, string> = {
  google_not_configured:
    "Google Login belum dikonfigurasi oleh pengelola EXISEL.",
  google_invalid_configuration:
    "Konfigurasi alamat kembali Google belum valid.",
  google_cancelled: "Proses masuk dengan Google dibatalkan.",
  google_invalid_state:
    "Permintaan Google Login sudah kedaluwarsa. Silakan coba kembali.",
  google_unavailable:
    "Layanan Google belum dapat dihubungi. Silakan coba kembali.",
  google_exchange_failed:
    "Kode Google tidak dapat diverifikasi. Silakan mulai ulang proses login.",
  google_invalid_id_token: "Identitas Google tidak dapat diverifikasi.",
  google_missing_id_token: "Google tidak mengirim identitas yang diperlukan.",
  google_invalid_nonce:
    "Pemeriksaan keamanan Google Login gagal. Silakan coba kembali.",
  google_unverified_email:
    "Gunakan akun Google dengan alamat email yang sudah terverifikasi.",
  google_invalid_email: "Alamat email dari akun Google tidak valid.",
  google_domain_not_allowed:
    "Domain email akun Google ini tidak diizinkan oleh sekolah.",
  google_account_conflict:
    "Email atau identitas Google sudah terhubung ke akun lain. Hubungi admin.",
  google_student_only:
    "Google Login ini khusus siswa. Admin dan guru masuk melalui portal admin.",
  google_login_failed:
    "Google Login belum berhasil. Silakan coba kembali atau hubungi admin.",
};

type LoginPageProps = {
  searchParams: Promise<{ googleError?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sessionUser = await getAuthenticatedSessionUser();
  if (sessionUser) {
    if (sessionUser.role === "ADMIN") {
      redirect("/admin/dashboard");
    }
    const destination = sessionUser.isActive
      ? getStudentStatusDestination(sessionUser.status)
      : "/suspended";
    redirect(destination);
  }

  const params = await searchParams;
  const googleErrorCode = Array.isArray(params.googleError)
    ? params.googleError[0]
    : params.googleError;
  const googleError = googleErrorCode
    ? (googleErrorMessages[googleErrorCode] ??
      googleErrorMessages.google_login_failed)
    : null;

  return (
    <main className={styles.page}>
      <a className="skip-link" href="#form-login">
        Lewati ke form login
      </a>

      <div className={styles.orangeBlock} aria-hidden="true" />
      <div className={styles.blueBlock} aria-hidden="true" />

      <header className={styles.header}>
        <Link
          aria-label="Kembali ke beranda EXISEL"
          className={styles.brand}
          href="/"
          prefetch={false}
        >
          <span className={styles.brandLogo}>
            <Image
              src="/logo-smkn69.webp"
              alt="Logo SMK Negeri 69 Jakarta"
              width={758}
              height={948}
              priority
            />
          </span>
          <span>
            <strong>EXISEL</strong>
            <small>Ekstrakurikuler Namsel</small>
          </span>
        </Link>

        <div className={styles.headerLinks}>
          <Link className={styles.adminLink} href="/admin/login" prefetch={false}>
            Portal admin/guru
          </Link>
          <Link className={styles.backLink} href="/" prefetch={false}>
            <span aria-hidden="true">←</span> Kembali ke beranda
          </Link>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.brandPanel} aria-labelledby="login-poster-title">
          <div className={styles.panelTopline}>
            <span>Portal siswa</span>
            <span>SMKN 69 Jakarta</span>
          </div>

          <div className={styles.posterCopy}>
            <p className={styles.eyebrow}>Satu akun untuk semua aktivitas</p>
            <h1 id="login-poster-title">
              Masuk.
              <br />
              <span>Pilih.</span>
              <br />
              Bergerak.
            </h1>
            <p>
              Jadwal, kuota, dan status pendaftaran ekskulmu sudah menunggu di
              dalam.
            </p>
          </div>

          <div className={styles.activityStack} aria-label="Fitur akun siswa">
            <div>
              <span className={styles.activityNumber}>01</span>
              <strong>Pilih ekskul</strong>
              <span aria-hidden="true">↗</span>
            </div>
            <div>
              <span className={styles.activityNumber}>02</span>
              <strong>Cek jadwal</strong>
              <span aria-hidden="true">↗</span>
            </div>
            <div>
              <span className={styles.activityNumber}>03</span>
              <strong>Pantau status</strong>
              <span aria-hidden="true">↗</span>
            </div>
          </div>

          <div className={styles.posterStamp} aria-hidden="true">
            <span>Ayo</span>
            <strong>Aktif!</strong>
          </div>
        </section>

        <section className={styles.formSection} id="form-login" aria-labelledby="login-title">
          <div className={styles.loginCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderBadges}>
                <span className={styles.accessBadge}>Akses siswa</span>
                <Link
                  className={styles.adminMobileLink}
                  href="/admin/login"
                  prefetch={false}
                >
                  Login Admin/Guru <span aria-hidden="true">↗</span>
                </Link>
              </div>
              <span className={styles.cardNumber}>01 / LOGIN</span>
            </div>

<div className={styles.cardIntro}>
              <h2 id="login-title">Selamat datang kembali.</h2>
              <p>
                Gunakan akun Google untuk melanjutkan. Siswa baru perlu
                melengkapi data dan menunggu verifikasi admin.
              </p>
            </div>

            <LoginPanel googleError={googleError} />

            <div className={styles.helpBox}>
              <span className={styles.helpIcon} aria-hidden="true">
                ?
              </span>
              <p>
                <strong>Lupa password?</strong>
                <span>Hubungi admin atau wali kelas untuk reset akun.</span>
              </p>
            </div>
          </div>

          <div className={styles.securityNote}>
            <span aria-hidden="true">●</span>
            <p>
              <strong>Akunmu tetap aman.</strong> Jangan bagikan password kepada
              siapa pun, termasuk teman.
            </p>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>© 2026 EXISEL</span>
        <span>Sistem Informasi Ekstrakurikuler Siswa</span>
      </footer>
    </main>
  );
}
