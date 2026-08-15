"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveStudentAction,
  rejectStudentAction,
  suspendStudentAction,
  unsuspendStudentAction,
  type StudentVerificationActionState,
} from "@/actions/student-verification";
import styles from "./student-status-action.module.css";

const initialState: StudentVerificationActionState = {
  status: "idle",
  message: "",
};

const actions = {
  approve: approveStudentAction,
  reject: rejectStudentAction,
  suspend: suspendStudentAction,
  unsuspend: unsuspendStudentAction,
};

const actionCopy = {
  approve: {
    eyebrow: "Persetujuan akun",
    title: "Setujui siswa ini?",
    description: "Siswa akan langsung mendapat akses ke seluruh fitur EXISEL.",
    confirmLabel: "Ya, setujui siswa",
    busyLabel: "Menyetujui...",
    tone: "approve",
  },
  reject: {
    eyebrow: "Penolakan pendaftaran",
    title: "Tolak pendaftaran ini?",
    description: "Siswa akan melihat alasan penolakan dan dapat memperbaiki datanya.",
    confirmLabel: "Ya, tolak pendaftaran",
    busyLabel: "Menolak...",
    tone: "reject",
  },
  suspend: {
    eyebrow: "Penangguhan akses",
    title: "Tangguhkan akun ini?",
    description: "Akses siswa ke EXISEL akan dihentikan sampai admin mengaktifkannya kembali.",
    confirmLabel: "Ya, tangguhkan akses",
    busyLabel: "Menangguhkan...",
    tone: "suspend",
  },
  unsuspend: {
    eyebrow: "Aktivasi kembali",
    title: "Aktifkan akun ini kembali?",
    description: "Siswa akan kembali mendapatkan akses ke dashboard dan fitur EXISEL.",
    confirmLabel: "Ya, aktifkan kembali",
    busyLabel: "Mengaktifkan...",
    tone: "approve",
  },
} as const;

type StudentStatusActionProps = {
  action: keyof typeof actions;
  buttonLabel: string;
  className?: string;
  studentId: string;
  studentName: string;
};

export function StudentStatusAction({
  action,
  buttonLabel,
  className,
  studentId,
  studentName,
}: StudentStatusActionProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(actions[action], initialState);
  const [open, setOpen] = useState(false);
  const copy = actionCopy[action];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function closeDialog() {
    if (pending) return;
    setOpen(false);
  }

  function finishSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className={className} onClick={() => setOpen(true)} type="button">
        {buttonLabel}
      </button>

      <dialog
        aria-labelledby={`${action}-${studentId}-title`}
        className={styles.dialog}
        onCancel={(event) => {
          if (pending) event.preventDefault();
          else setOpen(false);
        }}
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        {state.status === "success" ? (
          <div className={styles.successPanel}>
            <span className={styles.successIcon} aria-hidden="true">✓</span>
            <p>Perubahan berhasil</p>
            <h2 id={`${action}-${studentId}-title`}>{state.message}</h2>
            <p>Daftar siswa akan diperbarui.</p>
            <button onClick={finishSuccess} type="button">Selesai</button>
          </div>
        ) : (
          <form action={formAction} className={styles.confirmPanel}>
            <input name="studentId" type="hidden" value={studentId} />
            <div className={`${styles.modalHeader} ${styles[copy.tone]}`}>
              <span>{copy.eyebrow}</span>
              <strong aria-hidden="true">?</strong>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.studentLabel}>Akun siswa</p>
              <h2 id={`${action}-${studentId}-title`}>{copy.title}</h2>
              <strong className={styles.studentName}>{studentName}</strong>
              <p className={styles.description}>{copy.description}</p>

              {action === "reject" ? (
                <label className={styles.reasonField}>
                  <span>Alasan penolakan <small>Wajib diisi</small></span>
                  <textarea
                    maxLength={1000}
                    minLength={5}
                    name="reason"
                    placeholder="Contoh: NIS tidak sesuai data sekolah. Silakan perbaiki dan kirim ulang."
                    required
                    rows={4}
                  />
                </label>
              ) : null}

              {state.status === "error" ? (
                <p className={styles.errorMessage} role="alert">{state.message}</p>
              ) : null}

              <div className={styles.modalActions}>
                <button disabled={pending} onClick={closeDialog} type="button">Tidak, batalkan</button>
                <button className={styles[`${copy.tone}Button`]} disabled={pending} type="submit">
                  {pending ? copy.busyLabel : copy.confirmLabel}
                </button>
              </div>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
