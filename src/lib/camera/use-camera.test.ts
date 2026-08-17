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
  playCalls: number;
  play(): Promise<void>;
}

function makeFakeVideo(): FakeVideoElement {
  const video: FakeVideoElement = {
    srcObject: null,
    playCalls: 0,
    play() {
      video.playCalls += 1;
      return Promise.resolve();
    },
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
    getUserMediaCallCount(): number;
  };
}

function setup(opts: { secure?: boolean; withMediaDevices?: boolean } = {}): TestHarness {
  const secure = opts.secure ?? true;
  const withMediaDevices = opts.withMediaDevices ?? true;

  const getUserMediaCalls: MediaStreamConstraints[] = [];
  const nextStreams: FakeMediaStream[] = [];
  const nextErrors: DomExceptionLike[] = [];

  const fakeGetUserMedia = (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    getUserMediaCalls.push(constraints);
    if (nextErrors.length > 0) {
      const err = nextErrors.shift() as DomExceptionLike;
      return Promise.reject(err);
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
      getUserMediaCallCount: () => getUserMediaCalls.length,
    },
  };
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
/* classifyCameraError — mapping DOMException.name (plan §28)          */
/* ------------------------------------------------------------------ */

test("classifyCameraError memetakan NotAllowedError ke PERMISSION_DENIED", () => {
  assert.equal(classifyCameraError(makeDomException("NotAllowedError")), "PERMISSION_DENIED");
  assert.equal(classifyCameraError(makeDomException("PermissionDeniedError")), "PERMISSION_DENIED");
});

test("classifyCameraError memetakan NotFoundError/DevicesNotFoundError ke NOT_FOUND", () => {
  assert.equal(classifyCameraError(makeDomException("NotFoundError")), "NOT_FOUND");
  assert.equal(classifyCameraError(makeDomException("DevicesNotFoundError")), "NOT_FOUND");
});

test("classifyCameraError memetakan NotReadableError/TrackStartError/AbortError ke BUSY", () => {
  assert.equal(classifyCameraError(makeDomException("NotReadableError")), "BUSY");
  assert.equal(classifyCameraError(makeDomException("TrackStartError")), "BUSY");
  assert.equal(classifyCameraError(makeDomException("AbortError")), "BUSY");
});

test("classifyCameraError memetakan OverconstrainedError ke OVERCONSTRAINED", () => {
  assert.equal(classifyCameraError(makeDomException("OverconstrainedError")), "OVERCONSTRAINED");
  assert.equal(classifyCameraError(makeDomException("ConstraintNotSatisfiedError")), "OVERCONSTRAINED");
});

test("classifyCameraError memetakan SecurityError dan error tak dikenal ke UNKNOWN", () => {
  assert.equal(classifyCameraError(makeDomException("SecurityError")), "UNKNOWN");
  assert.equal(classifyCameraError(new Error("misterius")), "UNKNOWN");
  assert.equal(classifyCameraError("string polos"), "UNKNOWN");
  assert.equal(classifyCameraError(null), "UNKNOWN");
});

test("stateForCameraError memetakan kode ke state machine (plan §35)", () => {
  assert.equal(stateForCameraError("PERMISSION_DENIED"), "denied");
  assert.equal(stateForCameraError("NOT_FOUND"), "unavailable");
  assert.equal(stateForCameraError("UNSUPPORTED"), "unavailable");
  assert.equal(stateForCameraError("BUSY"), "error");
  assert.equal(stateForCameraError("OVERCONSTRAINED"), "error");
  assert.equal(stateForCameraError("INSECURE_CONTEXT"), "error");
  assert.equal(stateForCameraError("UNKNOWN"), "error");
});

/* ------------------------------------------------------------------ */
/* cameraErrorCopy — teks panduan Bahasa Indonesia (plan §30/§38)      */
/* ------------------------------------------------------------------ */

test("cameraErrorCopy PERMISSION_DENIED memuat langkah pemulihan Chrome Android", () => {
  const copy = cameraErrorCopy("PERMISSION_DENIED");
  assert.equal(copy.title, "Kamera diblokir untuk Exisel");
  assert.match(copy.description, /ikon izin/i);
  assert.match(copy.description, /address bar/i);
  assert.match(copy.description, /Izin/);
  assert.match(copy.description, /Kamera/);
  assert.match(copy.description, /Izinkan|Allow/);
  assert.match(copy.description, /Coba kamera lagi/);
  assert.match(copy.description, /Pengaturan/);
  assert.match(copy.description, /Aplikasi/);
  assert.match(copy.description, /Chrome/);
  assert.equal(containsEmoji(copy.title), false, "copy tidak boleh memuat emoji");
  assert.equal(containsEmoji(copy.description), false, "copy tidak boleh memuat emoji");
});

test("cameraErrorCopy BUSY meminta menutup aplikasi lain", () => {
  const copy = cameraErrorCopy("BUSY");
  assert.match(copy.description, /sedang dipakai|sedang digunakan/i);
  assert.match(copy.description, /Tutup/i);
});

test("cameraErrorCopy NOT_FOUND menyebut tidak ada kamera", () => {
  const copy = cameraErrorCopy("NOT_FOUND");
  assert.match(copy.title, /Tidak ada kamera/i);
});

test("cameraErrorCopy INSECURE_CONTEXT menyebut HTTPS", () => {
  const copy = cameraErrorCopy("INSECURE_CONTEXT");
  assert.match(copy.description, /HTTPS/i);
});

/* ------------------------------------------------------------------ */
/* Perilaku runtime controller (plan §24-27, §34-38)                   */
/* ------------------------------------------------------------------ */

let harness: TestHarness;

beforeEach(() => {
  harness = setup();
});

test("success: start memasang stream ke video, memainkan, dan state aktif", async () => {
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

test("NotAllowedError menghasilkan state denied dan copy PERMISSION_DENIED", async () => {
  harness.mediaDevices.nextErrors.push(makeDomException("NotAllowedError"));

  const result = await harness.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "PERMISSION_DENIED");
  assert.equal(harness.controller.getState(), "denied");
  assert.equal(harness.controller.getError(), "PERMISSION_DENIED");

  const copy = cameraErrorCopy("PERMISSION_DENIED");
  assert.equal(copy.title, "Kamera diblokir untuk Exisel");
  assert.match(copy.description, /ikon izin/i);
});

test("NotFoundError menghasilkan state unavailable dan kode NOT_FOUND", async () => {
  harness.mediaDevices.nextErrors.push(makeDomException("NotFoundError"));

  const result = await harness.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "NOT_FOUND");
  assert.equal(harness.controller.getState(), "unavailable");
});

test("NotReadableError menghasilkan state error dan kode BUSY", async () => {
  harness.mediaDevices.nextErrors.push(makeDomException("NotReadableError"));

  const result = await harness.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "BUSY");
  assert.equal(harness.controller.getState(), "error");
});

