import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminLoginForm } from "@/components/forms/admin-login-form";
import styles from "./admin-login.module.css";

export const metadata: Metadata = {
  title: "Login Admin/Guru — EXISEL",
  description: "Akses monitoring kehadiran ekstrakurikuler untuk admin dan guru.",
};

export default function AdminLoginPage() {
  return (
    <main className={styles.page}>
      <a className="skip-link" href="#admin-login-form">
        Lewati ke form login admin
      </a>

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Kembali ke EXISEL">
          <span className={styles.brandLogo}>
            <Image
              alt="Logo SMK Negeri 69 Jakarta"
              height={948}
              priority
              src="/logo-smkn69.webp"
              width={758}
            />
          </span>
          <span>
            <strong>EXISEL</strong>
            <small>Admin & guru</small>
          </span>
        </Link>
        <Link className={styles.studentLink} href="/login">
          Login siswa →
        </Link>
      </header>

      <div className={styles.layout}>
        <section className={styles.poster}>
          <div className={styles.posterTop}>
            <span>Portal monitoring</span>
            <span>Authorized access only</span>
          </div>
          <div className={styles.posterCopy}>
            <p>Data hari ini. Keputusan lebih cepat.</p>
            <h1>
              Pantau.
              <span>Catat.</span>
              Dampingi.
            </h1>
          </div>
          <div className={styles.featureList}>
            <div>
              <span>01</span>
              <strong>Hadir & izin</strong>
              <small>Real-time</small>
            </div>
            <div>
              <span>02</span>
              <strong>Alasan siswa</strong>
              <small>Tersimpan</small>
            </div>
            <div>
              <span>03</span>
              <strong>Belum mengisi</strong>
              <small>Terpantau</small>
            </div>
          </div>
        </section>

        <section className={styles.loginSection} id="admin-login-form">
          <div className={styles.loginCard}>
            <div className={styles.cardTop}>
              <span>Akses petugas</span>
              <strong>ADMIN / GURU</strong>
            </div>
            <div className={styles.cardIntro}>
              <p>Monitoring kehadiran</p>
              <h2>Masuk sebagai pengelola.</h2>
              <span>
                Gunakan akun dengan role admin. Akun siswa tidak dapat masuk ke
                halaman ini.
              </span>
            </div>
            <AdminLoginForm />
            <div className={styles.securityBox}>
              <strong>● Role diperiksa di server</strong>
              <span>Setiap akses dashboard divalidasi ulang dari session.</span>
            </div>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>© 2026 EXISEL</span>
        <span>Portal internal SMKN 69 Jakarta</span>
      </footer>
    </main>
  );
}
