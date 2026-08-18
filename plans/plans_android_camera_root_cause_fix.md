# EXISEL Android Chrome Camera Root-Cause Fix Plan

## Tujuan
Fix bug Android Chrome camera sampai akar masalah, tanpa muter hipotesis terlalu lama.

Gejala:
- User buka scanner attendance Exisel di Android Chrome.
- Klik **Aktifkan Kamera**.
- Popup izin kamera tidak muncul / kamera tidak terbuka.
- `Permissions-Policy` source sudah `camera=(self)`.
- Jalur scanner saat ini sudah memanggil `getUserMedia()` dari aksi klik user.
- `enumerateDevices()` masih dipanggil saat mount.
- Wajib dibuktikan apakah `getUserMedia()` tidak terpanggil, reject langsung, pending, atau sukses tapi video/decoder gagal.

## Rule utama untuk Qwen
Jangan lakukan forensic luas lagi. Maksimal 10 menit spekulasi sebelum instrumentation.

Pakai loop ini saja:

```text
OBSERVE
→ instrument
→ reproduce
→ capture exact browser result
→ classify
→ targeted fix
→ physical Android verification
```

Setiap hipotesis tanpa evidence harus diberi status `UNCONFIRMED`.

## Ground truth yang jangan diulang-ulang
1. Old Caddy `camera=()` memang blocker historis.
2. Current source expected `Permissions-Policy: camera=(self)`.
3. User-click path menuju `getUserMedia()` sudah ada.
4. `enumerateDevices()` on mount belum terbukti root cause.
5. Browser/OS permission yang sudah Block dapat membuat `getUserMedia()` reject tanpa popup.

## Root-cause classification wajib

### RC-A — click tidak mencapai getUserMedia
Evidence:
```text
camera_click
```
ada, tetapi:
```text
camera_gum_requested
```
tidak ada.

Cari early return, stale ref, JS exception, button overlay/disabled, lifecycle race.

### RC-B — `NotAllowedError`
Evidence:
```text
camera_gum_requested
camera_gum_rejected name=NotAllowedError
```

Periksa:
- Chrome site permission = Block?
- Android permission Camera untuk Chrome = denied?
- actual deployed `Permissions-Policy`?
- secure context?

Jangan mencoba force popup dari JS.

### RC-C — `SecurityError`
Fokus ke actual response headers, HTTPS, embedded/policy restriction.

### RC-D — `NotFoundError`
Map ke `CAMERA_NOT_FOUND`. Jangan retry loop.

### RC-E — `NotReadableError`
Map ke camera busy / OS resource failure. User boleh explicit retry.

### RC-F — `OverconstrainedError`
Retry **sekali** dari:
```ts
video: { facingMode: { ideal: "environment" } }
```
ke:
```ts
video: true
```

### RC-G — getUserMedia pending
Jika >10–15 detik:
```text
CAMERA_PERMISSION_TIMEOUT
```
Tampilkan recovery UI. Jangan auto-refresh / hidden retry loop.

### RC-H — getUserMedia sukses tapi video/decoder gagal
Kalau `camera_gum_resolved` sudah ada, permission bukan akar masalah. Pindah ke video lifecycle/decoder.

---

## Phase 1 — Instrumentation dulu
Tambahkan diagnostic events non-sensitive:

```text
camera_click
camera_gum_requested
camera_gum_resolved
camera_gum_rejected
camera_timeout
camera_video_ready
camera_decoder_started
camera_cleanup
```

Boleh log:
- `error.name`
- sanitized `error.message`
- `window.isSecureContext`
- `document.visibilityState`
- mediaDevices available/tidak
- constraint mode

DILARANG log:
- QR token
- session cookie
- auth header
- attendance payload
- user personal data

---

## Phase 2 — Hapus enumerateDevices dari mount
Ubah:

```text
mount
→ enumerateDevices()
→ user click
→ getUserMedia()
```

menjadi:

```text
mount
→ NO camera API

user click
→ getUserMedia()
→ permission success
→ enumerateDevices()
→ detect available cameras
```

