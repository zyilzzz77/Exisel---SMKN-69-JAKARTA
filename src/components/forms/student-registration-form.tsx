"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  submitStudentRegistrationAction,
  type StudentRegistrationState,
} from "@/actions/student-registration";
import {
  STUDENT_CLASS_MAJORS,
  STUDENT_CLASS_OPTIONS,
} from "@/lib/student/registration";
import styles from "./student-registration-form.module.css";

const initialState: StudentRegistrationState = { status: "idle", message: "" };

type StudentRegistrationFormProps = {
  defaultName: string;
  defaultNis: string;
  defaultClassName: string;
};

export function StudentRegistrationForm({
  defaultName,
  defaultNis,
  defaultClassName,
}: StudentRegistrationFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    submitStudentRegistrationAction,
    initialState,
  );

  useEffect(() => {
    if (state.status !== "success" || !state.redirectTo) return;

    router.replace(state.redirectTo);
    router.refresh();
  }, [router, state.redirectTo, state.status]);

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.heading}>
        <span>01 / Data resmi</span>
        <h2>Lengkapi data siswa.</h2>
        <p>Isi sesuai data sekolah. Admin akan memeriksa sebelum akses dibuka.</p>
      </div>

      <label className={styles.field}>
        <span className={styles.labelRow}><strong>Nama lengkap</strong><small>01 / Identitas</small></span>
        <div className={styles.inputFrame}>
          <span aria-hidden="true">Aa</span>
          <input
            aria-invalid={Boolean(state.errors?.name)}
            autoComplete="name"
            defaultValue={defaultName}
            maxLength={100}
            name="name"
            placeholder="Nama lengkap sesuai data sekolah"
            required
          />
        </div>
        <small>{state.errors?.name?.[0] ?? "Minimal 3, maksimal 100 karakter."}</small>
      </label>

      <label className={styles.field}>
        <span className={styles.labelRow}><strong>NIS</strong><small>02 / Nomor siswa</small></span>
        <div className={styles.inputFrame}>
          <span aria-hidden="true">#</span>
          <input
            aria-invalid={Boolean(state.errors?.nis)}
            defaultValue={defaultNis}
            inputMode="numeric"
            maxLength={7}
            name="nis"
            pattern="[0-9]{7}"
            placeholder="Contoh: 2501319"
            required
          />
        </div>
        <small>{state.errors?.nis?.[0] ?? "Masukkan tepat 7 angka."}</small>
      </label>

      <label className={styles.field}>
        <span className={styles.labelRow}><strong>Kelas</strong><small>03 / Kelas aktif</small></span>
        <div className={styles.inputFrame}>
          <span aria-hidden="true">KLS</span>
          <select
            aria-invalid={Boolean(state.errors?.className)}
            defaultValue={defaultClassName}
            name="className"
            required
          >
            <option disabled value="">Pilih kelas</option>
            {STUDENT_CLASS_MAJORS.map((major) => (
              <optgroup key={major} label={major}>
                {STUDENT_CLASS_OPTIONS.filter((className) =>
                  className.includes(` ${major} `),
                ).map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <small>{state.errors?.className?.[0] ?? "Pilih kelas aktif saat ini."}</small>
      </label>

      {state.message && state.status !== "success" ? (
        <div className={styles.message} role="alert">
          <strong>Data belum dapat dikirim.</strong>
          <span>{state.message}</span>
        </div>
      ) : null}

      <button disabled={pending} type="submit">
        <span>{pending ? "Mengirim data..." : "Kirim untuk diverifikasi"}</span>
        <span aria-hidden="true">→</span>
      </button>

      <p className={styles.securityNote}>
        Nama, NIS, dan kelas akan disimpan sebagai data resmi akun EXISEL.
        Role dan status akun tidak dapat diubah dari formulir ini.
      </p>
    </form>
  );
}
