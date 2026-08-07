"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { submitAttendanceAction, type AttendanceState } from "@/actions/attendance";
import styles from "@/app/(student)/kehadiran/attendance.module.css";

const initialState: AttendanceState = { status: "idle", message: "" };

export function AttendanceQrScanner({ extracurricularId, sessionActive }: { extracurricularId: string; sessionActive: boolean }) {
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [cameraState, setCameraState] = useState<"starting" | "ready" | "blocked" | "stopped">("starting");
  const [restartKey, setRestartKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const rejectedTokenRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 100 });

    async function verify(token: string) {
      setPending(true);
      const formData = new FormData();
      formData.set("extracurricularId", extracurricularId);
      formData.set("status", "PRESENT");
      formData.set("attendanceToken", token);
      formData.set("reason", "");
      const result = await submitAttendanceAction(initialState, formData);
      if (cancelled) return;
      setState(result);
      setPending(false);
      if (result.status === "success" || result.status === "alreadySubmitted") {
        controlsRef.current?.stop();
        setCameraState("stopped");
      } else {
        busyRef.current = false;
      }
    }

    async function start() {
      if (!videoRef.current) return;
      setCameraState("starting");
      try {
        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result) => {
            const token = result?.getText() ?? "";
            if (!token.startsWith("exisel://attendance?") || busyRef.current || token === rejectedTokenRef.current) return;
            busyRef.current = true;
            rejectedTokenRef.current = token;
            void verify(token);
          },
        );
        if (cancelled) return controls.stop();
        controlsRef.current = controls;
        setCameraState("ready");
      } catch {
        if (!cancelled) setCameraState("blocked");
      }
    }

    void start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [extracurricularId, restartKey]);

  return (
    <section className={styles.scannerPanel} aria-labelledby="scanner-title">
      <div className={styles.scannerHeading}>
        <div><span>03 / Pindai QR kehadiran</span><h3 id="scanner-title">Arahkan kamera ke QR</h3></div>
        <strong className={styles.scannerBadge}>{pending ? "Memverifikasi" : cameraState === "ready" ? "Kamera aktif" : cameraState === "stopped" ? "Selesai" : "Menyiapkan"}</strong>
      </div>
      <div className={styles.cameraViewport}>
        <video muted playsInline ref={videoRef} />
        <div className={styles.scanCorners} aria-hidden="true"><i /><i /><i /><i /></div>
        {cameraState === "starting" ? <p>Meminta izin kamera...</p> : null}
        {cameraState === "blocked" ? (
          <div className={styles.cameraError} role="alert">
            <strong>Kamera belum dapat dibuka.</strong>
            <span>Izinkan kamera di browser. Jika memakai alamat IP HTTP, gunakan HTTPS atau buka melalui localhost.</span>
            <button onClick={() => setRestartKey((value) => value + 1)} type="button">Coba buka kamera lagi</button>
          </div>
        ) : null}
        {pending ? <div className={styles.scanProcessing}>Memeriksa QR terbaru...</div> : null}
      </div>
      <p className={styles.scannerHint}>Pemindaian berjalan otomatis. QR berganti setiap 4 detik dan QR lama langsung ditolak backend.{!sessionActive ? " Minta admin mengaktifkan sesi QR dahulu." : ""}</p>
      {state.message ? (
        <div className={`${styles.formMessage} ${state.status === "success" || state.status === "alreadySubmitted" ? styles.messageSuccess : styles.messageError}`} role={state.status === "success" ? "status" : "alert"}>
          <strong>{state.status === "success" ? "Kehadiran berhasil disimpan." : state.status === "alreadySubmitted" ? "Kehadiran sudah tercatat." : "QR belum diterima."}</strong>
          <span>{state.message}</span>
        </div>
      ) : null}
    </section>
  );
}
