import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { cameraErrorCopy, classifyCameraError, stateForCameraError } from "./errors";
import { createCameraController, type CameraController } from "./use-camera";

/* ------------------------------------------------------------------ */
/* Mock lingkungan browser: getUserMedia, isSecureContext, elemen video */
/* ------------------------------------------------------------------ */

interface FakeMediaStreamTrack {
  kind: string;
  stopCalls: number;
  stop(): void;
}

interface FakeMediaStream {
  tracks: FakeMediaStreamTrack[];
  getTracks(): FakeMediaStreamTrack[];
}

function makeFakeTrack(kind: string): FakeMediaStreamTrack {
  const track: FakeMediaStreamTrack = {
    kind,
    stopCalls: 0,
    stop() {
      track.stopCalls += 1;
    },
  };
  return track;
}

function makeFakeStream(): FakeMediaStream {
  const tracks = [makeFakeTrack("video"), makeFakeTrack("video")];
  return {
    tracks,
    getTracks() {
      return tracks;
    },
  };
}

interface FakeVideoElement {
  srcObject: unknown | null;
  videoWidth: number;
  videoHeight: number;
  /** HAVE_CURRENT_DATA=2 agar start() tidak menunggu event metadata. */
  readyState: number;
  playCalls: number;
  play(): Promise<void>;
  addEventListener(type: string, listener: () => void, options?: unknown): void;
  removeEventListener(type: string, listener: () => void): void;
}

function makeFakeVideo(): FakeVideoElement {
  const video: FakeVideoElement = {
    srcObject: null,
    videoWidth: 1280,
    videoHeight: 720,
    readyState: 2,
    playCalls: 0,
    play() {
      video.playCalls += 1;
      return Promise.resolve();
    },
    addEventListener() {},
    removeEventListener() {},
  };
  return video;
}

interface DomExceptionLike {
  name: string;
  message?: string;
}

function makeDomException(name: string, message = ""): DomExceptionLike {
  return { name, message };
}

interface TestHarness {
  controller: CameraController;
  video: FakeVideoElement;
  mediaDevices: {
    getUserMediaCalls: MediaStreamConstraints[];
    nextStreams: FakeMediaStream[];
    nextErrors: DomExceptionLike[];
    nextPending: { promise: Promise<MediaStream>; resolve: (s: unknown) => void }[];
    getUserMediaCallCount(): number;
  };
}

function setup(opts: { secure?: boolean; withMediaDevices?: boolean } = {}): TestHarness {
  const secure = opts.secure ?? true;
  const withMediaDevices = opts.withMediaDevices ?? true;

  const getUserMediaCalls: MediaStreamConstraints[] = [];
  const nextStreams: FakeMediaStream[] = [];
  const nextErrors: DomExceptionLike[] = [];
  const nextPending: { promise: Promise<MediaStream>; resolve: (s: unknown) => void }[] = [];

  const fakeGetUserMedia = (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    getUserMediaCalls.push(constraints);
    if (nextErrors.length > 0) {
      const err = nextErrors.shift() as DomExceptionLike;
      return Promise.reject(err);
    }
    if (nextPending.length > 0) {
      const pending = nextPending.shift();
      if (pending) return pending.promise;
    }
    const stream = nextStreams.shift() ?? makeFakeStream();
    return Promise.resolve(stream as unknown as MediaStream);
  };

  const video = makeFakeVideo();
  const videoAsReal = video as unknown as HTMLVideoElement;

  const controller = createCameraController({
    getVideo: () => videoAsReal,
    getUserMedia: withMediaDevices ? fakeGetUserMedia : undefined,
    getIsSecureContext: () => secure,
  });

  return {
    controller,
    video,
    mediaDevices: {
      getUserMediaCalls,
      nextStreams,
      nextErrors,
      nextPending,
      getUserMediaCallCount: () => getUserMediaCalls.length,
    },
  };
}

/** Membuat getUserMedia berikutnya yang TIDAK PERNAH resolve (menggantung). */
function queueHangingRequest(harness: TestHarness): void {
  harness.mediaDevices.nextPending.push({
    promise: new Promise<MediaStream>(() => {
      // sengaja tidak pernah resolve/reject — meniru Chrome Android yang
      // menggantung saat popup izin tidak muncul.
    }),
    resolve: () => undefined,
  });
}

/** Deteksi emoji tanpa regex flag ES2018 (target TS proyek adalah ES2017). */
function containsEmoji(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x1f000) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* classifyCameraError — mapping DOMException.name (plan §Phase 4)      */
/* ------------------------------------------------------------------ */

