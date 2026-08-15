import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./student-verification-shell.module.css";

type StudentVerificationShellProps = {
  step: string;
  eyebrow: string;
  title: ReactNode;
  description: string;
  email?: string;
  tone?: "blue" | "orange" | "red";
  presentation?: "default" | "registration";
  introContent?: ReactNode;
  children: ReactNode;
};

export function StudentVerificationShell({
  step,
  eyebrow,
  title,
  description,
  email,
  tone = "blue",
  presentation = "default",
  introContent,
  children,
}: StudentVerificationShellProps) {
  return (
    <main className={`${styles.page} ${styles[tone]} ${styles[presentation]}`}>
      <div className={styles.decorationOne} aria-hidden="true" />
      <div className={styles.decorationTwo} aria-hidden="true" />

      <header className={styles.header}>
        <Link className={styles.brand} href="/" prefetch={false}>
          <Image
            alt="Logo SMK Negeri 69 Jakarta"
            height={948}
            priority
            src="/logo-smkn69.webp"
            width={758}
          />
          <span>
            <strong>EXISEL</strong>
            <small>Verifikasi akun siswa</small>
          </span>
        </Link>
        <span className={styles.step}>{step}</span>
      </header>

      <section className={styles.shell}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>
          {email ? (
            <div className={styles.identity}>
              <span>Akun Google</span>
              <strong>{email}</strong>
            </div>
          ) : null}
          {introContent}
        </div>

        <div className={styles.card}>{children}</div>
      </section>

      <footer className={styles.footer}>
        <strong>EXISEL / SMKN 69 JAKARTA</strong>
        <span>Identitas Google tidak otomatis memberi akses siswa.</span>
      </footer>
    </main>
  );
}
