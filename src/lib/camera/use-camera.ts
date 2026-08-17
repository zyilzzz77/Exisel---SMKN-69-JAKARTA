"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { cameraErrorCopy, classifyCameraError, stateForCameraError } from "./errors";
import type { CameraErrorCode, CameraState } from "./types";

/**
 * Kontrak constraints getUserMedia (plan §26/§27).
 * Percobaan pertama memilih kamera belakang secara halus (ideal, bukan exact).
 * HANYA jika percobaan pertama gagal karena OverconstrainedError,
 * controller mencoba sekali dengan { video: true }.
 * Setelah NotAllowedError JANGAN ada retry generic — user harus
 * mengubah izin di pengaturan browser/perangkat dulu (plan §29).
 */
const PRIMARY_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: "environment" } },
};

const FALLBACK_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: true,
};

export interface CameraControllerOptions {
  /** Elemen video tempat stream dipasang; null jika belum ada di DOM. */
  getVideo: () => HTMLVideoElement | null;
  /** Pengganti getUserMedia (dependency injection untuk unit test). */
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  /** Pengganti pengecekan konteks aman (di browser memakai window.isSecureContext). */
  getIsSecureContext?: () => boolean;
}

export interface CameraController {
  /** State machine kamera (plan §35). */
  getState(): CameraState;
  /** Kode error terakhir; null saat tidak ada kegagalan. */
  getError(): CameraErrorCode | null;
  /** Stream aktif; null saat idle/terhenti. */
  getStream(): MediaStream | null;
  /**
   * Memulai kamera. HANYA dipanggil dari user gesture (plan §24/§25).
   * Mengembalikan { started, code }:
   * - code null → kamera aktif.
   * - code diisi → kamera gagal; error sudah diklasifikasikan.
   */
  start(): Promise<{ started: boolean; code: CameraErrorCode | null }>;
  /** Menghentikan kamera: stop semua track, lepas srcObject, kembali idle (plan §37). */
  stop(): void;
}

/**
 * Controller kamera murni — bebas React sehingga bisa diuji langsung
 * dengan node:test/tsx, tanpa renderer. Hook useCamera adalah
 * pembungkus tipis yang menyambungkan controller ke lifecycle React.
 */
export function createCameraController(options: CameraControllerOptions): CameraController {
  let state: CameraState = "idle";
  let error: CameraErrorCode | null = null;
  let stream: MediaStream | null = null;

  function setState(next: CameraState, nextError: CameraErrorCode | null): void {
    state = next;
    error = nextError;
  }

  async function start(): Promise<{ started: boolean; code: CameraErrorCode | null }> {
    // Guard ganda (plan §35): jangan pernah punya dua getUserMedia berjalan bersamaan.
    if (state === "requesting") {
      return { started: false, code: error };
    }

    // Cek kapabilitas SEBELUM request (plan §23).
    const secure = options.getIsSecureContext ? options.getIsSecureContext() : window.isSecureContext;
    if (!secure) {
      setState("error", "INSECURE_CONTEXT");
      return { started: false, code: "INSECURE_CONTEXT" };
    }

    const getUserMedia = options.getUserMedia ?? navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (!getUserMedia) {
      setState("unavailable", "UNSUPPORTED");
      return { started: false, code: "UNSUPPORTED" };
    }

    // Stream lama (mis. setelah ganti tab) dibersihkan dulu supaya tidak
    // tertinggal dan menyebabkan NotReadableError pada kunjungan berikutnya (plan §37).
    const previous = stream;
    stream = null;
    stopTracks(previous);
    const previousVideo = options.getVideo();
    if (previousVideo) {
      previousVideo.srcObject = null;
    }

    setState("requesting", null);

    let acquired: MediaStream;
    try {
      try {
        acquired = await getUserMedia(PRIMARY_CONSTRAINTS);
      } catch (firstAttemptError) {
        const fallback = await retryWithGenericConstraints(getUserMedia, firstAttemptError);
        if (fallback.attempted) {
          acquired = fallback.stream as MediaStream;
        } else {
          throw firstAttemptError;
        }
      }
    } catch (requestError) {
      const code = classifyCameraError(requestError);
      setState(stateForCameraError(code), code);
      return { started: false, code };
    }

    stream = acquired;

    const video = options.getVideo();
    if (video) {
      video.srcObject = acquired;
      try {
        // play() dipanggil eksplisit (plan §34); atribut muted/playInline di
        // elemen video tetap disediakan oleh komponen pemakai (Subagent 6).
        await video.play();
      } catch {
        // Kegagalan play() jangan menyandera stream: track tetap hidup,
        // UI dapat mencoba play ulang lewat interaksi berikutnya.
      }
    }

    setState("active", null);
    return { started: true, code: null };
  }

  function stop(): void {
    stopTracks(stream);
    stream = null;

    const video = options.getVideo();
    if (video) {
      video.srcObject = null;
    }

    setState("idle", null);
  }

  return {
    getState: () => state,
    getError: () => error,
    getStream: () => stream,
    start,
    stop,
  };
}