test("classifyCameraError memetakan NotAllowedError ke PERMISSION_DENIED", () => {
  assert.equal(classifyCameraError(makeDomException("NotAllowedError")), "PERMISSION_DENIED");
  assert.equal(classifyCameraError(makeDomException("PermissionDeniedError")), "PERMISSION_DENIED");
});

test("classifyCameraError memetakan SecurityError ke POLICY_BLOCKED", () => {
  assert.equal(classifyCameraError(makeDomException("SecurityError")), "POLICY_BLOCKED");
});

test("classifyCameraError memetakan NotFoundError/DevicesNotFoundError ke CAMERA_NOT_FOUND", () => {
  assert.equal(classifyCameraError(makeDomException("NotFoundError")), "CAMERA_NOT_FOUND");
  assert.equal(classifyCameraError(makeDomException("DevicesNotFoundError")), "CAMERA_NOT_FOUND");
});

test("classifyCameraError memetakan NotReadableError/TrackStartError/AbortError ke CAMERA_BUSY", () => {
  assert.equal(classifyCameraError(makeDomException("NotReadableError")), "CAMERA_BUSY");
  assert.equal(classifyCameraError(makeDomException("TrackStartError")), "CAMERA_BUSY");
  assert.equal(classifyCameraError(makeDomException("AbortError")), "CAMERA_BUSY");
});

test("classifyCameraError memetakan OverconstrainedError ke OVERCONSTRAINED", () => {
  assert.equal(classifyCameraError(makeDomException("OverconstrainedError")), "OVERCONSTRAINED");
  assert.equal(classifyCameraError(makeDomException("ConstraintNotSatisfiedError")), "OVERCONSTRAINED");
});

test("classifyCameraError memetakan TimeoutError ke CAMERA_PERMISSION_TIMEOUT", () => {
  assert.equal(classifyCameraError(makeDomException("TimeoutError")), "CAMERA_PERMISSION_TIMEOUT");
});

test("classifyCameraError memetakan error tak dikenal ke UNKNOWN_CAMERA_ERROR", () => {
  assert.equal(classifyCameraError(new Error("misterius")), "UNKNOWN_CAMERA_ERROR");
  assert.equal(classifyCameraError("string polos"), "UNKNOWN_CAMERA_ERROR");
  assert.equal(classifyCameraError(null), "UNKNOWN_CAMERA_ERROR");
});

test("stateForCameraError memetakan kode ke state machine (plan §Phase 4)", () => {
  assert.equal(stateForCameraError("PERMISSION_DENIED"), "denied");
  assert.equal(stateForCameraError("POLICY_BLOCKED"), "blocked");
  assert.equal(stateForCameraError("INSECURE_CONTEXT"), "blocked");
  assert.equal(stateForCameraError("CAMERA_NOT_FOUND"), "unavailable");
  assert.equal(stateForCameraError("MEDIA_DEVICES_UNAVAILABLE"), "unavailable");
  assert.equal(stateForCameraError("CAMERA_BUSY"), "busy");
  assert.equal(stateForCameraError("CAMERA_PERMISSION_TIMEOUT"), "timeout");
  assert.equal(stateForCameraError("UNKNOWN_CAMERA_ERROR"), "error");
});

/* ------------------------------------------------------------------ */
/* cameraErrorCopy — teks panduan Bahasa Indonesia (plan §Phase 5)      */
/* ------------------------------------------------------------------ */

test("cameraErrorCopy PERMISSION_DENIED memuat langkah pemulihan Chrome Android", () => {
  const copy = cameraErrorCopy("PERMISSION_DENIED");
  assert.equal(copy.title, "Kamera diblokir untuk Exisel");
  assert.match(copy.description, /ikon izin/i);
  assert.match(copy.description, /address bar/i);
  assert.match(copy.description, /Izin/);
  assert.match(copy.description, /Kamera/);
  assert.match(copy.description, /Izinkan|Allow/);
  assert.match(copy.description, /Coba Lagi/);
  assert.match(copy.description, /Pengaturan/);
  assert.match(copy.description, /Chrome/);
  assert.equal(containsEmoji(copy.title), false, "copy tidak boleh memuat emoji");
  assert.equal(containsEmoji(copy.description), false, "copy tidak boleh memuat emoji");
});

