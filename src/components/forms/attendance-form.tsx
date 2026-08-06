"use client";

import { useActionState, useState } from "react";
import {
  submitAttendanceAction,
  type AttendanceState,
} from "@/actions/attendance";
import styles from "@/app/(student)/kehadiran/attendance.module.css";

const initialState: AttendanceState = {
  status: "idle",
  message: "",
};

type AttendanceFormProps = {
  studentName: string;
  className: string;
  extracurricularId: string;
  extracurricularName: string;
  existingAttendance: {
    status: "PRESENT" | "EXCUSED" | "ABSENT";
    reason: string | null;
  } | null;
  attendanceCodeExpiresAt: string | null;
};

export function AttendanceForm({
  studentName,
  className,
  extracurricularId,
  extracurricularName,
  existingAttendance,
  attendanceCodeExpiresAt,
}: AttendanceFormProps) {
  const [state, formAction, pending] = useActionState(
    submitAttendanceAction,
    initialState,
  );
  const [attendanceStatus, setAttendanceStatus] = useState<
    "PRESENT" | "EXCUSED" | ""
  >(
    existingAttendance?.status === "PRESENT" ||
      existingAttendance?.status === "EXCUSED"
      ? existingAttendance.status
      : "",
  );

  if (existingAttendance) {
    const statusLabel =
      existingAttendance.status === "PRESENT"
        ? "Hadir"
        : existingAttendance.status === "EXCUSED"
          ? "Izin"
          : "Tidak hadir";

    return (
      <section className={`${styles.attendanceForm} ${styles.lockedAttendance}`}>
        <div className={styles.formTitle}>
          <div>
            <span>Absensi hari ini selesai</span>
            <h2>Kehadiran terkunci</h2>
          </div>
          <strong>1× submit</strong>
        </div>

        <div className={styles.identityGrid}>
          <div className={styles.lockedIdentity}>
            <span>Nama lengkap</span>
            <strong>{studentName}</strong>
          </div>
          <div className={styles.lockedIdentity}>
            <span>Kelas</span>
            <strong>{className}</strong>
          </div>
          <div className={`${styles.lockedIdentity} ${styles.fullField}`}>
            <span>Ekstrakurikuler hari ini</span>
            <strong>{extracurricularName}</strong>
          </div>
        </div>

        <div className={styles.lockedResult}>
          <span>Status yang tersimpan</span>
          <strong>{statusLabel}</strong>
          {existingAttendance.reason ? <p>{existingAttendance.reason}</p> : null}
        </div>

        <div className={styles.lockedNotice} role="status">
          <strong>Data sudah dikirim ke admin/guru.</strong>
          <span>
            Absensi hanya dapat disubmit satu kali dan tidak dapat diubah atau
            dikirim ulang.
          </span>
        </div>
      </section>
    );
  }

  return (
    <form className={styles.attendanceForm} action={formAction}>
      <input
        name="extracurricularId"
        type="hidden"
        value={extracurricularId}
      />

      <div className={styles.formTitle}>
        <div>
          <span>01 / Identitas otomatis</span>
          <h2>Data siswa</h2>
        </div>
        <strong>Terkunci</strong>
      </div>

      <div className={styles.identityGrid}>
        <label>
          <span>Nama lengkap</span>
          <input disabled readOnly value={studentName} />
        </label>
        <label>
          <span>Kelas</span>
          <input disabled readOnly value={className} />
        </label>
        <label className={styles.fullField}>
          <span>Ekstrakurikuler hari ini</span>
          <input disabled readOnly value={extracurricularName} />
        </label>
      </div>

      <fieldset className={styles.statusFieldset}>
        <legend>02 / Pilih status kehadiran</legend>
        <div className={styles.statusOptions}>
          <label
            className={attendanceStatus === "PRESENT" ? styles.selectedStatus : ""}
          >
            <input
              checked={attendanceStatus === "PRESENT"}
              name="status"
              onChange={() => setAttendanceStatus("PRESENT")}
              type="radio"
              value="PRESENT"
            />
            <span className={styles.statusIcon} aria-hidden="true">
              ✓
            </span>
            <span>
              <strong>Hadir</strong>
              <small>Saya mengikuti kegiatan hari ini.</small>
            </span>
          </label>

          <label
            className={attendanceStatus === "EXCUSED" ? styles.selectedStatus : ""}
          >
            <input
              checked={attendanceStatus === "EXCUSED"}
              name="status"
              onChange={() => setAttendanceStatus("EXCUSED")}
              type="radio"
              value="EXCUSED"
            />
            <span className={styles.statusIcon} aria-hidden="true">
              !
            </span>
            <span>
              <strong>Izin</strong>
              <small>Saya tidak dapat mengikuti kegiatan.</small>
            </span>
          </label>
        </div>
        {state.errors?.status ? (
          <p className={styles.fieldError}>{state.errors.status[0]}</p>
        ) : null}
      </fieldset>

      {attendanceStatus === "EXCUSED" ? (
        <label className={styles.reasonField}>
          <span>03 / Alasan izin</span>
          <textarea
            maxLength={500}
            minLength={5}
            name="reason"
            placeholder="Jelaskan alasan izin dengan singkat dan jelas..."
            required
            rows={5}
          />
          <small>Wajib diisi, minimal 5 dan maksimal 500 karakter.</small>
          {state.errors?.reason ? (
            <p className={styles.fieldError}>{state.errors.reason[0]}</p>
          ) : null}
        </label>
      ) : null}

      {attendanceStatus === "PRESENT" ? (
        <label className={styles.reasonField}>
          <span>03 / Kode kehadiran</span>
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={12}
            name="attendanceCode"
            placeholder="Masukkan kode dari pembina"
            required
          />
          <small>
            Kode diberikan admin/guru dan berlaku sampai {attendanceCodeExpiresAt ?? "batas waktu sesi"}.
          </small>
          {state.errors?.attendanceCode ? (
            <p className={styles.fieldError}>{state.errors.attendanceCode[0]}</p>
          ) : null}
        </label>
      ) : null}

      {state.message ? (
        <div
          className={`${styles.formMessage} ${
            state.status === "success" ? styles.messageSuccess : styles.messageError
          }`}
          role={state.status === "success" ? "status" : "alert"}
        >
          <strong>
            {state.status === "success" ? "Berhasil disimpan." : "Belum tersimpan."}
          </strong>
          <span>{state.message}</span>
        </div>
      ) : null}

      <button
        className={styles.submitButton}
        disabled={pending || !attendanceStatus}
        type="submit"
      >
        <span>{pending ? "Menyimpan..." : "Submit kehadiran"}</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
