import type { Metadata } from "next";
import { logoutAction } from "@/actions/auth";
import { StudentVerificationShell } from "@/components/student-verification-shell";
import { requireStudentStatus } from "@/lib/auth/authorization";
import styles from "../status-page.module.css";

export const metadata: Metadata = { title: "Akun Ditangguhkan — EXISEL" };

export default async function SuspendedPage() {
  const user = await requireStudentStatus(["SUSPENDED"]);

  return (
    <StudentVerificationShell
      description="Akses akun dihentikan sementara oleh admin. Data akun tetap tersimpan, tetapi fitur siswa belum dapat digunakan."
      email={user.email}
      eyebrow="Akses sementara dihentikan"
      step="Hubungi admin"
      title={<>Akun <span>ditangguhkan.</span></>}
      tone="orange"
    >
      <div className={styles.content}>
        <div className={styles.statusHeader}>
          <strong className={styles.statusNumber}>—</strong>
          <span className={styles.statusBadge}>Suspended</span>
        </div>
        <h2>Hubungi admin sekolah.</h2>
        <p>Mintalah admin memeriksa status akun. Hanya admin yang dapat mengaktifkan kembali akses siswa.</p>
        <div className={styles.actions}>
          <form action={logoutAction}>
            <button className={styles.secondaryButton} type="submit">Keluar dari akun</button>
          </form>
        </div>
        <p className={styles.notice}>Status ini selalu diperiksa dari database pada setiap permintaan penting.</p>
      </div>
    </StudentVerificationShell>
  );
}