test("cameraErrorCopy CAMERA_BUSY meminta menutup aplikasi lain", () => {
  const copy = cameraErrorCopy("CAMERA_BUSY");
  assert.match(copy.description, /sedang dipakai|sedang digunakan/i);
  assert.match(copy.description, /Tutup/i);
});

test("cameraErrorCopy CAMERA_NOT_FOUND menyebut tidak ada kamera", () => {
  const copy = cameraErrorCopy("CAMERA_NOT_FOUND");
  assert.match(copy.title, /Tidak ada kamera/i);
});

test("cameraErrorCopy CAMERA_PERMISSION_TIMEOUT menuntun membuka izin manual", () => {
  const copy = cameraErrorCopy("CAMERA_PERMISSION_TIMEOUT");
  assert.match(copy.title, /Izin kamera/i);
  assert.match(copy.description, /Popup izin kamera/);
  assert.match(copy.description, /Coba Lagi/);
});

test("cameraErrorCopy INSECURE_CONTEXT menyebut HTTPS", () => {
  const copy = cameraErrorCopy("INSECURE_CONTEXT");
  assert.match(copy.description, /HTTPS/i);
});

/* ------------------------------------------------------------------ */
/* Perilaku runtime controller (plan Mandatory unit tests 1-8)          */
/* ------------------------------------------------------------------ */

let harness: TestHarness;

beforeEach(() => {
  harness = setup();
});

test("success: idle -> requesting -> active, stream terpasang dan video diputar", async () => {
  const result = await harness.controller.start();

  assert.equal(result.started, true);
  assert.equal(result.code, null);
  assert.equal(harness.controller.getState(), "active");
  assert.equal(harness.controller.getError(), null);
  assert.equal(harness.mediaDevices.getUserMediaCallCount(), 1);
  assert.notEqual(harness.video.srcObject, null);
  assert.equal(harness.video.playCalls, 1);
  assert.notEqual(harness.controller.getStream(), null);
});

test("NotAllowedError -> denied, TEPAT satu getUserMedia (no hidden second request)", async () => {
  harness.mediaDevices.nextErrors.push(makeDomException("NotAllowedError"));

  const result = await harness.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "PERMISSION_DENIED");
  assert.equal(harness.controller.getState(), "denied");
  assert.equal(harness.controller.getError(), "PERMISSION_DENIED");
  assert.equal(harness.mediaDevices.getUserMediaCallCount(), 1, "tidak boleh ada retry tersembunyi");

  const copy = cameraErrorCopy("PERMISSION_DENIED");
  assert.equal(copy.title, "Kamera diblokir untuk Exisel");
  assert.match(copy.description, /ikon izin/i);
});

test("SecurityError -> blocked (POLICY_BLOCKED)", async () => {
  harness.mediaDevices.nextErrors.push(makeDomException("SecurityError"));

  const result = await harness.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "POLICY_BLOCKED");
  assert.equal(harness.controller.getState(), "blocked");
});

test("NotFoundError -> unavailable (CAMERA_NOT_FOUND)", async () => {
  harness.mediaDevices.nextErrors.push(makeDomException("NotFoundError"));

  const result = await harness.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "CAMERA_NOT_FOUND");
  assert.equal(harness.controller.getState(), "unavailable");
});

test("NotReadableError -> busy (CAMERA_BUSY)", async () => {
  harness.mediaDevices.nextErrors.push(makeDomException("NotReadableError"));

  const result = await harness.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "CAMERA_BUSY");
  assert.equal(harness.controller.getState(), "busy");
});

test("OverconstrainedError -> fallback SEKALI ke video:true, TEPAT 2 panggilan", async () => {
  harness.mediaDevices.nextErrors.push(makeDomException("OverconstrainedError"));
  const fallbackStream = makeFakeStream();
  harness.mediaDevices.nextStreams.push(fallbackStream);

  const result = await harness.controller.start();

  assert.equal(result.started, true);
  assert.equal(harness.mediaDevices.getUserMediaCallCount(), 2, "fallback hanya sekali");
  const firstVideo = harness.mediaDevices.getUserMediaCalls[0]?.video as {
    facingMode: { ideal: string };
  };
  assert.equal(firstVideo.facingMode.ideal, "environment");
  assert.deepEqual(harness.mediaDevices.getUserMediaCalls[1], { audio: false, video: true });
  assert.equal(harness.controller.getState(), "active");
  assert.equal(harness.controller.getStream(), fallbackStream as unknown as MediaStream);
});

