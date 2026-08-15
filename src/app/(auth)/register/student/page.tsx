import type { Metadata } from "next";
import { requireStudentStatus } from "@/lib/auth/authorization";
import { StudentRegistrationForm } from "@/components/forms/student-registration-form";
import { StudentVerificationShell } from "@/components/student-verification-shell";

export const metadata: Metadata = {
  title: "Lengkapi Data Siswa — EXISEL",
  description: "Lengkapi data sekolah sebelum akun EXISEL diverifikasi admin.",
};

export default async function StudentRegistrationPage() {
  const user = await requireStudentStatus(["INCOMPLETE", "REJECTED"]);

  return (
    <StudentVerificationShell
      description="Masukkan data sesuai data sekolah. Data kamu akan diverifikasi admin sebelum seluruh fitur EXISEL dapat digunakan."
      email={user.email}
      eyebrow="Identitas Google berhasil"
      presentation="registration"
      step="Langkah 1 dari 2"
      title={<>Lengkapi <span>data siswa.</span></>}
      introContent={
        <div className="verificationHighlights" aria-label="Tahapan verifikasi akun">
          <div><span>01</span><strong>Identitas Google</strong><small>Sudah terhubung</small></div>
          <div><span>02</span><strong>Data sekolah</strong><small>Lengkapi sekarang</small></div>
          <div><span>03</span><strong>Persetujuan admin</strong><small>Tunggu keputusan</small></div>
        </div>
      }
    >
      <StudentRegistrationForm
        defaultClassName={user.className ?? ""}
        defaultName={user.name}
        defaultNis={user.nis ?? ""}
      />
    </StudentVerificationShell>
  );
}
