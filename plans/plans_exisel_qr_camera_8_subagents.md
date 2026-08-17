# EXISEL — P0 Fix Plan: Google Lens HTTP 500 + Android Chrome Camera Permission

## Tujuan

Memperbaiki dua bug fatal pada flow kehadiran Exisel:

1. **Google Lens / external QR scan → HTTP 500** saat user membuka QR attendance.
2. **Android Chrome camera scanner tidak bisa dibuka** dan tombol retry tidak memunculkan permission prompt.

Target akhir:

```txt
Google Lens
→ Exisel
→ login bila perlu
→ QR tetap terbawa
→ attendance diproses sekali
→ success / deterministic error
```

dan:

```txt
Android Chrome
→ tap Aktifkan Kamera
→ navigator.mediaDevices.getUserMedia()
→ Chrome meminta izin jika permission masih prompt
→ rear camera aktif
→ QR scanner berjalan
```

Jika permission sebelumnya sudah diblokir:

```txt
retry
→ NotAllowedError
→ UI memberi instruksi site permission
→ user mengaktifkan kamera
→ retry
→ camera works
```

Tidak boleh menggunakan refresh page sebagai fix.

---

# 1. Severity

```txt
Priority: P0 / Production Fatal
Affected:
- /attendance/scan
- /kehadiran
- Google Lens QR flow
- Android Chrome scanner
```

---

# 2. Security Guardrails

Jangan merusak:

```txt
Google OAuth
Cloudflare Turnstile
30-day session
server-side auth
QR signature
QR expiry
attendance window
role authorization
rate limiting
canonical origin
safe returnTo
duplicate attendance protection
```

Dilarang:

```txt
bypass QR validation
bypass session
bypass camera permission
allow login without Turnstile
turn expected errors into success
auto refresh page
log raw secret/token
```

---

# 3. Root Cause First

Sebelum coding:

```txt
reproduce
→ add request ID
→ inspect network
→ inspect redirect chain
→ inspect exact server exception
→ inspect exact DOMException from getUserMedia
→ inspect production headers
→ only then implement fix
```

---

# PART A — GOOGLE LENS → HTTP 500

## 4. Reproduction Matrix

Test:

```txt
A. user already logged in
B. user logged out
C. expired session
D. valid QR
E. expired QR
F. duplicate QR
G. malformed QR
H. wrong extracurricular
I. Google Lens
J. copy URL manually to Chrome
K. Incognito
L. scan twice rapidly
```

For every case capture:

```txt
request URL
query params
HTTP status
redirect chain
session state
request ID
server error
DB result
final page
```

---

## 5. Request ID / Observability

Add or preserve:

```txt
X-Request-ID
```

Log only:

```txt
requestId
route
method
session valid?
userId hash
QR present?
QR parse result
QR expiry result
activity id
attendance result
DB error category
response status
latency
```

Never log:

```txt
raw session token
raw QR signature
OAuth token
password
API key
```

---

## 6. Expected Errors Must Not Become 500

Recommended mapping:

```txt
400 INVALID_QR
401 UNAUTHENTICATED
403 NOT_ELIGIBLE
409 ATTENDANCE_ALREADY_RECORDED
410 QR_EXPIRED
422 ATTENDANCE_WINDOW_CLOSED
429 RATE_LIMITED
503 DATABASE_UNAVAILABLE
500 INTERNAL_ERROR only for unexpected failure
```

---

## 7. Domain Result

Use deterministic result:

```ts
type AttendanceResult =
  | { ok: true; attendanceId: string }
  | { ok: false; code: "INVALID_QR" }
  | { ok: false; code: "QR_EXPIRED" }
  | { ok: false; code: "ALREADY_PRESENT" }
  | { ok: false; code: "WINDOW_CLOSED" }
  | { ok: false; code: "NOT_ELIGIBLE" }
  | { ok: false; code: "UNAUTHENTICATED" };
```

---

## 8. Audit Actual QR URL

Capture real QR payload.

Expected public URL concept:

```txt
https://exisel.web.id/attendance/scan?t=<signed-token>
```

QR must never contain:

```txt
localhost
0.0.0.0
Docker hostname
private server IP
```

---

## 9. URL Encoding

If token contains reserved characters, use:

```ts
const params = new URLSearchParams();
params.set("t", token);
```

Prefer URL-safe token/base64url.

Never concatenate unescaped token manually.

---

## 10. One Deep-Link Entrypoint

Use one canonical route:

