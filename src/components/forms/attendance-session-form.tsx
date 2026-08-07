"use client";

import { useActionState } from "react";
import {
  finishAttendanceSessionAction,
  generateAttendanceSessionAction,
  type AttendanceSessionState,
} from "@/actions/attendance-session";
import styles from "@/app/(admin)/admin/esktrakulikuler/[nama_eskul]/admin-eskul.module.css";

const initialState: AttendanceSessionState = { status: "idle", message: "" };

export function AttendanceSessionForm({
  active,
  extracurricularId,
}: {
  active: boolean;
  extracurricularId: string;
}) {
  const [state, formAction, pending] = useActionState(
    active ? finishAttendanceSessionAction : generateAttendanceSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.sessionForm}>
      <input name="extracurricularId" type="hidden" value={extracurricularId} />
      <button disabled={pending} type="submit">
        {pending
          ? active
            ? "Menyelesaikan sesi..."
            : "Mengaktifkan QR..."
          : active
            ? "Selesai"
            : "Aktifkan QR dinamis"}
        <span aria-hidden="true">→</span>
      </button>
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? styles.sessionMessageError
              : styles.sessionMessage
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
