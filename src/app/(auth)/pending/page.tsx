import type { Metadata } from "next";
import { logoutAction } from "@/actions/auth";
import { refreshStudentStatusAction } from "@/actions/student-registration";
import { StudentVerificationShell } from "@/components/student-verification-shell";
import { PendingStatusWatcher } from "@/components/pending-status-watcher";
import { requireStudentStatus } from "@/lib/auth/authorization";
import styles from "../status-page.module.css";

export const metadata: Metadata = {
  title: "Pendaftaran Sedang Diverifikasi — EXISEL",
};

export default async function PendingPage() {
  const user = await requireStudentStatus(["PENDING"]);

  return (
    <StudentVerificationShell
      description="Data kamu sudah berhasil dikirim. Tunggu sampai admin menyetujui akun sebelum menggunakan EXISEL."
      email={user.email}
      eyebrow="Data sekolah sudah diterima"
      step="Langkah 2 dari 2"
      title={<>Sedang <span>diverifikasi.</span></>}
    >
      <div className={styles.content}>
        <div className={styles.statusHeader}>
          <strong className={styles.statusNumber}>02</strong>
          <span className={styles.statusBadge}>Menunggu admin</span>
        </div>
        <h2>Pendaftaran sedang diperiksa.</h2>
        <p>Admin akan mencocokkan nama, NIS, kelas, dan akun Google kamu.</p>
        <ol className={styles.steps}>
          <li><span>✓</span> Identitas Google terverifikasi</li>
          <li><span>✓</span> Data siswa berhasil dikirim</li>
          <li><span>3</span> Persetujuan admin sekolah</li>
        </ol>
        <PendingStatusWatcher />
        <div className={styles.actions}>
          <form action={refreshStudentStatusAction}>
            <button className={styles.primaryButton} type="submit">Periksa status sekarang</button>
          </form>
          <form action={logoutAction}>
            <button className={styles.secondaryButton} type="submit">Keluar dari akun</button>
          </form>
        </div>
        <p className={styles.notice}>Membuka URL dashboard secara langsung tetap akan diarahkan kembali ke halaman ini sampai akun disetujui.</p>
      </div>
    </StudentVerificationShell>
  );
}