```txt
/attendance/scan
```

Responsibilities:

```txt
read token
validate shape
check session
preserve token through auth
process attendance through shared domain service
return deterministic result
```

---

## 11. Logged-Out User Flow

Required flow:

```txt
Google Lens
↓
/attendance/scan?t=ABC
↓
no session
↓
/login?returnTo=<encoded attendance path>
↓
Google OAuth
↓
session created
↓
safe returnTo restored
↓
same QR token processed
```

Critical regression:

```txt
QR token must survive OAuth round-trip.
```

---

## 12. Safe `returnTo`

Allow only relative internal paths.

Valid:

```txt
/attendance/scan?t=...
/kehadiran
/dashboard
```

Reject:

```txt
https://evil.example
//evil.example
javascript:...
```

Reuse existing safe redirect/canonical origin helper.

---

## 13. Session/Cookie Audit

Audit production cookie:

```txt
Secure
HttpOnly
SameSite
Domain
Path
Expires/Max-Age
```

Do not assume Google Lens always shares existing browser session.

If no session, auth must work cleanly.

---

## 14. Canonical Origin Regression

All OAuth/attendance redirects must remain:

```txt
https://exisel.web.id
```

Never:

```txt
http://0.0.0.0:3000
http://localhost:3000
```

---

## 15. QR Expiry

QR old/rotated must produce:

```txt
QR_EXPIRED
```

UI:

```txt
QR sudah kedaluwarsa. Scan QR terbaru.
```

Never throw unhandled exception.

---

## 16. Duplicate Attendance

Backend must be idempotent.

Use DB uniqueness according to schema, e.g.:

```txt
UNIQUE(student_id, attendance_session_id)
```

Concurrent duplicate should become:

```txt
ATTENDANCE_ALREADY_RECORDED
```

not DB 500.

---

## 17. Attendance Transaction

```txt
BEGIN
↓
validate activity/session/window
↓
validate student eligibility
↓
INSERT
↓
COMMIT
```

Handle unique violation explicitly.

---

## 18. Null/Undefined Audit

Check every potential missing record:

```txt
student profile
registration
activity
schedule
attendance session
selected extracurricular
session user
QR activity
```

No `undefined.id`, nil dereference, or unhandled null.

---

## 19. Deep-Link Mutation Safety

Google Lens opens a `GET`.

Prefer:

```txt
GET /attendance/scan?t=...
→ bootstrap/auth page
→ authenticated one-time POST
→ attendance write
```

This prevents:

```txt
prefetch
crawler
link preview
```

from accidentally mutating attendance.

---

## 20. Auto Attendance After Login

If existing requirement is auto-present after scan:

```txt
authenticated attendance page
→ send one POST automatically
```

Frontend guard:

```ts
const submittedRef = useRef(false);
```

Backend idempotency remains mandatory.

---

## 21. Timeout Recovery

If mutation times out:

```txt
POST timeout
↓
GET current attendance status
↓
already recorded?
├─ yes → success
└─ no → offer retry
```

Do not blindly double-submit.

---

## 22. Error Page Mapping

Replace generic:

```txt
Absensi belum dapat disimpan.
HTTP 500
```

with:

```txt
INVALID_QR
→ QR tidak valid.

QR_EXPIRED
→ QR sudah kedaluwarsa.

ALREADY_PRESENT
→ Kehadiranmu sudah tercatat.

WINDOW_CLOSED
→ Waktu absensi sudah ditutup.

NOT_ELIGIBLE
→ Kamu tidak terdaftar pada kegiatan ini.

SERVER_ERROR
→ Sistem kehadiran sedang bermasalah.
  Kode referensi: <request-id-short>
```

---

# PART B — ANDROID CHROME CAMERA

## 23. Capability Checks

Before request:

```ts
window.isSecureContext
navigator.mediaDevices
navigator.mediaDevices.getUserMedia
```

Production must be HTTPS.

---

## 24. Do Not Request Camera Automatically on Mount

Avoid:

```ts
useEffect(() => {
  getUserMedia(...);
}, []);
```

Preferred:

```txt
User taps Aktifkan Kamera
↓
direct getUserMedia()
```

---

## 25. User Gesture

Button must directly invoke camera request:

```tsx
<button onClick={handleEnableCamera}>
  Aktifkan kamera
</button>
```

```ts
async function handleEnableCamera() {
  await startCamera();
}
```

Do not make button only toggle a state that may or may not later trigger media access.

---

