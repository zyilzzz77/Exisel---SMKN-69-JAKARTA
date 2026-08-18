"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { cameraErrorCopy, classifyCameraError, stateForCameraError } from "./errors";
import type { CameraErrorCode, CameraState } from "./types";

/**
 * Kontrak constraints getUserMedia.
 * Percobaan pertama memilih kamera belakang secara halus (ideal, bukan exact).
 * HANYA jika percobaan pertama gagal karena OverconstrainedError,
 * controller mencoba sekali dengan { video: true }.
 * Setelah NotAllowedError JANGAN ada retry generic — user harus
 * mengubah izin di pengaturan browser/perangkat dulu.
 *
 * Sumber: plans/plans_android_camera_root_cause_fix.md §Phase 3.
 */
export const PRIMARY_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: "environment" } },
};

export const FALLBACK_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: true,
};

export function primaryConstraints(deviceId?: string): MediaStreamConstraints {
  if (!deviceId) return PRIMARY_CONSTRAINTS;
  return { audio: false, video: { deviceId: { exact: deviceId } } };
}

export function getVisibilityState(): string {
  return typeof document !== "undefined" ? document.visibilityState : "unknown";
}

/**
 * Diagnostic events non-sensitive (plan §Phase 1).
 * Event: camera_gum_requested, camera_gum_resolved, camera_gum_rejected,
 * camera_timeout, camera_video_ready, camera_decoder_started, camera_cleanup.
 * DILARANG log: QR token, session cookie, auth header, attendance payload,
 * data personal user.
 */
export function emitCameraDiagnostic(
  event: string,
  detail: Record<string, unknown> = {},
): void {
  try {
    // eslint-disable-next-line no-console -- saluran diagnostik kamera yang disengaja
    console.info(`[camera] ${event}`, detail);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("exisel:camera-diagnostic", { detail: { event, ...detail } }),
      );
    }
  } catch {
    // diagnostics tidak boleh mengacaukan kamera
  }
}

/**
 * getUserMedia di Chrome Android bisa MENGGANTUNG tanpa resolve/reject saat
 * popup izin tidak dimunculkan sistem (izin pernah diblokir lewat pengaturan
 * Android, atau prompt native tidak tampil). Tanpa batas waktu, UI berhenti
 * "requesting" selamanya. Race dengan timeout menghasilkan
 * CAMERA_PERMISSION_TIMEOUT yang deterministik (RC-G).
 */
export const PERMISSION_TIMEOUT_MS = 15_000;

/**
 * Batas waktu tunggu video readiness setelah getUserMedia resolve.
 * Soft timeout: jika terlampaui, kamera tetap dianggap active
 * (plan §RC-H: permission bukan akar masalah jika gum resolve).
 */
export const VIDEO_READY_TIMEOUT_MS = 5_000;

export interface CameraControllerOptions {
  /** Elemen video tempat stream dipasang; null jika belum ada di DOM. */
  getVideo: () => HTMLVideoElement | null;
  /** Pengganti getUserMedia (dependency injection untuk unit test). */
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  /** Pengganti pengecekan konteks aman (di browser memakai window.isSecureContext). */
  getIsSecureContext?: () => boolean;
  /** Batas waktu tunggu getUserMedia. */
  permissionTimeoutMs?: number;
  /** Batas waktu tunggu video readiness. */
  videoReadyTimeoutMs?: number;
  /** Pengganti setTimeout untuk unit test deterministik. */
  setTimeoutFn?: (fn: () => void, ms: number) => number;
  /** Pengganti clearTimeout untuk unit test deterministik. */
  clearTimeoutFn?: (id: number) => void;
}

export interface CameraController {
  getState(): CameraState;
  getError(): CameraErrorCode | null;
  getStream(): MediaStream | null;
  /**
   * Memulai kamera. HANYA dipanggil dari user gesture.
   * options.deviceId dipakai HANYA untuk switch kamera (exact id)
   * SETELAH enumerateDevices berhasil.
   */
  start(options?: { deviceId?: string }): Promise<{
    started: boolean;
    code: CameraErrorCode | null;
  }>;
  stop(): void;
}

/**
 * Controller kamera murni — bebas React sehingga bisa diuji langsung dengan
 * node:test/tsx, tanpa renderer. Hook useCamera pembungkus tipisnya.
 */
