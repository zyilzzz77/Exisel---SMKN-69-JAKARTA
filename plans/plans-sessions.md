# EXISEL — Persistent Authentication Session Plan

## 1. Overview

EXISEL adalah website kehadiran ekstrakurikuler SMKN 69 Jakarta.

Saat ini siswa harus melakukan login untuk mengakses fitur tertentu seperti:

- Absensi ekstrakurikuler
- Riwayat kehadiran
- Profil siswa
- Dashboard siswa
- Fitur lain yang membutuhkan autentikasi

Target fitur baru:

> Siswa cukup login satu kali, kemudian sesi login tetap aktif selama maksimal **30 hari**.

Selama session masih valid, siswa tidak perlu memasukkan username/password kembali.

Contoh flow:

```text
Login
↓
Session dibuat
↓
Session disimpan selama 30 hari
↓
User keluar / close browser
↓
Besok buka EXISEL
↓
Session masih valid
↓
Langsung masuk Dashboard
↓
Bisa melakukan absensi
```

Jika sudah lewat 30 hari:

```text
Open EXISEL
↓
Backend mengecek session
↓
Session expired
↓
Session dihapus / dinonaktifkan
↓
Redirect ke /login
↓
User wajib login ulang
```

---

# 2. Goals

## Primary Goals

1. User cukup melakukan login **1x setiap 30 hari**.
2. Login tetap aktif walaupun:
   - Browser ditutup
   - Website ditutup
   - Laptop/HP direstart
   - User kembali beberapa hari kemudian
3. Session dikelola oleh backend.
4. Session tidak hanya bergantung pada localStorage.
5. Session mempunyai expiration time yang jelas.
6. Session dapat dicabut saat logout.
7. Session dapat dicabut oleh admin apabila diperlukan.
8. User tetap aman apabila password diganti.
9. Absensi dapat langsung dilakukan jika session masih aktif.

---

# 3. Non Goals

Fitur ini tidak bertujuan untuk:

- Membuat user login selamanya.
- Menyimpan password user pada browser.
- Menyimpan password dalam cookie.
- Menggunakan user ID mentah sebagai authentication token.
- Mengandalkan localStorage sebagai sumber autentikasi utama.
- Membiarkan session tetap hidup setelah logout.

---

# 4. Recommended Architecture

Gunakan sistem:

## Server-Side Persistent Session

Architecture:

```text
Browser
   │
   │ Cookie:
   │ exisel_session=<random-token>
   │
   ▼
EXISEL Backend
   │
   │ hash token
   ▼
Session Database
   │
   ├── user_id
   ├── token_hash
   ├── created_at
   ├── expires_at
   ├── last_seen_at
   ├── revoked_at
   ├── device info
   └── IP metadata
```

Session token asli hanya diberikan ke browser.

Database **tidak menyimpan token asli**, tetapi menyimpan hash dari token tersebut.

Contoh:

```text
Browser token:
14ecf03a....random-secret....

Database:
SHA256(token)
↓
f736b62fa...
```

Keuntungan:

Jika database bocor, attacker tidak langsung mendapatkan session token user.

---

# 5. Session Lifetime

Session lifetime:

```text
30 Days
```

Saat user berhasil login:

```text
created_at:
2026-08-15 22:00

expires_at:
2026-09-14 22:00
```

Session dianggap valid jika:

```text
current_time < expires_at
AND
revoked_at IS NULL
AND
user masih aktif
```

Jika:

```text
current_time >= expires_at
```

maka:

```text
SESSION_EXPIRED
```

User harus login ulang.

---

# 6. Fixed Expiration vs Sliding Expiration

Untuk EXISEL direkomendasikan menggunakan:

## Fixed 30-Day Expiration

Artinya:

```text
Login:
15 Agustus

Expired:
14 September
```

Walaupun user membuka EXISEL setiap hari, session tetap expired tanggal 14 September.

