# EXISEL — QR / Barcode Attendance Upgrade Plan

## Overview

Target fitur:

> Admin membuat QR absensi → siswa scan pakai Google Lens/kamera → redirect ke EXISEL → jika sudah login langsung tercatat hadir → jika belum login diarahkan login → setelah login selesai attendance otomatis dilanjutkan tanpa perlu scan ulang.

## Main Flow

```text
Admin buat sesi absensi
↓
QR dibuat
↓
Siswa scan
↓
Redirect ke /attendance/scan?t=TOKEN
↓
Cek session login
├── Sudah login
│   ↓
│   Validasi QR
│   ↓
│   Validasi siswa & eskul
│   ↓
│   Cek duplicate
│   ↓
│   Otomatis HADIR
│
└── Belum login
    ↓
    Buat pending attendance intent
    ↓
    Redirect /login
    ↓
    Login berhasil
    ↓
    Resume attendance intent
    ↓
    Validasi QR lagi
    ↓
    Otomatis HADIR
```

## Goals

- [ ] Admin dapat membuat QR absensi.
- [ ] QR hanya berlaku untuk sesi absensi tertentu.
- [ ] QR dapat discan menggunakan Google Lens.
- [ ] QR membuka website EXISEL.
- [ ] User yang sudah login tidak perlu menekan tombol hadir.
- [ ] User yang belum login diarahkan ke login.
- [ ] Setelah login, absensi sebelumnya otomatis dilanjutkan.
- [ ] User tidak perlu scan QR kedua kali.
- [ ] QR memiliki expiration.
- [ ] QR dapat dinonaktifkan admin.
- [ ] Siswa tidak bisa absen dua kali pada sesi yang sama.
- [ ] Siswa tidak bisa memalsukan student ID.
- [ ] Backend yang menentukan kehadiran.

## Recommended QR URL

```text
https://exisel.com/attendance/scan?t=<OPAQUE_RANDOM_TOKEN>
```

Student identity harus selalu berasal dari authenticated session:

```ts
req.user.id
```

QR hanya menentukan attendance session.

## Secure QR Token

```ts
import crypto from "crypto"

const qrToken = crypto.randomBytes(32).toString("hex")

const tokenHash = crypto
  .createHash("sha256")
  .update(qrToken)
  .digest("hex")
```

Database simpan hash, bukan raw token.

## Database Architecture

```text
users
sessions
extracurriculars
student_extracurriculars
attendance_sessions
attendance_qr_tokens
attendance_intents
attendance_records
```

### attendance_sessions

```sql
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY,
    extracurricular_id UUID NOT NULL,
    title VARCHAR(255),
    created_by UUID NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (extracurricular_id) REFERENCES extracurriculars(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

Status:

```text
DRAFT
SCHEDULED
ACTIVE
CLOSED
EXPIRED
CANCELLED
```

### attendance_qr_tokens

```sql
CREATE TABLE attendance_qr_tokens (
    id UUID PRIMARY KEY,
    attendance_session_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (attendance_session_id)
        REFERENCES attendance_sessions(id)
        ON DELETE CASCADE,
    FOREIGN KEY (created_by)
        REFERENCES users(id)
);
```

### attendance_records

```sql
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY,
    attendance_session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PRESENT',
    attendance_method VARCHAR(30) NOT NULL DEFAULT 'QR',
    checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    qr_token_id UUID NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attendance_session_id)
        REFERENCES attendance_sessions(id),
    FOREIGN KEY (student_id)
        REFERENCES users(id),
    FOREIGN KEY (qr_token_id)
        REFERENCES attendance_qr_tokens(id),
    UNIQUE(attendance_session_id, student_id)
);
```

### attendance_intents

Dipakai saat siswa scan QR tetapi belum login.

```sql
CREATE TABLE attendance_intents (
    id UUID PRIMARY KEY,
    intent_token_hash VARCHAR(255) NOT NULL UNIQUE,
    qr_token_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent TEXT
);
```

Recommended TTL:

```text
10 minutes
```

Gunakan HttpOnly cookie:

```text
exisel_attendance_intent=<token>
HttpOnly
Secure
SameSite=Lax
Max-Age=600
Path=/
```

## Scan API

```http
POST /api/attendance/scan
```

Request:

```json
{
  "token": "QR_TOKEN"
}
```

Middleware:

```text
optionalAuth
```

Flow:

```text
Receive token
↓
Hash token
↓
Find QR
↓
QR valid?
↓
QR revoked?
↓
QR expired?
↓
Attendance session ACTIVE?
↓
Authenticated?
├── YES → processAttendance()
└── NO  → createAttendanceIntent()
          ↓
          LOGIN_REQUIRED