## 26. Camera Constraints

First attempt:

```ts
{
  audio: false,
  video: {
    facingMode: {
      ideal: "environment"
    }
  }
}
```

Use `ideal`, not immediately `exact`.

---

## 27. Constraint Fallback

Only for constraint failure:

```ts
getUserMedia({
  audio: false,
  video: true
});
```

Do not retry generic stream after `NotAllowedError`.

---

## 28. Exact Camera Error Classification

Handle:

```txt
NotAllowedError
NotFoundError
NotReadableError
OverconstrainedError
AbortError
SecurityError
unsupported getUserMedia
insecure context
```

Do not label all failures as "permission denied".

---

## 29. Previously Denied Permission

Important behavior:

```txt
If user previously chose Block,
Chrome may immediately return NotAllowedError
without showing a new prompt.
```

The web app cannot force the browser to re-prompt.

Correct UX:

```txt
call getUserMedia
↓
NotAllowedError
↓
show permission settings guide
```

---

## 30. Android Chrome Permission Recovery

Message:

```txt
Kamera diblokir untuk Exisel.

1. Ketuk ikon pengaturan/izin di address bar.
2. Buka Izin / Permissions.
3. Ubah Kamera menjadi Izinkan.
4. Kembali ke Exisel.
5. Tekan "Coba kamera lagi".
```

Secondary help if Chrome app permission itself is blocked:

```txt
Android Settings
→ Apps
→ Chrome
→ Permissions
→ Camera
→ Allow
```

---

## 31. Permissions API

If available, `navigator.permissions.query()` can be used only as diagnostic.

Do not depend on it for correctness.

Final truth:

```txt
actual getUserMedia result
```

---

## 32. Permissions-Policy

Audit actual production header.

Search:

```txt
Permissions-Policy
camera=()
camera=(self)
```

For same-origin camera:

```txt
Permissions-Policy: camera=(self)
```

If current header has `camera=()`, fix it.

---

## 33. CSP / HTTPS / Mixed Content

Audit:

```txt
Content-Security-Policy
Permissions-Policy
Strict-Transport-Security
Cross-Origin-Opener-Policy
Cross-Origin-Embedder-Policy
```

Check:

```ts
window.isSecureContext === true
```

No HTTP/mixed-content scanner resources.

---

## 34. Video Element

Use:

```tsx
<video
  ref={videoRef}
  autoPlay
  muted
  playsInline
/>
```

After stream:

```ts
video.srcObject = stream;
await video.play();
```

---

## 35. Camera State Machine

```ts
type CameraState =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "error";
```

Prevent multiple simultaneous `getUserMedia()` calls.

---

## 36. Camera Start Skeleton

```ts
async function startCamera() {
  if (cameraState === "requesting") return;

  if (!window.isSecureContext) {
    setCameraState("error");
    setCameraError("INSECURE_CONTEXT");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setCameraState("unavailable");
    setCameraError("UNSUPPORTED");
    return;
  }

  setCameraState("requesting");

  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
      });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    setCameraState("active");
  } catch (error) {
    handleCameraError(error);
  }
}
```

Adapt to current codebase.

---

## 37. Stream Cleanup

On component unmount / navigation / scanner stop:

```ts
stream.getTracks().forEach(
  track => track.stop()
);

streamRef.current = null;

if (videoRef.current) {
  videoRef.current.srcObject = null;
}
```

This prevents stale camera resource from causing `NotReadableError` on next visit.

---

## 38. Camera Error UX

`NotAllowedError`:

```txt
Kamera diblokir. Aktifkan izin kamera untuk Exisel.
```

`NotFoundError`:

```txt
Tidak ada kamera yang tersedia.
```

`NotReadableError`:

```txt
Kamera sedang digunakan aplikasi lain.
Tutup aplikasi kamera/video lain lalu coba lagi.
```

`OverconstrainedError`:

```txt
fallback once to video:true
```

---

## 39. Scanner Must Wait for Video

QR decoder starts only when:

```txt
cameraState === active
video is ready
videoWidth > 0
videoHeight > 0
```

---

## 40. Scanner State Machine

```ts
type ScanState =
  | "idle"
  | "camera_request"
  | "scanning"
  | "qr_detected"
  | "submitting"
  | "success"
  | "rejected"
  | "error";
```

---

## 41. Prevent Duplicate Frame POST

After QR detected:

```txt
pause scanner
state = submitting
send one attendance request
```

Resume only if appropriate.

---

