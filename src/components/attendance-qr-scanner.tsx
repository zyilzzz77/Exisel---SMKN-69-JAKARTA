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
  const [cameraError, setCameraError] = useState("");
  const [restartKey, setRestartKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const rejectedTokenRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    let activeStream: MediaStream | null = null;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 100 });

    const stopCamera = () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      activeStream?.getTracks().forEach((track) => track.stop());
      activeStream = null;

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };

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
        stopCamera();
        setCameraState("stopped");
      } else {
        busyRef.current = false;
      }
    }

    async function start() {
      const video = videoRef.current;
      if (!video) return;

      busyRef.current = false;
      rejectedTokenRef.current = "";
      setCameraState("starting");
      setCameraError("");

      try {
        if (!window.isSecureContext) {
          throw new Error(
            "Kamera hanya dapat digunakan melalui HTTPS atau localhost pada perangkat yang sama.",
          );
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Browser ini tidak menyediakan akses kamera untuk halaman web.");
        }

        try {
          activeStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (preferredCameraError) {
          const errorName =
            preferredCameraError instanceof DOMException
              ? preferredCameraError.name
              : "";

          if (errorName === "NotAllowedError" || errorName === "SecurityError") {
            throw preferredCameraError;
          }

          activeStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }

        if (cancelled) {
          activeStream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.srcObject = activeStream;
        await video.play();

        const controls = reader.scan(video, (result) => {
            const token = result?.getText() ?? "";
            if (!token.startsWith("exisel://attendance?") || busyRef.current || token === rejectedTokenRef.current) return;
            busyRef.current = true;
            rejectedTokenRef.current = token;
            void verify(token);
          });
        if (cancelled) return controls.stop();
        controlsRef.current = controls;
        setCameraState("ready");
      } catch (error) {
        stopCamera();

        if (!cancelled) {
          const errorName = error instanceof DOMException ? error.name : "";
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Kamera gagal menampilkan gambar.";

          setCameraError(
            errorName === "NotAllowedError" || errorName === "SecurityError"
              ? "Izin kamera ditolak. Izinkan kamera untuk situs ini, lalu coba lagi."
              : errorName === "NotFoundError" || errorName === "DevicesNotFoundError"
                ? "Kamera tidak ditemukan pada perangkat ini."
                : errorName === "NotReadableError" || errorName === "TrackStartError"
                  ? "Kamera sedang digunakan aplikasi lain. Tutup aplikasi kamera lain, lalu coba lagi."
                  : message,
          );
          setCameraState("blocked");
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [extracurricularId, restartKey]);

  return (
    <section className={styles.scannerPanel} aria-labelledby="scanner-title">
      <div className={styles.scannerHeading}>
        <div><span>03 / Pindai QR kehadiran</span><h3 id="scanner-title">Arahkan kamera ke QR</h3></div>
        <strong className={styles.scannerBadge}>{pending ? "Memverifikasi" : cameraState === "ready" ? "Kamera aktif" : cameraState === "stopped" ? "Selesai" : cameraState === "blocked" ? "Perlu tindakan" : "Menyiapkan"}</strong>
      </div>
      <div className={styles.cameraViewport}>
        <video autoPlay muted playsInline ref={videoRef} />
        <div className={styles.scanCorners} aria-hidden="true"><i /><i /><i /><i /></div>
        {cameraState === "starting" ? <p>Meminta izin kamera...</p> : null}
        {cameraState === "blocked" ? (
          <div className={styles.cameraError} role="alert">
            <strong>Kamera belum dapat dibuka.</strong>
            <span>{cameraError || "Izinkan kamera di browser, lalu coba kembali."}</span>
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
