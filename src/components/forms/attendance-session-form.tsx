"use client";

import { useActionState } from "react";
import {
  generateAttendanceSessionAction,
  type AttendanceSessionState,
} from "@/actions/attendance-session";
import styles from "@/app/(admin)/admin/esktrakulikuler/[nama_eskul]/admin-eskul.module.css";

const initialState: AttendanceSessionState = { status: "idle", message: "" };

export function AttendanceSessionForm({ extracurricularId }: { extracurricularId: string }) {
  const [state, formAction, pending] = useActionState(
    generateAttendanceSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.sessionForm}>
      <input name="extracurricularId" type="hidden" value={extracurricularId} />
      <button disabled={pending} type="submit">
        {pending ? "Membuat kode..." : "Generate kode kehadiran"}
        <span aria-hidden="true">→</span>
      </button>
      {state.code ? (
        <output className={styles.codeOutput} aria-live="polite">
          <span>Kode sesi aktif</span>
          <strong>{state.code}</strong>
          <small>{state.message}</small>
        </output>
      ) : state.message ? (
        <p className={styles.sessionMessage} role="alert">{state.message}</p>
      ) : null}
    </form>
  );
}
