"use client";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAttendanceAction, type AttendanceState } from "@/actions/attendance";
import styles from "@/app/(student)/kehadiran/attendance.module.css";

const initialState: AttendanceState = { status: "idle", message: "" };

// Progressive constraint fallback chain (rear HD -> rear basic -> front -> any)
const CAMERA_CONSTRAINTS: MediaStreamConstraints[] = [
  { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
  { audio: false, video: { facingMode: { ideal: "environment" } } },
  { audio: false, video: { facingMode: { ideal: "user" } } },
  { audio: false, video: true },
];

function isPermissionError(errName: string) {
  return errName === "NotAllowedError" || errName === "PermissionDeniedError" || errName === "SecurityError";
}

function parseCameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (isPermissionError(name)) {
    return "Izin kamera ditolak. Buka pengaturan browser/perangkat untuk mengizinkan akses kamera.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Kamera tidak terdeteksi pada perangkat ini.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Kamera sedang dipakai aplikasi/tab lain atau belum dilepas sistem. Tutup aplikasi lain lalu coba lagi.";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "Resolusi atau sensor kamera yang diminta tidak didukung.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Kamera gagal menampilkan gambar.";
}

export function AttendanceQrScanner({
  extracurricularId,
  sessionActive,
}: {
  extracurricularId: string;
  sessionActive: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [cameraState, setCameraState] = useState<"starting" | "ready" | "blocked" | "stopped">("starting");
  const [cameraError, setCameraError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const isVerifyingRef = useRef(false);
  const lastScannedTokenRef = useRef("");
  const isFinishedRef = useRef(false);

  // Helper to completely release hardware & video element buffer across iOS/Android/macOS/Windows
  const cleanupCamera = () => {
    try {
      controlsRef.current?.stop();
    } catch {
      // ignore teardown errors from reader
    }
    controlsRef.current = null;

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track close error
        }
      });
      activeStreamRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
      try {
        video.load(); // Vital for WebKit / iOS Safari to release camera stream immediately
      } catch {
        // ignore load error during unmount
      }
    }
  };

  const handleManualRetry = () => {
    cleanupCamera();
    setRetryNonce((n) => n + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });

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
        isFinishedRef.current = true;
        cleanupCamera();
        setCameraState("stopped");
        router.refresh();
      } else {
        isVerifyingRef.current = false;
      }
    }

    async function acquireStream(): Promise<MediaStream> {
      let lastErr: unknown = null;

      for (const constraints of CAMERA_CONSTRAINTS) {
        if (cancelled) break;
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          lastErr = err;
          const name = err instanceof DOMException ? err.name : "";
          // Do not retry lower constraints if user explicitly blocked camera permissions
          if (isPermissionError(name)) {
            throw err;
          }
        }
      }

      throw lastErr || new Error("Semua opsi kamera gagal dihubungi.");
    }

    async function startScanner() {
      if (isFinishedRef.current) return;

      cleanupCamera();
      isVerifyingRef.current = false;
      lastScannedTokenRef.current = "";
      setCameraState("starting");
      setCameraError("");

      if (!window.isSecureContext) {
        setCameraError("Kamera hanya dapat diakses melalui koneksi aman (HTTPS / localhost).");
        setCameraState("blocked");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Browser ini tidak mendukung API kamera (MediaDevices).");
        setCameraState("blocked");
        return;
      }

      try {
        const stream = await acquireStream();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStreamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          cleanupCamera();
          return;
        }

        const controls = await reader.decodeFromStream(stream, video, (scanResult) => {
          if (cancelled || isFinishedRef.current) return;
          const token = scanResult?.getText() ?? "";
          if (
            !token ||
            !token.includes("/attendance/scan?") ||
            isVerifyingRef.current ||
            token === lastScannedTokenRef.current
          ) {
            return;
          }

          isVerifyingRef.current = true;
          lastScannedTokenRef.current = token;
          void verify(token);
        });

        if (cancelled) {
          controls.stop();
          cleanupCamera();
          return;
        }

        controlsRef.current = controls;
        setCameraState("ready");
      } catch (err) {
        cleanupCamera();
        if (!cancelled) {
          setCameraError(parseCameraError(err));
          setCameraState("blocked");
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      cleanupCamera();
    };
  }, [extracurricularId, retryNonce, router]);

  return (
    <section className={styles.scannerPanel} aria-labelledby="scanner-title">
      <div className={styles.scannerHeading}>
        <div>
          <span>03 / Pindai QR kehadiran</span>
          <h3 id="scanner-title">Arahkan kamera ke QR</h3>
        </div>
        <strong className={styles.scannerBadge}>
          {pending
            ? "Memverifikasi"
            : cameraState === "ready"
              ? "Kamera aktif"
              : cameraState === "stopped"
                ? "Selesai"
                : cameraState === "blocked"
                  ? "Perlu tindakan"
                  : "Menyiapkan"}
        </strong>
      </div>

      <div className={styles.cameraViewport}>
        <video
          autoPlay
          muted
          playsInline
          ref={videoRef}
        />
        <div className={styles.scanCorners} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        {cameraState === "starting" ? <p>Meminta izin kamera...</p> : null}
        {cameraState === "blocked" ? (
          <div className={styles.cameraError} role="alert">
            <strong>Kamera belum dapat dibuka.</strong>
            <span>{cameraError || "Izinkan kamera di browser, lalu coba kembali."}</span>
            <button onClick={handleManualRetry} type="button">
              Coba buka kamera lagi
            </button>
          </div>
        ) : null}
        {pending ? <div className={styles.scanProcessing}>Memeriksa QR terbaru...</div> : null}
      </div>

      <p className={styles.scannerHint}>
        Pemindaian berjalan otomatis. QR berganti setiap 25 detik dan QR lama langsung ditolak backend.
        {!sessionActive ? " Minta admin mengaktifkan sesi QR dahulu." : ""}
      </p>

      {state.message ? (
        <div
          className={`${styles.formMessage} ${
            state.status === "success" || state.status === "alreadySubmitted"
              ? styles.messageSuccess
              : styles.messageError
          }`}
          role={state.status === "success" ? "status" : "alert"}
        >
          <strong>
            {state.status === "success"
              ? "Kehadiran berhasil disimpan."
              : state.status === "alreadySubmitted"
                ? "Kehadiran sudah tercatat."
                : "QR belum diterima."}
          </strong>
          <span>{state.message}</span>
        </div>
      ) : null}
    </section>
  );
}