```

## Login Integration

Existing EXISEL session 30 hari tetap dipakai.

```text
login success
↓
ada pending attendance intent?
├── NO → /dashboard
└── YES
    ↓
    /attendance/resume
```

## Resume Attendance API

```http
POST /api/attendance/resume
```

Middleware:

```text
requireAuth
```

Flow:

```text
Read intent cookie
↓
Hash intent token
↓
Find intent
↓
Intent valid?
↓
Not consumed?
↓
Not expired?
↓
Get original QR
↓
Validate QR AGAIN
↓
Validate attendance session AGAIN
↓
Validate authenticated student
↓
Validate extracurricular membership
↓
Check duplicate
↓
Create attendance
↓
Mark intent consumed
↓
Clear intent cookie
↓
Success
```

## Attendance Service

```text
AttendanceService
```

Responsibilities:

```text
createSession()
closeSession()
generateQr()
validateQr()
processAttendance()
createIntent()
resumeIntent()
checkDuplicate()
getAttendanceRecords()
```

Pseudo:

```ts
async function processAttendance({
    attendanceSessionId,
    userId,
    qrTokenId,
    metadata
}) {
    // validate account
    // validate role
    // validate attendance session
    // validate extracurricular membership
    // check duplicate
    // create attendance record
}
```

## Student Eligibility

Backend harus memastikan:

```text
user.status === ACTIVE
user.role === STUDENT
student terdaftar di extracurricular terkait
```

## Admin Flow

```text
/admin/attendance
↓
Pilih ekstrakurikuler
↓
Set tanggal
↓
Set start time
↓
Set end time
↓
[Buka Absensi]
↓
Create attendance_session
↓
Generate secure QR
↓
Tampilkan QR
```

## Admin APIs

```text
POST /api/admin/attendance/sessions
GET  /api/admin/attendance/sessions/:id

POST /api/admin/attendance/sessions/:id/close

POST /api/admin/attendance/sessions/:id/qr
POST /api/admin/attendance/sessions/:id/qr/regenerate

GET /api/admin/attendance/sessions/:id/records
```

Middleware:

```text
requireAuth
requireRole("admin", "teacher")
```

## QR Expiration

QR mengikuti:

```text
attendance_session.ends_at
```

Backend wajib memakai server time.

## Regenerate QR

```text
old QR
↓
revoked_at = NOW()
↓
generate token baru
↓
QR baru tampil
```

QR lama langsung invalid.

## Close Attendance

```http
POST /api/admin/attendance/sessions/:id/close
```

Set:

```text
status = CLOSED
```

Semua QR terkait langsung tidak berlaku.

## Duplicate Protection

Database constraint:

```sql
UNIQUE(attendance_session_id, student_id)
```

Jika scan ulang:

```text
ALREADY_ATTENDED
```

## Error Codes

```text
QR_INVALID
QR_EXPIRED
QR_REVOKED
ATTENDANCE_NOT_STARTED
ATTENDANCE_CLOSED
LOGIN_REQUIRED
INTENT_INVALID
INTENT_EXPIRED
INTENT_CONSUMED
ALREADY_ATTENDED
NOT_EXTRACURRICULAR_MEMBER
ACCOUNT_DISABLED
FORBIDDEN
```

## Student UI

### Success

```text
✓ Kehadiran Berhasil

Status:
HADIR