/**
 * Fallback constraint (plan §27).
 * HANYA OverconstrainedError yang memicu retry generic, dan hanya SEKALI.
 * NotAllowedError dan error lain dilempar ulang apa adanya.
 */
async function retryWithGenericConstraints(
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>,
  firstAttemptError: unknown,
): Promise<{ attempted: boolean; stream?: MediaStream }> {
  if (classifyCameraError(firstAttemptError) !== "OVERCONSTRAINED") {
    return { attempted: false };
  }

  const fallbackStream = await getUserMedia(FALLBACK_CONSTRAINTS);
  return { attempted: true, stream: fallbackStream };
}

/**
 * Menghentikan semua track MediaStream (plan §37/§43).
 * Kesalahan track.close() diabaikan: teardown tidak boleh melempar.
 */
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
  /** State machine kamera (plan §35). */
  state: CameraState;
  /** Kode error terklasifikasi; null saat tidak ada kegagalan. */
  error: CameraErrorCode | null;
  /** Teks panduan Bahasa Indonesia untuk error aktif; null saat tidak ada error. */
  errorCopy: { title: string; description: string } | null;
  /**
   * Memulai kamera. HANYA panggil langsung dari handler user gesture
   * (mis. onClick tombol "Aktifkan Kamera") — jangan pernah dari useEffect
   * atau saat mount, supaya Chrome Android menampilkan prompt izin
   * (plan §24/§25). Aman dipanggil berulang: panggilan saat state
   * "requesting" diabaikan.
   */
  start: () => Promise<void>;
  /** Menghentikan stream, melepas srcObject, kembali ke idle (plan §37). */
  stop: () => void;
  /** Stream aktif (ref internal), untuk kebutuhan lanjutan seperti decoder QR. */
  streamRef: RefObject<MediaStream | null>;
}

/**
 * Hook kamera EXISEL. Meminta getUserMedia hanya dari user gesture,
 * mengelola state machine, fallback constraint sekali, dan cleanup
 * stream saat unmount (plan §23-28, §34-38).
 *
 * Integrasi scanner QR: Subagent 6 memanggil start() dari tombol,
 * menunggu state === "active", lalu memulai decoder pada streamRef.current.
 */
export function useCamera(videoRef: RefObject<HTMLVideoElement | null>): UseCameraResult {
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

  const start = useCallback(async (): Promise<void> => {
    // Jangan pernah auto-request kamera di sini; start hanya dipanggil
    // langsung dari user gesture (plan §24/§25).
    const result = await controller.start();
    streamRef.current = controller.getStream();
    setState(controller.getState());
    setError(result.code ?? controller.getError());
  }, [controller]);

  const stop = useCallback((): void => {
    controller.stop();
    streamRef.current = null;
    setState("idle");
    setError(null);
  }, [controller]);

  // Cleanup saat unmount/navigasi (plan §37/§43): pastikan tidak ada
  // kamera "nyangkut" yang menyebabkan NotReadableError di kunjungan berikutnya.
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
