import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { StudentVerificationShell } from "@/components/student-verification-shell";
import { requireStudentStatus } from "@/lib/auth/authorization";
import styles from "../status-page.module.css";

export const metadata: Metadata = {
  title: "Pendaftaran Belum Disetujui — EXISEL",
};

export default async function RejectedPage() {
  const user = await requireStudentStatus(["REJECTED"]);

  return (
    <StudentVerificationShell
      description="Periksa alasan dari admin, perbaiki data yang diperlukan, lalu kirim ulang untuk diverifikasi."
      email={user.email}
      eyebrow="Data perlu diperbaiki"
      step="Tindakan diperlukan"
      title={<>Belum <span>disetujui.</span></>}
      tone="red"
    >
      <div className={styles.content}>
        <div className={styles.statusHeader}>
          <strong className={styles.statusNumber}>!</strong>
          <span className={styles.statusBadge}>Perlu revisi</span>
        </div>
        <h2>Periksa catatan admin.</h2>
        <div className={styles.reason}>
          <span>Alasan penolakan</span>
          <strong>{user.rejectionReason ?? "Admin meminta data siswa diperiksa kembali."}</strong>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/register/student">Perbaiki dan kirim ulang</Link>
          <form action={logoutAction}>
            <button className={styles.secondaryButton} type="submit">Keluar dari akun</button>
          </form>
        </div>
      </div>
    </StudentVerificationShell>
  );
}
