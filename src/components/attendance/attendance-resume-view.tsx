"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/attendance/attendance.module.css";

export function AttendanceResumeView() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function resume() {
      try {
        const response = await fetch("/api/attendance/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          status?: string;
          error?: string;
          extracurricularId?: string;
          programName?: string;
          checkedInAt?: string;
          message?: string;
        };

        if (cancelled) return;

        if (response.ok && (payload.status === "success" || payload.status === "already_attended")) {
          const query = new URLSearchParams({
            ekskul: payload.extracurricularId ?? "",
            already: payload.status === "already_attended" ? "1" : "",
            programName: payload.programName ?? "Ekskul",
            checkedInAt: payload.checkedInAt ?? "",
          });
          // Navigasi penuh agar halaman kehadiran selalu dirender ulang dari server.
          window.location.replace(`/kehadiran?${query.toString()}`);
          return;
        }

        if (payload.error === "NO_PENDING_INTENT") {
          router.replace("/dashboard");
          return;
        }

        const query = new URLSearchParams({
          code: payload.error ?? "INTENT_INVALID",
          message: payload.message ?? "Absensi tidak dapat diselesaikan.",
        });
        router.replace(`/attendance/error?${query.toString()}`);
      } catch {
        if (!cancelled) {
          const query = new URLSearchParams({
            code: "UNAVAILABLE",
            message: "Tidak dapat menghubungi server. Coba lagi.",
          });
          router.replace(`/attendance/error?${query.toString()}`);
        }
      }
    }

    void resume();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-live="polite">
        <p className={styles.step}>Selesaikan Absensi</p>
        <h1>Menyelesaikan kehadiranmu...</h1>
        <p>Absensi QR yang kamu pindai akan segera dicatat.</p>
      </section>
    </main>
  );
}