export function createCameraController(
  options: CameraControllerOptions,
): CameraController {
  let state: CameraState = "idle";
  let error: CameraErrorCode | null = null;
  let stream: MediaStream | null = null;
  let requestSeq = 0;

  const timeoutMs = options.permissionTimeoutMs ?? PERMISSION_TIMEOUT_MS;
  const videoReadyTimeoutMs = options.videoReadyTimeoutMs ?? VIDEO_READY_TIMEOUT_MS;
  const setTimer = options.setTimeoutFn ?? ((fn, ms) => window.setTimeout(fn, ms));
  const clearTimer = options.clearTimeoutFn ?? ((id) => window.clearTimeout(id));

  function setState(next: CameraState, nextError: CameraErrorCode | null): void {
    state = next;
    error = nextError;
  }

  /**
   * Race getUserMedia dengan timeout. Jika timeout menang, getUserMedia yang
   * masih menggantung tetap dibersihkan: bila akhirnya berhasil, stream-nya
   * langsung dihentikan agar kamera tidak menyala diam-diam.
   */
  async function acquireStreamWithTimeout(
    acquire: () => Promise<MediaStream>,
    constraintMode: string,
  ): Promise<MediaStream> {
    const streamPromise = acquire();
    let timedOut = false;
    let timerId: number | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimer(() => {
        timedOut = true;
        emitCameraDiagnostic("camera_timeout", { constraintMode, timeoutMs });
        reject(
          new DOMException(
            "Popup izin kamera tidak muncul tepat waktu.",
            "TimeoutError",
          ),
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([streamPromise, timeoutPromise]);
    } finally {
      if (timerId !== undefined) clearTimer(timerId);
      void streamPromise
        .then((resolvedStream) => {
          if (timedOut) {
            resolvedStream.getTracks().forEach((track) => track.stop());
          }
        })
        .catch(() => undefined);
    }
  }

  /**
   * Menunggu video readiness (plan Phase 7).
   * Urutan: readyState>=1 -> langsung siap; else loadedmetadata/canplay once.
   * Soft timeout: jika VIDEO_READY_TIMEOUT_MS terlampaui, lanjut saja —
   * getUserMedia sudah resolve jadi permission bukan akar masalah (RC-H).
   */
  function waitVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise<void>((resolve) => {
      if (video.readyState >= 1) {
        resolve();
        return;
      }

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimer(timerId);
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("canplay", onReady);
        resolve();
      };
      const onReady = () => finish();
      const timerId = setTimer(finish, videoReadyTimeoutMs);

      video.addEventListener("loadedmetadata", onReady, { once: true });
      video.addEventListener("canplay", onReady, { once: true });
    });
  }

  async function start(
    startOptions?: { deviceId?: string },
  ): Promise<{ started: boolean; code: CameraErrorCode | null }> {
    // Guard: jangan pernah ada dua request kamera berjalan bersamaan.
    if (state === "requesting") {
      return { started: false, code: error };
    }

    const seq = ++requestSeq;

    const secure = options.getIsSecureContext
      ? options.getIsSecureContext()
      : window.isSecureContext;
    const mediaDevicesAvailable = Boolean(
      typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function",
    );

    if (!secure) {
      setState("blocked", "INSECURE_CONTEXT");
      return { started: false, code: "INSECURE_CONTEXT" };
    }

    const getUserMedia =
      options.getUserMedia ??
      (mediaDevicesAvailable
        ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
        : undefined);
    if (!getUserMedia) {
      setState("unavailable", "MEDIA_DEVICES_UNAVAILABLE");
      return { started: false, code: "MEDIA_DEVICES_UNAVAILABLE" };
    }

    const deviceId = startOptions?.deviceId;
    const constraintMode = deviceId ? "exact-device" : "environment-ideal";

    // Stream sisa dari percobaan sebelumnya dihentikan dulu supaya tidak
    // bocor dan menyebabkan busy.
    const previous = stream;
    stream = null;
    stopTracks(previous);
    const previousVideo = options.getVideo();
    if (previousVideo) {
      previousVideo.srcObject = null;
    }

    setState("requesting", null);

    emitCameraDiagnostic("camera_gum_requested", {
      constraintMode,
      isSecureContext: secure,
      visibilityState: getVisibilityState(),
      mediaDevicesAvailable,
    });

    let acquired: MediaStream;
    try {
      try {
        acquired = await acquireStreamWithTimeout(
          () => getUserMedia(primaryConstraints(deviceId)),
          constraintMode,
        );
      } catch (firstAttemptError) {
        const firstCode = classifyCameraError(firstAttemptError);
        if (
          firstCode === "PERMISSION_DENIED" ||
          firstCode === "POLICY_BLOCKED"
        ) {
          throw firstAttemptError;
        }
        if (firstCode !== "OVERCONSTRAINED") {
          throw firstAttemptError;
        }
        acquired = await acquireStreamWithTimeout(
          () => getUserMedia(FALLBACK_CONSTRAINTS),
          "video-true-fallback",
        );
      }

      emitCameraDiagnostic("camera_gum_resolved", { constraintMode });
    } catch (requestError) {
      if (seq !== requestSeq) {
        stopTracks(stream);
        stream = null;
        return { started: false, code: null };
      }
      const errName =
        requestError instanceof DOMException || requestError instanceof Error
          ? requestError.name
          : "";
      emitCameraDiagnostic("camera_gum_rejected", {
        errorName: errName,
        errorMessage: sanitizeMessage(requestError),
        constraintMode,
        isSecureContext: secure,
        visibilityState: getVisibilityState(),
        mediaDevicesAvailable,
      });
      const code = classifyCameraError(requestError);
      setState(stateForCameraError(code), code);
      return { started: false, code };
    }

    if (seq !== requestSeq) {
      stopTracks(acquired);
      return { started: false, code: null };
    }

    stream = acquired;

    const video = options.getVideo();
    if (video) {
      video.srcObject = acquired;
      try {
        await video.play();
      } catch {
        // Kegagalan play() jangan menyandera stream: track tetap hidup.
      }
      await waitVideoReady(video);
      emitCameraDiagnostic("camera_video_ready", {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
      });
    }

    if (seq !== requestSeq) {
      stopTracks(stream);
      stream = null;
      return { started: false, code: null };
    }

    setState("active", null);
    return { started: true, code: null };
  }

  function stop(): void {
    const active = stream;
    stopTracks(active);
    stream = null;
    requestSeq += 1;

    const video = options.getVideo();
    if (video) {
      video.srcObject = null;
    }

    setState("idle", null);
    emitCameraDiagnostic("camera_cleanup", {
      stoppedTracks: active ? active.getTracks().length : 0,
    });
  }

  return {
    getState: () => state,
    getError: () => error,
    getStream: () => stream,
    start,
    stop,
  };
}

function sanitizeMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  return raw.slice(0, 120);
}

function stopTracks(target: MediaStream | null): void {
  if (!target) return;
  target.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // abaikan
    }
  });
}

export interface UseCameraResult {
  state: CameraState;
  error: CameraErrorCode | null;
  errorCopy: { title: string; description: string } | null;
  /**
   * Memulai kamera. HANYA panggil langsung dari handler user gesture.
   * options.deviceId hanya untuk switch kamera (exact id).
   */
  start: (options?: { deviceId?: string }) => Promise<void>;
  stop: () => void;
  streamRef: RefObject<MediaStream | null>;
}

/**
 * Hook kamera EXISEL. Meminta getUserMedia hanya dari user gesture,
 * mengelola state machine, fallback constraint sekali, timeout deterministik,
 * video readiness, dan cleanup stream saat unmount.
 */
export function useCamera(
  videoRef: RefObject<HTMLVideoElement | null>,
): UseCameraResult {
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<CameraErrorCode | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const controllerRef = useRef<CameraController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createCameraController({
      getVideo: () => videoRef.current ?? null,
    });
  }
  const controller = controllerRef.current;

  const start = useCallback(
    async (options?: { deviceId?: string }): Promise<void> => {
      const result = await controller.start(options);
      streamRef.current = controller.getStream();
      setState(controller.getState());
      setError(result.code ?? controller.getError());
    },
    [controller],
  );

  const stop = useCallback((): void => {
    controller.stop();
    streamRef.current = null;
    setState("idle");
    setError(null);
  }, [controller]);

  useEffect(() => {
    return () => {
      controller.stop();
      streamRef.current = null;
    };
  }, [controller]);

  return {
    state,
    error,
    errorCopy: error ? cameraErrorCopy(error) : null,
    start,
    stop,
    streamRef,
  };
}
