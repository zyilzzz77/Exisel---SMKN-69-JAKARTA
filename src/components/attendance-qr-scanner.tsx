"use client";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAttendanceAction, type AttendanceState } from "@/actions/attendance";
import styles from "@/app/(student)/kehadiran/attendance.module.css";

const initialState: AttendanceState = { status: "idle", message: "" };

type CameraState = "idle" | "starting" | "ready" | "blocked" | "stopped";

// Progressive constraint fallback chain (rear HD -> rear basic -> front -> any)
const CAMERA_CONSTRAINTS: MediaStreamConstraints[] = [
  { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
  { audio: false, video: { facingMode: { ideal: "environment" } } },
  { audio: false, video: { facingMode: { ideal: "user" } } },
  { audio: false, video: true },
];

// Di Chrome Android, getUserMedia bisa MENGGANTUNG tanpa melempar error saat
// sistem tidak memunculkan prompt izin (contoh: izin pernah diblokir lewat
// pengaturan Android, atau prompt native tidak tampil). Tanpa batas waktu,
// UI berhenti di "Meminta izin kamera..." selamanya tanpa jalan keluar.
// Timeout ini memastikan user selalu mendapat panduan pemulihan + tombol retry.
const CAMERA_PERMISSION_TIMEOUT_MS = 15_000;

function isPermissionError(errName: string) {
  return errName === "NotAllowedError" || errName === "PermissionDeniedError" || errName === "SecurityError";
}

/**
 * Race getUserMedia dengan timeout. Jika getUserMedia menang, stream dipakai.
 * Jika timeout menang, getUserMedia yang masih menggantung tetap dibersihkan:
 * apabila akhirnya berhasil (mis. user mengizinkan lewat address bar saat
 * panduan tampil), stream-nya langsung dihentikan agar kamera tidak menyala
 * diam-diam di latar belakang.
 */
async function acquireStreamWithTimeout(
  acquire: () => Promise<MediaStream>,
): Promise<MediaStream> {
  const streamPromise = acquire();
  let timedOut = false;
  let timer: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      timedOut = true;
      reject(
        new DOMException(
          "Popup izin kamera tidak muncul tepat waktu.",
          "TimeoutError",
        ),
      );
    }, CAMERA_PERMISSION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([streamPromise, timeoutPromise]);
  } finally {
    window.clearTimeout(timer);
    void streamPromise
      .then((stream) => {
        if (timedOut) {
          stream.getTracks().forEach((track) => track.stop());
        }
      })
      .catch(() => undefined);
  }
}

function parseCameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "TimeoutError") {
    return (
      "Popup izin kamera tidak muncul. Buka izinnya manual: ketuk ikon izin " +
      "(gembok/kamera) di address bar Chrome sebelah kiri alamat situs, pilih " +
      "Izin > Kamera > Izinkan. Jika tidak ada, buka Pengaturan Android > " +
      "Aplikasi > Chrome > Izin > Kamera > Izinkan. Lalu tekan tombol coba lagi."
    );
  }
  if (isPermissionError(name)) {
    return "Izin kamera ditolak. Klik ikon kamera di address bar untuk mengizinkan, lalu coba lagi.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Kamera tidak terdeteksi pada perangkat ini.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Kamera sedang dipakai aplikasi/tab lain. Tutup aplikasi kamera lain lalu coba lagi.";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "Sensor kamera yang diminta tidak mendukung resolusi tersebut.";
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
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState("");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const isVerifyingRef = useRef(false);
  const lastScannedTokenRef = useRef("");
  const isFinishedRef = useRef(false);
  const mountedRef = useRef(true);
  const videoDevicesRef = useRef<MediaDeviceInfo[]>([]);
  const currentDeviceIndexRef = useRef(0);

  const cleanupCamera = useCallback(() => {
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
        video.load(); // WebKit / iOS Safari: release camera stream immediately
      } catch {
        // ignore load error during unmount
      }
    }
  }, []);

  const getReader = useCallback(() => {
    if (!readerRef.current) {
      readerRef.current = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
    }
    return readerRef.current;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Enumerate available cameras once (for the switch-camera button)
    void navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        if (!mountedRef.current) return;
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        videoDevicesRef.current = videoInputs;
        setHasMultipleCameras(videoInputs.length > 1);
      })
      .catch(() => {
        // enumeration is optional; ignore
      });

    return () => {
      mountedRef.current = false;
      cleanupCamera();
    };
  }, [cleanupCamera]);

  const verify = useCallback(
    async (token: string) => {
      setPending(true);
      const formData = new FormData();
      formData.set("extracurricularId", extracurricularId);
      formData.set("status", "PRESENT");
      formData.set("attendanceToken", token);
      formData.set("reason", "");

      const result = await submitAttendanceAction(initialState, formData);
      if (!mountedRef.current) return;

      setState(result);
      setPending(false);

      if (result.status === "success" || result.status === "alreadySubmitted") {
        isFinishedRef.current = true;
        cleanupCamera();
        setCameraState("stopped");
        router.refresh();
      } else {
        // Jika verifikasi gagal (misal QR kedaluwarsa), izinkan pemindaian QR baru setelah jeda singkat
        window.setTimeout(() => {
          isVerifyingRef.current = false;
          lastScannedTokenRef.current = "";
        }, 1200);
      }
    },
    [cleanupCamera, extracurricularId, router],
  );

  const acquireStream = useCallback(
    async (preferredDeviceId?: string): Promise<MediaStream> => {
      let lastErr: unknown = null;

      // If the user explicitly picked a camera device, try it first with exact id.
      if (preferredDeviceId) {
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { deviceId: { exact: preferredDeviceId } },
          });
        } catch (err) {
          lastErr = err;
          const name = err instanceof DOMException ? err.name : "";
          if (isPermissionError(name)) throw err;
        }
      }

      for (const constraints of CAMERA_CONSTRAINTS) {
        if (!mountedRef.current) break;
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          lastErr = err;
          const name = err instanceof DOMException ? err.name : "";
          // Do not retry lower constraints if user explicitly blocked camera permissions
          if (isPermissionError(name)) throw err;
        }
      }

      throw lastErr || new Error("Semua opsi kamera gagal dihubungi.");
    },
    [],
  );

  // startScanner is invoked from button click handlers so getUserMedia() runs
  // DIRECTLY inside a user gesture (required by iOS Safari / some Android WebViews).
  const startScanner = useCallback(
    async (preferredDeviceId?: string) => {
      if (isFinishedRef.current) return;

      cleanupCamera();
      isVerifyingRef.current = false;
      lastScannedTokenRef.current = "";
      setCameraState("starting");
      setCameraError("");

      if (!window.isSecureContext) {
        setCameraError("Kamera hanya dapat diakses melalui HTTPS atau localhost.");
        setCameraState("blocked");
        setIsSwitchingCamera(false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Browser ini tidak mendukung API kamera (MediaDevices).");
        setCameraState("blocked");
        setIsSwitchingCamera(false);
        return;
      }

      try {
        const stream = await acquireStreamWithTimeout(() =>
          acquireStream(preferredDeviceId),
        );
        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStreamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          cleanupCamera();
          setIsSwitchingCamera(false);
          return;
        }

        // Explicitly set playback attributes for iOS Safari / WebKit.
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "true");

        // Diagnostics: confirm the camera frames actually reach the video element.
        console.info("[scanner] stream video track:", {
          device: stream.getVideoTracks()[0]?.getSettings()?.deviceId,
          label: stream.getVideoTracks()[0]?.label ?? "(label tersembunyi)",
        });

        let scanAttemptCount = 0;

        const controls = await getReader().decodeFromStream(stream, video, (scanResult, scanError) => {
          if (!mountedRef.current || isFinishedRef.current) return;

          if (scanError) {
            // NotFoundException fires on EVERY frame without a QR — only log
            // occasionally so the console stays readable while proving the
            // scan loop is actually running.
            scanAttemptCount += 1;
            if (scanAttemptCount % 40 === 1) {
              console.info(`[scanner] memindai... (${scanAttemptCount} frame)`, scanError.name);
            }
            return;
          }

          const token = scanResult?.getText() ?? "";
          console.info("[scanner] QR terdeteksi:", token);
          if (
            !token ||
            !token.includes("/attendance/scan?") ||
            isVerifyingRef.current ||
            token === lastScannedTokenRef.current
          ) {
            if (token && !token.includes("/attendance/scan?")) {
              console.warn("[scanner] QR bukan token kehadiran, diabaikan.");
            }
            return;
          }

          isVerifyingRef.current = true;
          lastScannedTokenRef.current = token;
          void verify(token);
        });

        if (!mountedRef.current) {
          controls.stop();
          cleanupCamera();
          return;
        }

        controlsRef.current = controls;
        setIsSwitchingCamera(false);
        setCameraState("ready");
      } catch (err) {
        cleanupCamera();
        setIsSwitchingCamera(false);
        if (mountedRef.current) {
          setCameraError(parseCameraError(err));
          setCameraState("blocked");
        }
      }
    },
    [acquireStream, cleanupCamera, getReader, verify],
  );

  const handleStartCamera = () => {
    void startScanner();
  };

  const handleRetry = () => {
    void startScanner();
  };

  const handleSwitchCamera = () => {
    const devices = videoDevicesRef.current;
    if (devices.length < 2 || isSwitchingCamera) return;
    setIsSwitchingCamera(true);
    cleanupCamera();
    const nextIndex = (currentDeviceIndexRef.current + 1) % devices.length;
    currentDeviceIndexRef.current = nextIndex;
    void startScanner(devices[nextIndex].deviceId);
  };

  const showStartButton = cameraState === "idle";

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
                  : cameraState === "starting"
                    ? "Menyiapkan"
                    : "Siap"}
        </strong>
      </div>

      <div className={styles.cameraViewport}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ display: showStartButton || cameraState === "blocked" ? "none" : "block" }}
          onPlaying={() => {
            const v = videoRef.current;
            console.info("[scanner] video play aktif:", {
              videoWidth: v?.videoWidth,
              videoHeight: v?.videoHeight,
            });
          }}
        />
        <div className={styles.scanCorners} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>

        {showStartButton ? (
          <button className={styles.cameraStartButton} onClick={handleStartCamera} type="button">
            <span>Aktifkan Kamera</span>
            <small>Izinkan akses kamera saat diminta browser</small>
          </button>
        ) : null}

        {cameraState === "starting" ? (
          <p>
            Meminta izin kamera... Jika popup izin tidak muncul dalam beberapa
            detik, buka ikon izin di address bar, lalu izinkan kamera untuk
            situs ini.
          </p>
        ) : null}

        {cameraState === "blocked" ? (
          <div className={styles.cameraError} role="alert">
            <strong>Kamera belum dapat dibuka.</strong>
            <span>{cameraError || "Izinkan kamera di browser, lalu coba kembali."}</span>
            <button onClick={handleRetry} type="button">
              Coba buka kamera lagi
            </button>
          </div>
        ) : null}

        {cameraState === "ready" && hasMultipleCameras ? (
          <button
            className={styles.cameraSwitchButton}
            disabled={isSwitchingCamera}
            onClick={handleSwitchCamera}
            type="button"
          >
            {isSwitchingCamera ? "Mengganti..." : "Ganti kamera"}
          </button>
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