## 42. Separate Failure Layers

Keep separate:

```txt
CameraError
QRCodeDecodeError
AttendanceAPIError
```

Do not show camera permission message when server returns an attendance error.

---

## 43. Navigation Cleanup

On:

```txt
browser Back
Next.js route change
logout
component unmount
```

stop all camera tracks.

---

## 44. Service Worker / PWA Audit

If project has service worker:

```txt
scanner JS must update correctly
attendance mutation = network-only
auth mutation = network-only
QR validation = network-only
```

Avoid stale cached scanner code.

---

# PART C — SHARED ATTENDANCE DOMAIN

## 45. Both Scanner Sources Use Same Server Logic

Both:

```txt
Google Lens
in-page QR scanner
```

must call the same attendance domain/service.

Do not keep duplicate attendance business logic.

---

## 46. Suggested API Contract

```txt
POST /api/attendance/scan
```

Body:

```json
{
  "token": "..."
}
```

Success:

```json
{
  "ok": true,
  "data": {
    "status": "present"
  }
}
```

Expected rejection:

```json
{
  "ok": false,
  "code": "QR_EXPIRED",
  "message": "QR sudah kedaluwarsa."
}
```

---

# PART D — EXACTLY 8 OMO SLIM SUBAGENTS

## 47. Main Orchestrator

The main OpenCode/OMO Slim agent must automatically spawn:

```txt
EXACTLY 8 SUBAGENTS
```

Main orchestrator is not counted as one of the 8.

Responsibilities:

```txt
delegate
freeze shared contracts
prevent file conflicts
review diffs
integrate
run final test/build
```

---

## 48. Subagent 1 — Incident Reproduction & Observability

Role:

```txt
Incident / Diagnostics Engineer
```

Tasks:

```txt
reproduce both bugs
capture exact server exception
capture exact camera DOMException
add request-ID tracing
capture redirect chain
produce root-cause evidence
```

Own:

```txt
docs/incidents/*
src/lib/observability/*
diagnostic test helpers
```

Must not implement final DB/camera fix.

---

## 49. Subagent 2 — QR Deep Link & Google Lens Routing

Role:

```txt
Deep-Link / Routing Engineer
```

Tasks:

```txt
audit QR URL
fix token URL encoding
fix attendance deep-link entry
preserve returnTo
prevent GET prefetch mutation
Google Lens routing
```

Own:

```txt
attendance route layer
deep-link helpers
attendance redirect integration
```

---

## 50. Subagent 3 — Session/OAuth Continuity

Role:

```txt
Auth Integration Engineer
```

Tasks:

```txt
QR token survives OAuth
logged-out Google Lens flow
cookie/session audit
canonical origin
safe returnTo
expired/revoked session tests
```

Own:

```txt
auth integration files
session/auth regression tests
```

Must not weaken Turnstile.

---

## 51. Subagent 4 — Attendance Domain & Database Reliability

Role:

```txt
Attendance Backend Engineer
```

Tasks:

```txt
locate exact HTTP 500
classify expected errors
transaction safety
idempotency
unique constraint handling
DB error mapping
null/undefined protection
```

Own:

```txt
attendance domain/service
attendance repository
DB attendance tests
specific migration/index if required
```

---

## 52. Subagent 5 — Android Camera Permission

Role:

```txt
Mobile Media Engineer
```

Tasks:

```txt
explicit user-gesture getUserMedia
camera state machine
DOMException classification
constraint fallback
stream cleanup
permission recovery UX
```

Own:

```txt
camera hook
camera permission helper
video/media component
camera unit tests
```

---

## 53. Subagent 6 — QR Scanner Frontend

Role:

```txt
QR Scanner Frontend Engineer
```

Tasks:

```txt
decoder lifecycle
duplicate frame prevention
pause/resume
scan state machine
mobile scanner UI
camera/decode/API error separation
```

Own:

```txt
QR scanner component
scanner hooks
scanner state machine
```

---

## 54. Subagent 7 — HTTPS / Headers / Caddy

Role:

```txt
Infrastructure & Browser Security Engineer
```

Tasks:

```txt
audit HTTPS
Permissions-Policy
CSP
Caddy/reverse proxy
actual production headers
camera=(self) where appropriate
mixed-content audit
```

Own:

```txt
Caddyfile
security header configuration
infra docs
```

Must not weaken CSP/security globally.

---

## 55. Subagent 8 — Integration / Android / Google Lens QA

Role:

