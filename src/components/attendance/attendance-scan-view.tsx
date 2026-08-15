"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/attendance/attendance.module.css";

export function AttendanceScanView({
  payload,
  requiresLogin,
}: {
  payload: string;
  requiresLogin: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"processing" | "error">("processing");
  const [message, setMessage] = useState("Menghubungkan ke server...");
  const attemptedRef = useRef(false);

  const submit = useCallback(async () => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    try {
      const response = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: payload }),
        cache: "no-store",
      });
      const result = (await response.json().catch(() => ({}))) as {
        status?: string;
        error?: string;
        extracurricularId?: string;
        programName?: string;
        checkedInAt?: string;
        message?: string;
      };

      if (response.ok && (result.status === "success" || result.status === "already_attended")) {
        const query = new URLSearchParams({
          ekskul: result.extracurricularId ?? "",
          already: result.status === "already_attended" ? "1" : "",
          programName: result.programName ?? "Ekskul",
          checkedInAt: result.checkedInAt ?? "",
        });
        router.replace(`/kehadiran?${query.toString()}`);
        return;
      }

      if (result.error === "LOGIN_REQUIRED") {
        router.replace("/login");
        return;
      }

      const query = new URLSearchParams({
        code: result.error ?? "QR_INVALID",
        message: result.message ?? "QR absensi tidak valid.",
      });
      router.replace(`/attendance/error?${query.toString()}`);
    } catch {
      setState("error");
      setMessage("Tidak dapat menghubungi server. Periksa koneksimu.");
    }
  }, [router, payload]);

  useEffect(() => {
    if (requiresLogin) return;
    const initialSubmit = window.setTimeout(() => void submit(), 0);
    return () => window.clearTimeout(initialSubmit);
  }, [requiresLogin, submit]);

  if (state === "error") {
    const query = new URLSearchParams({ message });
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.step}>Absensi QR</p>
          <h1>QR absensi tidak berlaku.</h1>
          <p>{message}</p>
          <a className={styles.primaryButton} href={`/attendance/error?${query.toString()}`}>
            Lihat detail
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-live="polite">
        <p className={styles.step}>Absensi QR</p>
        <h1>Memproses kehadiran...</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}