Kehadiran kamu sudah tercatat.
```

### Already Attended

```text
✓ Kamu Sudah Absen
```

### QR Expired

```text
QR Absensi Sudah Tidak Berlaku
```

### Login Required

```text
Menyimpan proses absensi...
↓
Silakan login untuk melanjutkan.
```

## Google Lens Compatibility

QR harus HTTPS URL normal:

```text
https://exisel.com/attendance/scan?t=TOKEN
```

Compatible dengan:

```text
Google Lens
Android Camera
iPhone Camera
QR Scanner
```

## Frontend Routes

```text
/attendance/scan
/attendance/resume
/attendance/success
/attendance/error
/login
/admin/attendance
/admin/attendance/new
/admin/attendance/:sessionId
```

## Recommended Backend Structure

```text
src/
├── modules/
│   ├── auth/
│   └── attendance/
│       ├── attendance.controller.ts
│       ├── attendance.service.ts
│       ├── attendance.repository.ts
│       ├── attendance.routes.ts
│       ├── attendance.validation.ts
│       ├── attendance.types.ts
│       ├── qr/
│       │   ├── qr.service.ts
│       │   ├── qr.repository.ts
│       │   └── qr.utils.ts
│       └── intent/
│           ├── attendance-intent.service.ts
│           └── attendance-intent.repository.ts
```

## Security Requirements

- [ ] Secure random QR token.
- [ ] QR token hashed in DB.
- [ ] HttpOnly auth session 30 hari.
- [ ] HttpOnly short-lived attendance intent.
- [ ] Server-side QR expiry.
- [ ] Student identity dari server session.
- [ ] Jangan percaya studentId dari frontend.
- [ ] Membership validation.
- [ ] Duplicate attendance prevention.
- [ ] Admin/teacher role validation.
- [ ] Rate limiting.
- [ ] Server time validation.
- [ ] QR revoke/regenerate.
- [ ] Attendance close validation.

## Rate Limiting

```text
POST /api/attendance/scan
POST /api/attendance/resume
```

Contoh:

```text
20 requests / minute / IP
10 attempts / minute / authenticated user
```

## Transaction

```text
BEGIN
validate session
validate membership
check existing
insert attendance
consume intent
COMMIT
```

Jika error:

```text
ROLLBACK
```

## Concurrency

Jika dua request masuk bersamaan, unique constraint memastikan hanya satu record dibuat.

## Optional V2 — Rotating QR

```text
QR berubah setiap 30-60 detik
```

Tujuan:

```text
mengurangi pemakaian screenshot QR dari luar lokasi
```

Implement setelah V1 stabil.

## Admin Live Attendance

```text
Hadir: 27 / 35