```txt
QA + Integration Engineer
```

Tasks:

```txt
Google Lens test matrix
Android Chrome matrix
Playwright/integration tests
duplicate concurrency
auth round-trip
final acceptance report
```

Own:

```txt
tests/e2e/*
tests/integration/*
docs/qa/*
```

---

## 56. File Conflict Policy

Strict:

```txt
one owner per file/folder
```

If shared file needs changes:

```txt
subagent documents requested diff
main orchestrator performs shared edit
```

No concurrent edits to same file.

---

## 57. Suggested Execution Graph

```txt
          Agent 1
        Diagnostics
            │
  ┌─────────┼─────────┐
  ▼         ▼         ▼
Agent 2   Agent 4   Agent 5
DeepLink  Backend   Camera
  │         │         │
  ▼         │         ▼
Agent 3     │       Agent 6
Auth        │       Scanner
  └─────────┼─────────┘
            ▼
         Agent 7
          Infra
            │
            ▼
         Agent 8
      Integration/QA
```

Agent 7 may work in parallel once initial evidence exists.

---

## 58. OMO Slim Master Prompt

```txt
Read plans.md completely.

You are the main orchestrator using oh-my-opencode-slim / OMO Slim.

Automatically spawn EXACTLY 8 subagents:
1. Incident Reproduction & Observability
2. QR Deep Link & Google Lens Routing
3. Session/OAuth Continuity
4. Attendance Domain & Database Reliability
5. Android Camera Permission
6. QR Scanner Frontend
7. HTTPS / Headers / Caddy
8. Integration / Android / Google Lens QA

Do not ask me to launch them manually unless the runtime truly cannot create subagents.

Rules:
- Root cause first, coding second.
- Non-overlapping file ownership.
- Expected attendance failures must never become generic HTTP 500.
- Camera permission logic must use actual getUserMedia result and DOMException.
- Do not use browser refresh as a fix.
- Do not bypass permission.
- Do not weaken Google OAuth, Turnstile, session, QR security, rate limit,
  canonical origin, or safe returnTo.

After subagents finish:
1. review all diffs,
2. integrate shared changes centrally,
3. run full tests,
4. run production build,
5. report exact root cause for both bugs,
6. report files changed,
7. report remaining risk,
8. do not declare success until real Google Lens and real Android Chrome tests pass.
```

---

# PART E — TEST MATRIX

## 59. Google Lens Logged In

Expected:

```txt
valid QR
→ no 500
→ attendance saved once
→ success UI
```

---

## 60. Google Lens Logged Out

Expected:

```txt
QR deep link
→ login
→ Google OAuth
→ exact attendance returnTo
→ attendance success
```

---

## 61. Expired QR

Expected:

```txt
QR_EXPIRED
not HTTP 500
```

---

## 62. Duplicate QR

Expected:

```txt
one DB row
second request = already recorded
```

---

## 63. Concurrent Duplicate

Send 25–50 simultaneous requests for same student and QR.

Expected:

```txt
1 attendance record
no duplicate row
no unhandled DB error
```

---

## 64. Android Fresh Permission

Set site camera permission to Ask.

Tap:

```txt
Aktifkan kamera
```

Expected:

```txt
Chrome permission prompt
```

---

## 65. Android Allow

Expected:

```txt
rear camera opens
video plays
scanner starts
```

---

## 66. Android Deny

Expected:

```txt
NotAllowedError
correct blocked-permission UI
```

---

## 67. Previously Blocked

Expected:

```txt
no fake re-prompt claim
site settings instructions
retry works after user changes permission
```

---

## 68. Camera Busy

Expected:

```txt
NotReadableError
```

Correct message.

---

## 69. Constraint Failure

Expected:

```txt
OverconstrainedError
→ one fallback to video:true
```

---

## 70. Camera Cleanup

```txt
open camera
→ navigate away
→ return
```

Expected:

```txt
old tracks stopped
camera can open again
```

---

## 71. Duplicate QR Frame

Hold QR in front of camera.

Expected:

```txt
only one attendance request while state=submitting
```

---

## 72. Network Failure

Expected:

```txt
network-specific error
retry
no generic HTTP 500 page
```

---

## 73. Database Failure

Expected:

```txt
503
safe message
request ID
```

---

# PART F — AUTOMATED TESTS

## 74. Attendance Unit Tests

```txt
invalid token
expired token
duplicate
missing activity
missing student
closed window
unique DB conflict
unexpected DB failure
```

---