test("OverconstrainedError memicu fallback SEKALI ke video:true lalu sukses", async () => {
  harness.mediaDevices.nextErrors.push(makeDomException("OverconstrainedError"));
  const fallbackStream = makeFakeStream();
  harness.mediaDevices.nextStreams.push(fallbackStream);

  const result = await harness.controller.start();

  assert.equal(result.started, true);
  assert.equal(harness.mediaDevices.getUserMediaCallCount(), 2, "fallback hanya sekali");
  const firstVideo = harness.mediaDevices.getUserMediaCalls[0]?.video as { facingMode: { ideal: string } };
  assert.equal(firstVideo.facingMode.ideal, "environment");
  assert.deepEqual(harness.mediaDevices.getUserMediaCalls[1], { audio: false, video: true });
  assert.equal(harness.controller.getState(), "active");
  assert.equal(harness.controller.getStream(), fallbackStream as unknown as MediaStream);
});

test("unsupported: getUserMedia tidak tersedia menghasilkan UNSUPPORTED", async () => {
  const h = setup({ withMediaDevices: false });

  const result = await h.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "UNSUPPORTED");
  assert.equal(h.controller.getState(), "unavailable");
});

test("insecure context menghasilkan INSECURE_CONTEXT tanpa memanggil getUserMedia", async () => {
  const h = setup({ secure: false });

  const result = await h.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "INSECURE_CONTEXT");
  assert.equal(h.controller.getState(), "error");
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

test("stop menghentikan semua track, melepas srcObject, dan kembali idle", async () => {
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

test("error tak terduga menghasilkan state error dan kode UNKNOWN", async () => {
  harness.mediaDevices.nextErrors.push({ name: "TypeError", message: "network down" });

  const result = await harness.controller.start();

  assert.equal(result.started, false);
  assert.equal(result.code, "UNKNOWN");
  assert.equal(harness.controller.getState(), "error");
});