Jangan otomatis memperpanjang 30 hari setiap membuka website.

Alasan:

- Lebih aman
- Session tidak hidup selamanya
- Mudah diprediksi
- User pasti melakukan autentikasi ulang secara berkala

---

# 7. Database Schema

Buat tabel:

```text
sessions
```

Contoh schema:

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,

    token_hash VARCHAR(255) NOT NULL UNIQUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    expires_at TIMESTAMP NOT NULL,

    last_seen_at TIMESTAMP,

    revoked_at TIMESTAMP NULL,

    ip_address VARCHAR(45),

    user_agent TEXT,

    device_name VARCHAR(255),

    created_by VARCHAR(50) DEFAULT 'login',

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
```

Recommended indexes:

```sql
CREATE INDEX idx_sessions_user_id
ON sessions(user_id);

CREATE INDEX idx_sessions_token_hash
ON sessions(token_hash);

CREATE INDEX idx_sessions_expires_at
ON sessions(expires_at);

CREATE INDEX idx_sessions_user_active
ON sessions(user_id, revoked_at, expires_at);
```

---

# 8. Session Object

Contoh session di database:

```json
{
  "id": "sess_a8d27c...",
  "user_id": "user_82371",
  "token_hash": "sha256:99aa...",
  "created_at": "2026-08-15T22:00:00+07:00",
  "expires_at": "2026-09-14T22:00:00+07:00",
  "last_seen_at": "2026-08-16T07:30:00+07:00",
  "revoked_at": null,
  "ip_address": "xxx.xxx.xxx.xxx",
  "user_agent": "Chrome...",
  "device_name": "Windows / Chrome"
}
```

---

# 9. Authentication Cookie

Cookie name:

```text
exisel_session
```

Cookie harus menggunakan:

```text
HttpOnly
Secure
SameSite=Lax
Path=/
Max-Age=2592000
```

30 hari:

```text
30 × 24 × 60 × 60
= 2,592,000 seconds
```

Contoh:

```http
Set-Cookie:
exisel_session=<session_token>;
HttpOnly;
Secure;
SameSite=Lax;
Path=/;
Max-Age=2592000
```

---

# 10. Why HttpOnly Cookie

Jangan gunakan:

```js
localStorage.setItem("session", token)
```

untuk authentication utama.

Lebih baik:

```text
HttpOnly Cookie
```

karena token tidak dapat dibaca langsung dengan JavaScript frontend.

Frontend bahkan tidak perlu mengetahui isi session token.

Browser otomatis mengirim cookie ke backend.

---

# 11. Login Flow

Endpoint:

```http
POST /api/auth/login
```

Request:

```json
{
  "identifier": "username / nis / email",
  "password": "********"
}
```

Backend flow:

```text
1. Receive login request
2. Normalize identifier
3. Search user
4. Check user exists
5. Check account status
6. Verify password
7. Generate random session token
8. Hash session token
9. Insert session ke database
10. Set cookie
11. Return user data
```

Pseudo:

```ts
const token = generateSecureToken()

const tokenHash = hash(token)

await db.sessions.create({
    userId: user.id,
    tokenHash,
    createdAt: now(),
    expiresAt: addDays(now(), 30),
    lastSeenAt: now()
})

setCookie("exisel_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
})
```

---

# 12. Session Token Generation

Gunakan secure random generator.

Node.js:

```ts
import crypto from "crypto"

const token = crypto.randomBytes(32).toString("hex")
```

Jangan membuat token seperti:

```text
userId + timestamp
session-user-123
MD5(userId)
```

---

# 13. Hash Session Token

```ts
const tokenHash = crypto
  .createHash("sha256")
  .update(token)
  .digest("hex")