## 75. Camera Unit Tests

Mock `getUserMedia`.

```txt
success
NotAllowedError
NotFoundError
NotReadableError
OverconstrainedError + fallback
unsupported API
insecure context
track cleanup
double-click protection
```

---

## 76. Scanner Unit Tests

```txt
decoder waits for active stream
one submit per QR
pause during submission
resume after safe rejection
cleanup on unmount
```

---

## 77. Integration Tests

```txt
deep-link
OAuth returnTo
attendance write
session
duplicate
error mapping
```

---

## 78. Physical Tests Mandatory

Automated browser tests are not enough for real mobile media permission.

Must test:

```txt
real Android Chrome
real camera
real Google Lens
real HTTPS staging/production
```

---

# PART G — PRODUCTION

## 79. Headers

Verify actual response headers, not only source config:

```txt
Permissions-Policy
Content-Security-Policy
Strict-Transport-Security
```

---

## 80. Camera Policy

Same-origin scanner:

```txt
Permissions-Policy: camera=(self)
```

Do not accidentally deploy:

```txt
camera=()
```

---

## 81. HTTPS

Check:

```ts
window.isSecureContext === true
```

No redirect to internal HTTP host.

---

## 82. Cache

Do not cache:

```txt
attendance mutation
QR validation result
auth mutation
dynamic attendance write result
```

---

# PART H — ROLLOUT

## 83. Phase 0

Instrumentation + exact root cause.

---

## 84. Phase 1

Fix Google Lens HTTP 500.

---

## 85. Phase 2

Fix Android camera permission/lifecycle.

---

## 86. Phase 3

Unify both scanners into one attendance domain.

---

## 87. Phase 4

Run actual project scripts:

```bash
npm run lint
npm run test
npm run test:auth
npm run build
```

If Go attendance is present:

```bash
go test ./...
go vet ./...
```

---

## 88. Phase 5

Staging physical test:

```txt
Android Chrome
Google Lens
HTTPS
production-like headers
```

---

## 89. Phase 6

Production deploy and monitor:

```txt
attendance 5xx
duplicates
QR_EXPIRED
session failures
camera failure categories
```

---

# PART I — ACCEPTANCE

## 90. Google Lens

```txt
[ ] Valid QR does not return 500.
[ ] Logged-in user succeeds.
[ ] Logged-out user completes OAuth and returns to same QR.
[ ] QR token survives auth.
[ ] Expired QR gets deterministic rejection.
[ ] Duplicate does not crash.
[ ] Expected errors use 4xx.
[ ] Unexpected 500 includes request ID.
```

---

## 91. Android Camera

```txt
[ ] Explicit user click requests camera.
[ ] Fresh permission causes Chrome prompt.
[ ] Allow opens camera.
[ ] Rear camera preferred.
[ ] Constraint fallback works.
[ ] Previously blocked permission shows correct settings guide.
[ ] Camera tracks stop on route leave.
[ ] Camera reopens without refresh.
[ ] Scanner waits for video readiness.
```

---

## 92. Scanner

```txt
[ ] One QR detection = one submission.
[ ] Scanner pauses while submitting.
[ ] No rapid duplicate POSTs.
[ ] Expected backend errors don't permanently break scanner.
[ ] Network retry works.
```

---

## 93. Security

```txt
[ ] QR signature/expiry preserved.
[ ] Session validation server-side.
[ ] OAuth preserved.
[ ] Turnstile preserved.
[ ] Rate limiting preserved.
[ ] safe returnTo preserved.
[ ] canonical origin preserved.
[ ] GET prefetch cannot accidentally mark attendance.
[ ] no secret/token logging.
```

---

## 94. 8 Subagents

```txt
[ ] Exactly 8 subagents.
[ ] Non-overlapping file ownership.
[ ] Root-cause report from relevant agents.
[ ] Main orchestrator integrates shared files.
[ ] Full tests pass.
[ ] Production build passes.
```

---

# 95. Definition of Done

Before:

```txt
Google Lens → HTTP 500
Android Chrome → camera stuck / no permission flow
```

After:

```txt
Google Lens
→ Exisel
→ auth if needed
→ QR preserved
→ atomic/idempotent attendance
→ success or deterministic rejection
```

and:

```txt
Android Chrome
→ tap Aktifkan Kamera
→ getUserMedia
→ browser prompt if allowed by browser state
→ rear camera
→ scanner
→ attendance
```

No manual page refresh is part of the normal recovery flow.