test("request menggantung -> timeout deterministik CAMERA_PERMISSION_TIMEOUT", async () => {
  // setTimeout palsu: tangkap callback, jalankan manual (deterministik).
  let capturedTimer: (() => void) | null = null;
  const setTimer = (fn: () => void): number => {
    capturedTimer = fn;
    return 1;
  };

  const video = makeFakeVideo();
  const controller = createCameraController({
    getVideo: () => video as unknown as HTMLVideoElement,
    getUserMedia: () =>
      new Promise<MediaStream>(() => {
        // menggantung selamanya — popup izin tidak muncul
      }),
    getIsSecureContext: () => true,
    permissionTimeoutMs: 1000,
    setTimeoutFn: setTimer,
    clearTimeoutFn: () => undefined,
  });

  const startPromise = controller.start();
  assert.equal(controller.getState(), "requesting");

  assert.notEqual(capturedTimer, null, "timer timeout harus dipasang");
  (capturedTimer as unknown as () => void)();

  const result = await startPromise;

  assert.equal(result.started, false);
  assert.equal(result.code, "CAMERA_PERMISSION_TIMEOUT");
  assert.equal(controller.getState(), "timeout");
  assert.equal(controller.getError(), "CAMERA_PERMISSION_TIMEOUT");
});

test("cleanup: setiap track aktif menerima track.stop()", async () => {
  await harness.controller.start();
  const stream = harness.controller.getStream() as unknown as FakeMediaStream;

  harness.controller.stop();

  assert.equal(harness.controller.getState(), "idle");
  assert.equal(harness.controller.getError(), null);
  assert.equal(harness.controller.getStream(), null);
  assert.equal(harness.video.srcObject, null);
  for (const track of stream.tracks) {
    assert.equal(track.stopCalls, 1, "setiap track harus dihentikan");
  }
});

/* ------------------------------------------------------------------ */
/* Perilaku tambahan                                                    */
/* ------------------------------------------------------------------ */

test("unsupported: getUserMedia tidak tersedia menghasilkan MEDIA_DEVICES_UNAVAILABLE", async () => {
  const h = setup({ withMediaDevices: false });

  const result = await h.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "MEDIA_DEVICES_UNAVAILABLE");
  assert.equal(h.controller.getState(), "unavailable");
});

test("insecure context menghasilkan INSECURE_CONTEXT tanpa memanggil getUserMedia", async () => {
  const h = setup({ secure: false });

  const result = await h.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "INSECURE_CONTEXT");
  assert.equal(h.controller.getState(), "blocked");
  assert.equal(h.mediaDevices.getUserMediaCallCount(), 0);
});

test("double-start tidak memanggil getUserMedia dua kali saat requesting", async () => {
  const first = harness.controller.start();
  const second = harness.controller.start();

  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(firstResult.started, true);
  assert.equal(secondResult.started, false, "panggilan kedua harus ditolak");
  assert.equal(harness.mediaDevices.getUserMediaCallCount(), 1, "getUserMedia hanya satu kali");
});

test("start({deviceId}) memakai deviceId exact untuk switch kamera", async () => {
  const result = await harness.controller.start({ deviceId: "kamera-belakang-123" });

  assert.equal(result.started, true);
  const constraints = harness.mediaDevices.getUserMediaCalls[0];
  assert.deepEqual(constraints, {
    audio: false,
    video: { deviceId: { exact: "kamera-belakang-123" } },
  });
});

test("start setelah stop dapat memulai ulang kamera tanpa refresh halaman", async () => {
  await harness.controller.start();
  harness.controller.stop();

  const result = await harness.controller.start();

  assert.equal(result.started, true);
  assert.equal(harness.controller.getState(), "active");
  assert.equal(harness.mediaDevices.getUserMediaCallCount(), 2, "satu request per start");
});

test("track lama dihentikan saat start dipanggil ulang setelah stream aktif", async () => {
  await harness.controller.start();
  const firstStream = harness.controller.getStream() as unknown as FakeMediaStream;

  await harness.controller.start();

  assert.equal(harness.controller.getState(), "active");
  for (const track of firstStream.tracks) {
    assert.equal(track.stopCalls, 1, "track lama dihentikan sebelum stream baru");
  }
  assert.equal(harness.mediaDevices.getUserMediaCallCount(), 2);
});

test("error tak terduga menghasilkan state error dan kode UNKNOWN_CAMERA_ERROR", async () => {
  harness.mediaDevices.nextErrors.push({ name: "TypeError", message: "network down" });

  const result = await harness.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "UNKNOWN_CAMERA_ERROR");
  assert.equal(harness.controller.getState(), "error");
});