```

Database:

```text
token_hash = SHA256(token)
```

Browser:

```text
exisel_session = raw token
```

---

# 14. Authentication Middleware

Semua route yang membutuhkan login menggunakan:

```text
requireAuth
```

Contoh:

```text
/api/student/*
/api/attendance/*
/api/profile/*
/api/extracurricular/*
/api/community/*
```

Flow:

```text
Request
↓
Read exisel_session cookie
↓
Cookie exists?
├── NO → 401 Unauthorized
│
└── YES
     ↓
Hash token
     ↓
Search session DB
     ↓
Session exists?
├── NO → 401
│
└── YES
     ↓
revoked?
├── YES → 401
│
└── NO
     ↓
expired?
├── YES → delete cookie + 401
│
└── NO
     ↓
Load user
     ↓
User active?
├── NO → revoke session + 403
│
└── YES
     ↓
Attach user to request
     ↓
Continue
```

---

# 15. Middleware Pseudocode

```ts
async function requireAuth(req, res, next) {
    const token = req.cookies.exisel_session

    if (!token) {
        return res.status(401).json({
            code: "UNAUTHENTICATED"
        })
    }

    const tokenHash = hash(token)

    const session = await db.sessions.findUnique({
        where: { tokenHash }
    })

    if (!session) {
        clearSessionCookie(res)
        return res.status(401).json({
            code: "INVALID_SESSION"
        })
    }

    if (session.revokedAt) {
        clearSessionCookie(res)
        return res.status(401).json({
            code: "SESSION_REVOKED"
        })
    }

    if (session.expiresAt <= new Date()) {
        clearSessionCookie(res)
        return res.status(401).json({
            code: "SESSION_EXPIRED"
        })
    }

    const user = await getUser(session.userId)

    if (!user || user.status !== "ACTIVE") {
        await revokeSession(session.id)
        clearSessionCookie(res)
        return res.status(403).json({
            code: "ACCOUNT_DISABLED"
        })
    }

    req.user = user
    req.session = session
    next()
}
```

---

# 16. Current User Endpoint

```http
GET /api/auth/me
```

Dipanggil saat aplikasi pertama kali dibuka.

Jika valid:

```json
{
  "authenticated": true,
  "user": {
    "id": "user_xxx",
    "name": "Student",
    "role": "student",
    "class": "XI SIJA"
  },
  "session": {
    "expiresAt": "2026-09-14T22:00:00+07:00"
  }
}
```

Jika expired:

```http
401 Unauthorized
```

Frontend redirect ke `/login`.

---

# 17. Initial App Authentication State

Gunakan 3 states:

```text
loading
authenticated
unauthenticated
```

Jangan langsung menganggap user logout sebelum `/api/auth/me` selesai.

---

# 18. Frontend Startup Flow

```text
Open EXISEL
        │
        ▼
AuthProvider mount
        │
        ▼
GET /api/auth/me
        │
        ├──────── 200
        │
        ▼
authenticated
        │
        ▼
Dashboard
        │
        ▼
Attendance available
```

---

# 19. Login Page Behavior

Jika user membuka `/login` tetapi session masih valid:

```text
/login
↓
check /api/auth/me
↓
authenticated
↓
redirect /dashboard
```

---

# 20. Protected Route

Frontend:

```tsx
if (status === "loading") {
    return <LoadingScreen />
}

if (status === "unauthenticated") {
    return <Navigate to="/login" />
}

return children
```

Frontend ProtectedRoute hanya untuk UX.

Security utama tetap di backend.

---

# 21. Attendance Integration

```http
POST /api/attendance/check-in
```

Student ID harus berasal dari:

```ts
const studentId = req.user.id
```

Bukan dari body request user.

---

# 22. Attendance Flow

```text
Student membuka EXISEL
↓
Session masih aktif
↓
GET /api/auth/me
↓
Student authenticated
↓
Open Attendance
↓
POST /api/attendance/check-in
↓
Backend requireAuth
↓
Get student ID dari session
↓
Validate extracurricular
↓
Validate attendance period
↓
Save attendance
↓
Success
```

---

# 23. Logout Flow

```http
POST /api/auth/logout
```

Flow:

```text
Read session cookie
↓
Hash token
↓
Find session
↓
Set revoked_at = NOW()
↓
Delete cookie
↓
Return success
```

---

# 24. Logout All Devices

```http
POST /api/auth/logout-all
```

```sql
UPDATE sessions
SET revoked_at = CURRENT_TIMESTAMP
WHERE user_id = ?
AND revoked_at IS NULL;
```

---

# 25. Session Management Page

Tambahkan:

```text
/profile/security
```

Fitur:

- Lihat perangkat aktif
- Waktu login
- Last seen
- Tanggal session expired
- Logout device tertentu
- Logout semua perangkat

---

# 26. Session API

```http
GET /api/auth/sessions
DELETE /api/auth/sessions/:sessionId
```

Student hanya boleh menghapus session miliknya sendiri.

---

# 27. Admin Session Management

```text
GET /api/admin/users/:userId/sessions
DELETE /api/admin/users/:userId/sessions/:sessionId
POST /api/admin/users/:userId/revoke-sessions
```

Gunakan:

```text
requireAuth
requireRole("admin")
```

---

# 28. Password Change Behavior

Jika password diganti:

```text
1. Change password
2. Revoke semua session lama
3. User login ulang
```

---

# 29. Account Disabled Behavior

Jika admin disable user:

```text
user.status = DISABLED
↓
revokeAllSessions(userId)
```

---

# 30. Session Expiration Cleanup

Bersihkan session lama secara berkala.

```sql
DELETE FROM sessions
WHERE expires_at < NOW() - INTERVAL '7 days';
```

Jalankan misalnya 1x per hari.

---

# 31. Last Seen Tracking

Update `last_seen_at` maksimal setiap 10–30 menit, jangan setiap request.

---

# 32. Rate Limit Login

Contoh:

```text
5 failed attempts / 10 minutes
```

Response:

```text
429 Too Many Requests
```

Gunakan pesan:

```text
Username atau password salah.
```

---

# 33. Authentication Error Codes

```text
UNAUTHENTICATED
INVALID_SESSION
SESSION_EXPIRED
SESSION_REVOKED
ACCOUNT_DISABLED
INVALID_CREDENTIALS
TOO_MANY_ATTEMPTS
FORBIDDEN
```

---

# 34. API Client Behavior

Axios:

```ts
axios.defaults.withCredentials = true
```

Fetch:

```ts
fetch(url, {
  credentials: "include"
})
```

---

# 35. CORS

Jika frontend/backend beda subdomain:

```text
app.exisel.com
api.exisel.com
```

Backend:

```text
Access-Control-Allow-Credentials: true
```

Origin harus spesifik.

Jangan gunakan `*` untuk request ber-credentials.

---

# 36. CSRF Protection

Karena auth memakai cookie, state-changing route perlu proteksi:

- SameSite=Lax
- Origin validation
- CSRF token untuk endpoint sensitif

---

# 37. Session Fixation Protection

Setelah login berhasil selalu buat session/token baru.

Jangan mempertahankan session auth lama.

---

# 38. Device / IP Metadata

IP dan user-agent hanya metadata/security log.

Jangan logout hanya karena IP berubah, karena siswa bisa pindah dari:

```text
Wi-Fi sekolah
→ Data seluler
→ Wi-Fi rumah
```

---

# 39. Security Logs

Buat tabel optional:

```text
auth_logs
```

Event:

```text
LOGIN_SUCCESS
LOGIN_FAILED
LOGOUT
SESSION_EXPIRED
SESSION_REVOKED
PASSWORD_CHANGED
LOGOUT_ALL
ACCOUNT_DISABLED
```

---

# 40. Multiple Device Policy

Recommended maksimum:

```text
5 active sessions / user
```

Jika device ke-6 login, revoke session tertua.

---

# 41. Backend Structure

```text
src/
├── modules/
│   └── auth/
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       ├── auth.routes.ts
│       ├── auth.middleware.ts
│       ├── session.service.ts
│       ├── session.repository.ts
│       ├── auth.validation.ts
│       ├── auth.types.ts
│       └── auth.constants.ts
```

---

# 42. SessionService

```text
createSession()
getSession()
validateSession()
revokeSession()
revokeAllSessions()
cleanupExpiredSessions()
updateLastSeen()
getUserSessions()
```

---

# 43. Frontend Structure

```text
src/
├── auth/
│   ├── AuthProvider.tsx
│   ├── AuthContext.ts
│   ├── useAuth.ts
│   ├── ProtectedRoute.tsx
│   ├── GuestRoute.tsx
│   └── auth.api.ts
│
├── pages/
│   ├── login/
│   ├── dashboard/
│   ├── attendance/
│   └── profile/
```

---

# 44. Recommended API

## Authentication

```text
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/logout-all

GET    /api/auth/me
GET    /api/auth/sessions

DELETE /api/auth/sessions/:sessionId
```

## Account

```text
POST /api/account/change-password
```

## Admin

```text
GET    /api/admin/users/:userId/sessions
DELETE /api/admin/users/:userId/sessions/:sessionId
POST   /api/admin/users/:userId/revoke-sessions
```

---

# 45. Environment Variables

```env
SESSION_COOKIE_NAME=exisel_session
SESSION_DURATION_DAYS=30
SESSION_TOKEN_BYTES=32
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTP_ONLY=true
SESSION_COOKIE_SAME_SITE=lax
SESSION_MAX_PER_USER=5
```

---

# 46. Security Requirements

Mandatory:

```text
[X] HttpOnly session cookie
[X] Secure cookie production
[X] SameSite protection
[X] Secure random token
[X] Token hashed in DB
[X] Session expiry server-side
[X] Logout revokes session
[X] User status checked server-side
[X] Password hashed
[X] Login rate limiting
[X] Protected attendance API
[X] Role validation backend
[X] CORS credentials configured
```

---

# 47. Do Not Do This

## Jangan gunakan localStorage sebagai auth utama

```js
localStorage.setItem("loggedIn", "true")
```

## Jangan percaya user ID dari cookie/body sebagai authentication.

## Jangan pernah menyimpan password di cookie/localStorage.

## Jangan mengandalkan expiration frontend saja.

Backend wajib validasi session setiap request protected.

---

# 48. Redirect Preservation

Jika user membuka:

```text
/attendance
```

tetapi belum login:

```text
/login?redirect=/attendance
```

Setelah login:

```text
→ /attendance
```

Ini penting agar proses absensi cepat.

---

# 49. Testing Plan

- Login valid → session + cookie dibuat.
- Tutup browser → buka lagi → tetap login.
- Restart perangkat → tetap login.
- Session umur 29 hari → valid.
- Session >30 hari → `401 SESSION_EXPIRED`.
- Logout → session revoked dan cookie hilang.
- Token lama setelah logout → ditolak.
- Cookie dimodifikasi → ditolak.
- User disabled → session ditolak.
- Attendance tanpa session → 401.
- Student mencoba mengirim ID siswa lain → backend tetap memakai `req.user.id`.
- Student mencoba admin session route → 403.

---

# 50. Implementation Phases

## Phase 1 — Database
- sessions table
- indexes
- relation ke users

## Phase 2 — Session Service
- createSession
- validateSession
- revokeSession
- revokeAllSessions

## Phase 3 — Login
- verify credentials
- create session
- set HttpOnly cookie

## Phase 4 — Middleware
- requireAuth
- optionalAuth
- requireRole

## Phase 5 — Current User
- `GET /api/auth/me`

## Phase 6 — Frontend Persistence
- AuthProvider
- checkSession
- ProtectedRoute
- GuestRoute

## Phase 7 — Attendance
- student identity berasal dari session

## Phase 8 — Logout
- logout
- logout all

## Phase 9 — Session Manager
- list session
- revoke session

## Phase 10 — Admin Security
- view session user
- revoke session user

## Phase 11 — Cleanup
- expired session cleanup

## Phase 12 — Testing
- unit
- integration
- security
- browser persistence

---

# 51. Priority

## P0 — Mandatory

```text
sessions table
secure random token
HttpOnly cookie
30-day expiration
requireAuth
/auth/me
logout
attendance protection
```

## P1 — Important

```text
logout all
session management
last seen
login rate limit
password change revocation
```

## P2 — Enhancement

```text
device names
security logs
expiry warning
admin session dashboard
session analytics
```

---

# 52. Definition of Done

- [ ] Siswa berhasil login.
- [ ] Backend membuat session baru.
- [ ] Session mempunyai expiration 30 hari.
- [ ] Browser mendapatkan HttpOnly cookie.
- [ ] User menutup browser tanpa kehilangan login.
- [ ] User membuka website beberapa hari kemudian dan masih login.
- [ ] `/auth/me` memulihkan authenticated user.
- [ ] Attendance dapat digunakan tanpa login ulang selama session valid.
- [ ] Session lewat 30 hari ditolak backend.
- [ ] Expired session mengarahkan user ke login.
- [ ] Logout mencabut session.
- [ ] Old session token tidak bisa digunakan setelah logout.
- [ ] Attendance mengambil student ID dari authenticated session.
- [ ] Student tidak dapat memalsukan user ID.
- [ ] Admin route mempunyai role validation.
- [ ] Password change mencabut session lama.
- [ ] Disabled account tidak dapat memakai session lama.
- [ ] Session token tidak disimpan di localStorage.
- [ ] Session token asli tidak disimpan di database.

---

# 53. Final User Flow

## First Login

```text
EXISEL
↓
Login
↓
Username / NIS
Password
↓
Login berhasil
↓
Persistent session dibuat
↓
Dashboard
```

## Next Visit

```text
EXISEL
↓
Browser mengirim session cookie
↓
Backend validasi
↓
Valid
↓
Dashboard
↓
Absen
```

No login required.

## After 30 Days

```text
EXISEL
↓
Session expired
↓
Cookie cleared
↓
Login page
↓
Login ulang
↓
New 30-day session
```

---

# 54. Final Architecture

```text
                 ┌────────────────────┐
                 │      STUDENT       │
                 │ Browser / Mobile   │
                 └─────────┬──────────┘
                           │
                           │ HttpOnly
                           │ Session Cookie
                           ▼
                 ┌────────────────────┐
                 │   EXISEL BACKEND   │
                 │                    │
                 │ requireAuth()      │
                 │ SessionService     │
                 │ AuthService        │
                 │ RBAC               │
                 └─────────┬──────────┘
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
          ▼                ▼                 ▼
┌─────────────────┐ ┌──────────────┐ ┌────────────────┐
│      USERS      │ │   SESSIONS   │ │   ATTENDANCE   │
│                 │ │              │ │                │
│ id              │ │ user_id      │ │ student_id     │
│ name            │ │ token_hash   │ │ event_id       │
│ password_hash   │ │ expires_at   │ │ status         │
│ role            │ │ revoked_at   │ │ checked_at     │
│ status          │ │ last_seen    │ │                │
└─────────────────┘ └──────────────┘ └────────────────┘
```

---

# 55. Core Principle

```text
LOGIN ONCE
     ↓
SERVER SESSION
     ↓
HTTPONLY COOKIE
     ↓
30 DAYS
     ↓
AUTO AUTHENTICATE
     ↓
FAST ATTENDANCE
```

> Siswa tidak perlu login setiap kali ingin absen. Selama session 30 hari masih aktif, buka EXISEL → langsung masuk → langsung absen.