`enumerateDevices()` hanya boleh setelah stream berhasil didapat.

---

## Phase 3 — First camera request harus direct & minimal
Button:

```tsx
<button onClick={handleStartCamera}>
  Aktifkan Kamera
</button>
```

First permission-triggering call:

```ts
await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
  },
});
```

Hanya jika `OverconstrainedError`, retry sekali:

```ts
await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: true,
});
```

Jangan retry otomatis untuk error lain.

---

## Phase 4 — State machine tunggal

```ts
type CameraState =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "blocked"
  | "unavailable"
  | "busy"
  | "timeout"
  | "error";
```

Error codes:

```ts
type CameraErrorCode =
  | "PERMISSION_DENIED"
  | "POLICY_BLOCKED"
  | "CAMERA_NOT_FOUND"
  | "CAMERA_BUSY"
  | "OVERCONSTRAINED"
  | "INSECURE_CONTEXT"
  | "MEDIA_DEVICES_UNAVAILABLE"
  | "CAMERA_PERMISSION_TIMEOUT"
  | "UNKNOWN_CAMERA_ERROR";
```

DOMException mapping:
- `NotAllowedError` → `PERMISSION_DENIED`
- `SecurityError` → `POLICY_BLOCKED`
- `NotFoundError` → `CAMERA_NOT_FOUND`
- `NotReadableError` → `CAMERA_BUSY`
- `OverconstrainedError` → fallback once
- insecure context → `INSECURE_CONTEXT`

---

## Phase 5 — Blocked permission UX
Jika permission sudah Block, jangan berharap browser popup muncul lagi.

Tampilkan:

```text
Kamera diblokir.

Izinkan kamera untuk situs Exisel melalui pengaturan situs Chrome,
lalu kembali dan tekan "Coba Lagi".
```

Android guidance:
```text
Chrome → Site settings → Camera → Allow
```

Jika OS-level denied:
```text
Pengaturan Android → Aplikasi → Chrome → Izin → Kamera → Izinkan
```

Buttons:
- Coba Lagi
- Kembali

Tidak boleh auto-refresh.

---

## Phase 6 — Verify actual production header
Jangan hanya baca Caddyfile source.

Run:
```bash
curl -I https://exisel.web.id/kehadiran
```

Expected:
```http
Permissions-Policy: camera=(self)
```

Pastikan:
- tidak ada duplicate/conflicting header,
- `window.isSecureContext === true`,
- URL benar-benar HTTPS.

---

## Phase 7 — Video lifecycle
Setelah `getUserMedia()` resolve:

```ts
video.srcObject = stream;
await video.play();
```

Tunggu readiness (`loadedmetadata`, `canplay`, atau readyState usable).

Baru setelah video ready:
```text
start QR decoder
```

Jangan start decoder saat permission masih requesting.

---

## Phase 8 — Cleanup
Saat unmount/route change/stop/success:
```ts
stream.getTracks().forEach(track => track.stop());
video.srcObject = null;
```

Stop decoder controls juga.

Tidak boleh duplicate streams / stream leak.

---

## Ownership

### A5
Own:
```text
src/lib/camera/**
```

Tugas:
- getUserMedia
- state machine
- timeout
- DOMException classification
- cleanup
- post-permission enumerateDevices
- unit tests

### A6
Own:
```text
src/components/attendance-qr-scanner.tsx
src/components/attendance/**
```

Tugas:
- explicit Activate Camera button
- integrate A5
- video ready lifecycle
- one QR → one POST
- pause submit
- separate CameraError / DecodeError / APIError

### A7
Own:
```text
Caddyfile
docs/infra/**
```

Tugas:
- verify actual production header
- HTTPS/secure context
- no conflicting policy

---

## Mandatory unit tests
1. Success:
```text
idle → requesting → active
```

2. NotAllowedError:
```text
requesting → denied/blocked
```
No hidden second request.

3. SecurityError → blocked.

4. NotFoundError → unavailable.

5. NotReadableError → busy/error.

6. OverconstrainedError:
- first request fails
- second `video:true` succeeds
- exactly 2 calls

