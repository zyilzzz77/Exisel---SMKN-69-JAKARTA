"use client";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAttendanceAction, type AttendanceState } from "@/actions/attendance";
import { useCamera } from "@/lib/camera";
import styles from "@/app/(student)/kehadiran/attendance.module.css";

const initialState: AttendanceState = { status: "idle", message: "" };

/** State kamera yang menampilkan panel pemulihan (plan Phase 5). */
const RECOVERY_STATES = new Set([
  "denied",
  "blocked",
  "unavailable",
  "busy",
  "timeout",
  "error",
]);

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
  const [finished, setFinished] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const camera = useCamera(videoRef);
  const { state: cameraState, errorCopy, start, stop, streamRef } = camera;

  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const isVerifyingRef = useRef(false);
  const lastScannedTokenRef = useRef("");
  const isFinishedRef = useRef(false);
  const mountedRef = useRef(true);
  const videoDevicesRef = useRef<MediaDeviceInfo[]>([]);
  const currentDeviceIndexRef = useRef(0);
  const devicesEnumeratedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        controlsRef.current?.stop();
      } catch {
        // ignore teardown errors
      }
      controlsRef.current = null;
    };
  }, []);

  // Plan Phase 2: enumerateDevices() HANYA setelah stream berhasil didapat,
  // tidak pernah saat mount.
  useEffect(() => {
    if (cameraState !== "active" || devicesEnumeratedRef.current) return;
    devicesEnumeratedRef.current = true;

    void navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        if (!mountedRef.current) return;
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        videoDevicesRef.current = videoInputs;
        setHasMultipleCameras(videoInputs.length > 1);
      })
      .catch(() => {
        // enumeration hanya untuk tombol ganti kamera; kegagalan tidak fatal
      });
  }, [cameraState]);

  const getReader = useCallback(() => {
    if (!readerRef.current) {
      readerRef.current = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 250,
      });
    }
    return readerRef.current;
  }, []);

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
        setFinished(true);
        try {
          controlsRef.current?.stop();
        } catch {
          // ignore teardown errors
        }
        controlsRef.current = null;
        stop();
        router.refresh();
      } else {
        // Jika verifikasi gagal (misal QR kedaluwarsa), izinkan pemindaian QR baru setelah jeda singkat
        window.setTimeout(() => {
          isVerifyingRef.current = false;
          lastScannedTokenRef.current = "";
        }, 1200);
      }
    },
    [extracurricularId, router, stop],
  );

  // Plan Phase 7: decoder QR HANYA start setelah stream aktif (state active),
  // tidak pernah saat permission masih requesting.
  useEffect(() => {
    if (cameraState !== "active" || isFinishedRef.current) return;
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return;

    let cancelled = false;
    let scanAttemptCount = 0;

    void getReader()
      .decodeFromStream(stream, video, (scanResult, scanError) => {
        if (!mountedRef.current || isFinishedRef.current) return;

        if (scanError) {
          // NotFoundException menyala di SETIAP frame tanpa QR — log sekali
          // tiap 40 frame supaya console tetap terbaca dan membuktikan loop
          // pemindaian benar-benar berjalan.
          scanAttemptCount += 1;
          if (scanAttemptCount % 40 === 1) {
            console.info(`[camera] scanning frame=${scanAttemptCount} ${scanError.name}`);
          }
          return;
        }

        const token = scanResult?.getText() ?? "";
        if (
          !token ||
          !token.includes("/attendance/scan?") ||
          isVerifyingRef.current ||
          token === lastScannedTokenRef.current
        ) {
          if (token && !token.includes("/attendance/scan?")) {
            console.warn("[camera] qr_ignored_not_attendance");
          }
          return;
        }

        // Plan: DILARANG log isi token QR.
        console.info("[camera] qr_detected");
        isVerifyingRef.current = true;
        lastScannedTokenRef.current = token;
        void verify(token);
      })
      .then((controls) => {
        if (cancelled || !mountedRef.current) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        console.info("[camera] camera_decoder_started");
      })
      .catch(() => {
        // Decoder gagal start; kamera tetap menyala dan user bisa retry.
      });

    return () => {
      cancelled = true;
      try {
        controlsRef.current?.stop();
      } catch {
        // ignore teardown errors
      }
      controlsRef.current = null;
    };
  }, [cameraState, getReader, streamRef, verify]);

  // Dipanggil LANGSUNG dari user gesture supaya Chrome Android menampilkan
  // prompt izin kamera (plan Phase 3).
  const handleStartCamera = async () => {
    console.info("[camera] camera_click", { source: "start" });
    isVerifyingRef.current = false;
    lastScannedTokenRef.current = "";
    await start();
  };

  const handleRetry = async () => {
    console.info("[camera] camera_click", { source: "retry" });
    isVerifyingRef.current = false;
    lastScannedTokenRef.current = "";
    devicesEnumeratedRef.current = false;
    await start();
  };

  const handleSwitchCamera = async () => {
    const devices = videoDevicesRef.current;
    if (devices.length < 2 || cameraState !== "active") return;
    console.info("[camera] camera_click", { source: "switch" });
    stop();
    const nextIndex = (currentDeviceIndexRef.current + 1) % devices.length;
    currentDeviceIndexRef.current = nextIndex;
    await start({ deviceId: devices[nextIndex].deviceId });
  };

  const showRecovery = RECOVERY_STATES.has(cameraState) && !finished;
  const showVideo = cameraState === "active" && !finished;

  const badge = pending
    ? "Memverifikasi"
    : finished
      ? "Selesai"
      : cameraState === "active"
        ? "Kamera aktif"
        : showRecovery
          ? "Perlu tindakan"
          : cameraState === "requesting"
            ? "Menyiapkan"
            : "Siap";

  return (
    <section className={styles.scannerPanel} aria-labelledby="scanner-title">
      <div className={styles.scannerHeading}>
        <div>
          <span>03 / Pindai QR kehadiran</span>
          <h3 id="scanner-title">Arahkan kamera ke QR</h3>
        </div>
        <strong className={styles.scannerBadge}>{badge}</strong>
      </div>

      <div className={styles.cameraViewport}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ display: showVideo ? "block" : "none" }}
          onPlaying={() => {
            const v = videoRef.current;
            console.info("[camera] video_playing", {
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

        {cameraState === "idle" && !finished ? (
          <button
            className={styles.cameraStartButton}
            onClick={() => void handleStartCamera()}
            type="button"
          >
            <span>Aktifkan Kamera</span>
            <small>Izinkan akses kamera saat diminta browser</small>
          </button>
        ) : null}

        {cameraState === "requesting" ? (
          <p>
            Meminta izin kamera... Jika popup izin tidak muncul dalam beberapa
            detik, buka ikon izin di address bar, lalu izinkan kamera untuk
            situs ini.
          </p>
        ) : null}

        {showRecovery ? (
          <div className={styles.cameraError} role="alert">
            <strong>{errorCopy?.title ?? "Kamera belum dapat dibuka."}</strong>
            <span style={{ whiteSpace: "pre-line" }}>
              {errorCopy?.description ?? "Izinkan kamera di browser, lalu coba kembali."}
            </span>
            <button onClick={() => void handleRetry()} type="button">
              Coba Lagi
            </button>
            <button onClick={() => router.push("/kehadiran")} type="button">
              Kembali
            </button>
          </div>
        ) : null}

        {showVideo && hasMultipleCameras ? (
          <button
            className={styles.cameraSwitchButton}
            onClick={() => void handleSwitchCamera()}
            type="button"
          >
            Ganti kamera
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
