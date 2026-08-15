"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAttendanceAction, type AttendanceState } from "@/actions/attendance";
import styles from "@/app/(student)/kehadiran/attendance.module.css";

const initialState: AttendanceState = { status: "idle", message: "" };

export function AttendanceQrScanner({ extracurricularId, sessionActive }: { extracurricularId: string; sessionActive: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [cameraState, setCameraState] = useState<"starting" | "ready" | "blocked" | "stopped">("starting");
  const [cameraError, setCameraError] = useState("");
  const [restartKey, setRestartKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const rejectedTokenRef = useRef("");
  const lastActivityRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let activeStream: MediaStream | null = null;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 300 });

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
        finishedRef.current = true;
        stopCamera();
        setCameraState("stopped");
        router.refresh();
      } else {
        busyRef.current = false;
      }
    }

    async function start() {
      const video = videoRef.current;
      if (!video) return;

      busyRef.current = false;
      rejectedTokenRef.current = "";
      lastActivityRef.current = Date.now();
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

        await new Promise<void>((resolve) => {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
            resolve();
            return;
          }
          const onReady = () => {
            if (video.videoWidth > 0) {
              video.removeEventListener("canplay", onReady);
              resolve();
            }
          };
          video.addEventListener("canplay", onReady);
        });

        const controlsPromise = reader.decodeFromVideoElement(video, (result) => {
            lastActivityRef.current = Date.now();
            const token = result?.getText() ?? "";
            if (!token.includes("/attendance/scan?") || busyRef.current || token === rejectedTokenRef.current) return;
            busyRef.current = true;
            rejectedTokenRef.current = token;
            void verify(token);
          });
        if (cancelled) return void controlsPromise.then((controls) => controls.stop());
        controlsPromise.then((controls) => {
          if (cancelled) {
            controls.stop();
            return;
          }
          controlsRef.current = controls;
          setCameraState("ready");
        });
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

    const watchdog = window.setInterval(() => {
      if (cancelled || finishedRef.current) return;
      if (controlsRef.current && Date.now() - lastActivityRef.current > 12_000) {
        controlsRef.current.stop();
        controlsRef.current = null;
        setRestartKey((value) => value + 1);
      }
    }, 4_000);

    return () => {
      cancelled = true;
      window.clearInterval(watchdog);
      stopCamera();
    };
  }, [extracurricularId, restartKey, router]);

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
      <p className={styles.scannerHint}>Pemindaian berjalan otomatis. QR berganti setiap 25 detik dan QR lama langsung ditolak backend.{!sessionActive ? " Minta admin mengaktifkan sesi QR dahulu." : ""}</p>
      {state.message ? (
        <div className={`${styles.formMessage} ${state.status === "success" || state.status === "alreadySubmitted" ? styles.messageSuccess : styles.messageError}`} role={state.status === "success" ? "status" : "alert"}>
          <strong>{state.status === "success" ? "Kehadiran berhasil disimpan." : state.status === "alreadySubmitted" ? "Kehadiran sudah tercatat." : "QR belum diterima."}</strong>
          <span>{state.message}</span>
        </div>
      ) : null}
    </section>
  );
}