Nama               Waktu
--------------------------------
Student A          15:01
Student B          15:02
Student C          15:05
```

P1:

```text
polling 5-10 detik
```

P2:

```text
WebSocket / SSE
```

## Testing Plan

### QR

- [ ] Google Lens dapat membaca QR.
- [ ] QR membuka HTTPS EXISEL.
- [ ] Token valid diterima.
- [ ] Token palsu ditolak.
- [ ] Token revoked ditolak.
- [ ] Token expired ditolak.

### Already Logged In

- [ ] Student scan.
- [ ] Session 30 hari terdeteksi.
- [ ] Attendance otomatis dibuat.
- [ ] Tidak perlu tombol hadir.

### Logged Out

- [ ] Student scan.
- [ ] Pending intent dibuat.
- [ ] Redirect login.
- [ ] Student login.
- [ ] Attendance otomatis dilanjutkan.
- [ ] Tidak perlu scan ulang.

### Duplicate

- [ ] Student scan dua kali.
- [ ] Hanya satu attendance record.
- [ ] Response berikutnya `ALREADY_ATTENDED`.

### Membership

- [ ] Anggota eskul → success.
- [ ] Bukan anggota → reject.

### Timing

- [ ] Sebelum starts_at → reject.
- [ ] Saat ACTIVE → success.
- [ ] Sesudah ends_at → reject.

### Admin

- [ ] Admin dapat membuat sesi.
- [ ] Student tidak bisa membuat sesi.
- [ ] Admin regenerate QR.
- [ ] QR lama invalid.
- [ ] Admin close session.
- [ ] QR tidak bisa dipakai setelah closed.

### Login Resume

- [ ] Login gagal sekali lalu berhasil → intent tetap berlaku.
- [ ] Intent expired → attendance gagal.
- [ ] Admin close session saat student login → attendance gagal.
- [ ] Refresh resume → tidak duplicate.

## Implementation Phases

### Phase 1 — Database

```text
attendance_sessions
attendance_qr_tokens
attendance_records
attendance_intents
indexes
foreign keys
unique constraints
```

### Phase 2 — QR Service

```text
generateQrToken()
hashQrToken()
validateQrToken()
revokeQrToken()
regenerateQr()
```

### Phase 3 — Attendance Service

```text
processAttendance()
validateAttendanceSession()
validateStudentMembership()
checkDuplicateAttendance()
createAttendanceRecord()
```

### Phase 4 — Scan API

```text
POST /api/attendance/scan
```

### Phase 5 — Attendance Intent

```text
createAttendanceIntent()
validateAttendanceIntent()
consumeAttendanceIntent()
```

### Phase 6 — Login Integration

```text
login success
↓
detect pending attendance
↓
resume attendance
```

### Phase 7 — Resume API

```text
POST /api/attendance/resume
```

### Phase 8 — Admin Attendance

```text
create attendance
generate QR
display QR
regenerate QR
close attendance
view records
```

### Phase 9 — Student UI

```text
/attendance/scan
/attendance/resume
/attendance/success
/attendance/error
```

### Phase 10 — Security

```text
rate limit
role authorization
token hashing
Secure cookies
membership validation
time validation
duplicate constraint
```

### Phase 11 — Admin UX

```text
fullscreen QR
attendance counter
attendance table
close confirmation
regenerate confirmation
```

### Phase 12 — Testing

```text
unit
integration
authentication
attendance
QR
browser
Google Lens
concurrency
security
```

## Priority

### P0 — Core

```text
Attendance session
Secure QR
QR scan redirect
Session detection
Automatic attendance
Pending attendance intent
Login resume
Duplicate prevention
Attendance expiry
Admin close attendance
```

### P1 — Security / UX

```text
QR regenerate
membership validation
rate limits
attendance history
live count
audit logs
```

### P2 — Advanced

```text
rotating QR
WebSocket/SSE
CSV/Excel export
fullscreen QR presentation
attendance analytics
```

## Definition of Done

- [ ] Admin dapat membuat sesi attendance.
- [ ] Admin mendapatkan QR Code.
- [ ] QR berisi HTTPS EXISEL URL.
- [ ] Google Lens dapat membuka QR.
- [ ] QR menggunakan secure random token.
- [ ] Raw QR token tidak disimpan di database.
- [ ] QR mempunyai expiration.
- [ ] QR dapat direvoke.
- [ ] Student dengan active login session langsung hadir setelah scan.
- [ ] Student yang belum login diarahkan login.
- [ ] Pending attendance tersimpan.
- [ ] Setelah login attendance otomatis dilanjutkan.
- [ ] Student tidak perlu scan ulang.
- [ ] QR divalidasi ulang setelah login.
- [ ] User identity berasal dari server session.
- [ ] Student ID tidak dipercaya dari frontend.
- [ ] Student hanya dapat absen untuk eskul yang diikuti.
- [ ] Attendance hanya dapat dilakukan saat sesi aktif.
- [ ] Duplicate attendance tidak dapat terjadi.
- [ ] Admin dapat menutup attendance.
- [ ] QR tidak dapat digunakan setelah attendance ditutup.
- [ ] Admin dapat regenerate QR.
- [ ] Old QR tidak dapat dipakai setelah regenerate.
- [ ] Intent hanya dapat digunakan sekali.
- [ ] Intent mempunyai expiration.
- [ ] Student success page jelas.
- [ ] Error states jelas.
- [ ] Mobile flow dites dengan Google Lens.

## Final Target UX

### Sudah Login

```text
SCAN QR
   ↓
OPEN EXISEL
   ↓
AUTO CHECK SESSION
   ↓
AUTO ATTENDANCE
   ↓
✅ HADIR
```

### Belum Login

```text
SCAN QR
   ↓
OPEN EXISEL
   ↓
SAVE PENDING ATTENDANCE
   ↓
LOGIN
   ↓
AUTO RESUME
   ↓
✅ HADIR
```

> Siswa cukup **1 kali scan**. Jika sudah login langsung hadir. Jika belum login, EXISEL menyimpan attendance intent, meminta siswa login, lalu otomatis menyelesaikan absensi setelah login tanpa scan QR ulang.
