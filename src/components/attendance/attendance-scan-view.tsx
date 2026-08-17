"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/attendance/attendance.module.css";

type ScanResponse = {
  status?: string;
  error?: string;
  extracurricularId?: string;
  programName?: string;
  checkedInAt?: string;
  message?: string;
  requestId?: string;
};

// Batas waktu tunggu submit agar user selalu bisa menekan "Coba lagi"
// saat jaringan menggantung (plan §21 timeout recovery).
const SUBMIT_TIMEOUT_MS = 30_000;

export function AttendanceScanView({
  payload,
}: {
  payload: string;
}) {
  const [state, setState] = useState<"processing" | "network_error">("processing");
  const [message, setMessage] = useState("Menghubungkan ke server...");
  // SATU QR = SATU POST (plan §41): guard one-shot submit. Guard ini hanya
  // di-reset oleh user lewat tombol "Coba lagi", tidak pernah otomatis, supaya
  // tidak ada double-submit buta saat recovery (plan §21).
  const attemptedRef = useRef(false);
  const [retrying, setRetrying] = useState(false);

  const submit = useCallback(async () => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      setState("processing");
      setMessage("Memproses kehadiranmu... jangan tutup halaman ini.");

      const response = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: payload }),
        cache: "no-store",
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => ({}))) as ScanResponse;

      if (response.ok && (result.status === "success" || result.status === "already_attended")) {
        const query = new URLSearchParams({
          ekskul: result.extracurricularId ?? "",
          already: result.status === "already_attended" ? "1" : "",
          programName: result.programName ?? "Ekskul",
          checkedInAt: result.checkedInAt ?? "",
        });
        // Gunakan navigasi penuh agar halaman kehadiran selalu dirender ulang dari
        // server dengan data terbaru, sehingga form otomatis terkunci setelah scan.
        window.location.replace(`/kehadiran?${query.toString()}`);
        return;
      }

      if (result.error === "LOGIN_REQUIRED") {
        // Server sudah menyimpan AttendanceIntent + cookie; arahkan ke /login.
        // Setelah OAuth, callback mendeteksi cookie intent dan membawa siswa
        // ke /attendance/resume, sehingga QR tetap terbawa (plan §11).
        window.location.replace("/login");
        return;
      }

      // Reject deterministik dari server: teruskan kode + pesan ke halaman
      // error (plan §22). requestId opsional ikut diteruskan sebagai kode
      // referensi. Jangan log payload/token.
      // Fallback kode: response 5xx tanpa kode JSON (mis. halaman error
      // Next.js) dipetakan ke SERVER_ERROR, bukan QR_INVALID, agar kegagalan
      // server tidak disalahartikan sebagai QR tidak valid (plan §6).
      let errorCode = result.error;
      if (!errorCode) errorCode = response.status >= 500 ? "SERVER_ERROR" : "QR_INVALID";
      const errorQuery = new URLSearchParams({ code: errorCode });
      if (result.message) errorQuery.set("message", result.message);
      if (result.requestId) errorQuery.set("requestId", result.requestId);
      window.location.replace(`/attendance/error?${errorQuery.toString()}`);
    } catch {
      // Network error / timeout: jangan auto-refresh dan jangan re-submit
      // otomatis. Buka guard agar user bisa menekan "Coba lagi" satu kali
      // (plan §21).
      attemptedRef.current = false;
      setState("network_error");
      setMessage("Tidak dapat menghubungi server. Periksa koneksimu lalu coba lagi.");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [payload]);

  useEffect(() => {
    // Selalu kirim token ke server (GET hanya bootstrap, POST satu-satunya
    // mutasi — plan §19). Jika belum login, API membuat intent absensi lalu
    // mengarahkan ke /login; setelah login siswa dilanjutkan ke
    // /attendance/resume (keanggotaan ekskul tetap divalidasi ulang).
    const initialSubmit = window.setTimeout(() => void submit(), 0);
    return () => window.clearTimeout(initialSubmit);
  }, [submit]);

  const handleRetry = useCallback(() => {
    // Retry hanya terjadi lewat aksi eksplisit user, sekali per klik.
    if (attemptedRef.current || retrying) return;
    setRetrying(true);
    void submit().finally(() => setRetrying(false));
  }, [retrying, submit]);

  if (state === "network_error") {
    return (
      <main className={styles.page}>
        <section className={`${styles.card} ${styles.errorCard}`} aria-live="polite">
          <p className={styles.step}>Absensi QR</p>
          <h1>Koneksi terputus.</h1>
          <p>
            Absenmu belum tersimpan karena server tidak tercapai. Tekan tombol
            di bawah untuk mengirim ulang sekali — QR yang sama masih berlaku
            selagi sesi absensi aktif.
          </p>
          <div className={styles.errorActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleRetry}
              disabled={retrying}
            >
              Coba lagi
            </button>
            <a className={styles.secondaryButton} href="/kehadiran">
              Buka halaman kehadiran
            </a>
          </div>
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
