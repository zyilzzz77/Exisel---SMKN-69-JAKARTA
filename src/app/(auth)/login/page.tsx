import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
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

            <div className={styles.oauthPanel}>
              <a className={styles.googleButton} href="/api/auth/google/start">
                <svg
                  aria-hidden="true"
                  className={styles.googleIcon}
                  viewBox="0 0 24 24"
                >
                  <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5L15.4 17c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.3-2.6Z" />
                  <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6A6 6 0 0 1 12 6Z" />
                </svg>
                <span>Lanjutkan dengan Google</span>
                <span aria-hidden="true">→</span>
              </a>
              <p>
                Google hanya memverifikasi identitas. Akses EXISEL tetap harus
                disetujui admin sekolah.
              </p>
              {googleError ? (
                <div className={styles.oauthError} role="alert">
                  <strong>Google Login belum berhasil.</strong>
                  <span>{googleError}</span>
                </div>
              ) : null}
            </div>

            <div className={styles.divider}>
              <span>atau masuk dengan akun lama</span>
            </div>

            <LoginForm />

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
