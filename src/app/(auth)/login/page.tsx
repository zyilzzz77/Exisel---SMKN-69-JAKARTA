import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Masuk Siswa — EXISEL",
  description:
    "Masuk ke EXISEL menggunakan email yang didata guru dan password yang diberikan.",
};

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <a className="skip-link" href="#form-login">
        Lewati ke form login
      </a>

      <div className={styles.orangeBlock} aria-hidden="true" />
      <div className={styles.blueBlock} aria-hidden="true" />

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Kembali ke beranda EXISEL">
          <span className={styles.brandLogo}>
            <Image
              src="/logo-smkn69.png"
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
          <Link className={styles.adminLink} href="/admin/login">
            Portal admin/guru
          </Link>
          <Link className={styles.backLink} href="/">
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
              <span className={styles.accessBadge}>Akses siswa</span>
              <span className={styles.cardNumber}>01 / LOGIN</span>
            </div>

            <div className={styles.cardIntro}>
              <h2 id="login-title">Selamat datang kembali.</h2>
              <p>
                Masukkan email akun e-Learning. Gunakan password yang diberikan.
              </p>
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