7. Pending request:
- timeout after configured interval
- no reload

8. Cleanup:
- every active track receives `track.stop()`.

---

## Physical Android Chrome test — WAJIB

### Test A — Fresh permission
Reset Exisel camera permission to Ask.

1. Buka `/kehadiran`.
2. Tidak boleh ada camera request saat page load.
3. Klik Aktifkan Kamera.
4. Permission popup harus muncul.
5. Tap Allow.
6. Rear camera terbuka.
7. Decoder start.
8. Scan QR valid.
9. Exactly one attendance POST.

### Test B — Previously Blocked
1. Set site Camera = Block.
2. Klik Aktifkan Kamera.
3. App harus menampilkan blocked UI.
4. Ubah site permission ke Allow.
5. Kembali.
6. Klik Coba Lagi.
7. Camera terbuka.

### Test C — OS-level block
Matikan permission Camera untuk Chrome di Android settings.
Expected:
- reject terklasifikasi,
- UI recovery jelas,
- no crash,
- no infinite spinner.

### Test D — WebRTC control
Jika Exisel masih gagal, tes official WebRTC getUserMedia sample di Android Chrome yang sama.

Interpretasi:
```text
WebRTC sample juga gagal
→ browser/OS permission problem

WebRTC sample sukses, Exisel gagal
→ Exisel client bug
```

---

## Acceptance criteria
JANGAN declare fixed sebelum semuanya ini terpenuhi:

```text
[ ] no camera API on mount
[ ] enumerateDevices only after permission success
[ ] click directly reaches getUserMedia
[ ] actual prod Permissions-Policy = camera=(self)
[ ] secure context = true
[ ] fresh Android permission shows popup
[ ] Allow opens rear camera
[ ] blocked permission shows actionable UI
[ ] OS denial shows actionable UI
[ ] Overconstrained fallback works
[ ] pending request times out deterministically
[ ] video ready before decoder starts
[ ] one QR = one attendance POST
[ ] scanner pauses during submit
[ ] cleanup stops all tracks
[ ] no token/session/QR logs
[ ] no auto-refresh recovery
[ ] camera tests pass
[ ] pnpm typecheck passes
[ ] physical Android Chrome passes
```

---

## Stop conditions
Begitu ada exact runtime evidence, stop memperluas hipotesis.

Contoh:

```text
getUserMedia → NotAllowedError
```

Maka jangan lagi debat Promise.race/enumerateDevices/React tanpa bukti.
Fokus:
- site permission?
- OS permission?
- policy?

Kalau:

```text
getUserMedia → resolved
```

maka permission bukan akar masalah. Fokus video/decoder.

---

## Final report format

```text
## Root Cause
CONFIRMED:
...

CONTRIBUTING:
...

UNCONFIRMED/DISCARDED:
...

## Runtime Evidence
camera_click:
camera_gum_requested:
camera_gum_resolved/rejected:
error.name:
isSecureContext:
production Permissions-Policy:

## Changes
- ...

## Verification
camera unit tests: PASS/FAIL
pnpm typecheck: PASS/FAIL
physical Android Chrome: PASS/FAIL
fresh permission prompt: PASS/FAIL
blocked permission recovery: PASS/FAIL
rear camera opens: PASS/FAIL
valid QR decode: PASS/FAIL

## Remaining Risks
...
```

Jangan claim root cause confirmed hanya dari mock/test/code reading.

---

## Immediate instruction to Qwen
1. Inspect current A5/A6/A7 files only.
2. Remove `enumerateDevices()` from mount.
3. Add minimal diagnostics.
4. Ensure first `getUserMedia()` is directly reached from click.
5. Implement deterministic error classification.
6. Verify actual production header + secure context.
7. Run tests/typecheck.
8. Test physical Android Chrome.
9. Lock root cause from observed runtime result.
10. Apply targeted fix only.
11. Re-test physical Android.
12. Write evidence-backed final report.

Do NOT restart attendance backend investigation.
Do NOT modify QR signing/auth/session/backend attendance.
Do NOT spend another hour generating theories before collecting actual `getUserMedia()` evidence.
