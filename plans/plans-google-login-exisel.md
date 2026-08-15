# plans.md — Google Login + Verifikasi Admin untuk Exisel

## 1. Tujuan Fitur

Menambahkan sistem autentikasi menggunakan Google untuk Exisel dengan aturan:

1. User login menggunakan akun Google.
2. Jika user belum pernah terdaftar sebagai siswa:
   - user diarahkan ke halaman pendaftaran lanjutan;
   - user mengisi Nama Lengkap, NIS, dan Kelas.
3. Setelah mengirim form, status akun menjadi `pending`.
4. Admin harus memverifikasi dan menyetujui akun.
5. Selama belum disetujui admin, user tidak boleh masuk ke fitur utama Exisel.
6. Setelah admin menyetujui, status menjadi `approved` dan user boleh masuk.
7. Jika admin menolak, status menjadi `rejected` dan akses tetap diblokir.

## 2. Prinsip Utama

```text
GOOGLE LOGIN != LANGSUNG BOLEH MASUK EXISEL

GOOGLE AUTHENTICATION
→ hanya membuktikan identitas akun Google

STUDENT VERIFICATION
→ tetap dilakukan oleh admin

STATUS APPROVED
→ baru boleh mengakses aplikasi utama
```

User tidak boleh melewati proses verifikasi walaupun sudah berhasil login Google, membuka URL dashboard langsung, refresh halaman, mengganti route manual, memanggil API langsung, login berulang, memakai token lama, atau membuka aplikasi dari perangkat lain.

## 3. Flow Utama

```text
USER
  ↓
LOGIN WITH GOOGLE
  ↓
GOOGLE AUTH SUCCESS
  ↓
CEK USER DI DATABASE
  ↓
USER BELUM ADA?
  ↓ YES
CREATE ACCOUNT
status = incomplete
  ↓
REDIRECT → /register/student
  ↓
ISI:
- Nama Lengkap
- NIS
- Kelas
  ↓
SUBMIT
  ↓
status = pending
  ↓
REDIRECT → /pending
  ↓
ADMIN REVIEW
  ↓
APPROVED?
  ├─ YES → status=approved → /exisel
  └─ NO  → status=rejected → /rejected
```

## 4. Status Akun

```ts
type UserStatus =
  | "incomplete"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";
```

Arti status:

```yaml
incomplete:
  meaning: User berhasil login Google tetapi belum menyelesaikan data siswa.

pending:
  meaning: User sudah mengisi Nama, NIS, dan Kelas tetapi belum diverifikasi admin.

approved:
  meaning: User sudah diverifikasi admin dan boleh mengakses Exisel.

rejected:
  meaning: Pendaftaran ditolak admin.

suspended:
  meaning: Akun yang sebelumnya aktif dinonaktifkan sementara oleh admin.
```

## 5. Role

Minimal:

```ts
type UserRole = "student" | "admin";
```

Optional:

```ts
type UserRole = "student" | "admin" | "superadmin";
```

Hak akses:

```text
student:
- login Google
- isi profil
- cek status akun
- akses Exisel hanya jika approved

admin:
- login
- lihat daftar pending
- approve siswa
- reject siswa
- melihat data siswa
- suspend akun jika diperlukan

superadmin:
- semua akses admin
- kelola admin lain
```

## 6. Data User yang Disimpan

```ts
User {
  id: string
  googleId: string
  email: string
  avatarUrl?: string

  name?: string
  nis?: string
  className?: string

  role: "student" | "admin"
  status: "incomplete" | "pending" | "approved" | "rejected" | "suspended"

  rejectionReason?: string
  approvedAt?: Date
  approvedBy?: string
  rejectedAt?: Date
  rejectedBy?: string

  createdAt: Date
  updatedAt: Date
}
```

## 7. Prisma Example

```prisma
enum UserRole {
  STUDENT
  ADMIN
  SUPERADMIN
}

enum UserStatus {
  INCOMPLETE
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

model User {
  id              String      @id @default(cuid())
  googleId        String?     @unique
  email           String      @unique
  avatarUrl       String?

  name            String?
  nis             String?     @unique
  className       String?

  role            UserRole    @default(STUDENT)
  status          UserStatus  @default(INCOMPLETE)

  rejectionReason String?

  approvedAt      DateTime?
  approvedById    String?
  rejectedAt      DateTime?
  rejectedById    String?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([status])
  @@index([role])
  @@index([className])
}
```

Jika NIS tidak selalu unik secara global di sistem sekolah, jangan gunakan `@unique` tanpa menyesuaikan kebutuhan.

## 8. Google Login

Google OAuth boleh memakai library yang sudah dipakai project, misalnya:

```text
Auth.js / NextAuth
Supabase Auth
Firebase Authentication
Clerk
Custom OAuth
```

Google Login hanya bertugas mendapatkan identitas dasar:

```text
Google account ID
email
nama Google bila tersedia
avatar bila tersedia
```

Jangan otomatis menjadikan nama Google sebagai nama resmi siswa. Nama siswa tetap wajib diisi pada form pendaftaran.

## 9. First Login Behaviour

```pseudo
user = database.findByGoogleIdOrEmail()

if user does not exist:
    user = database.create({
        googleId: google.id,
        email: google.email,
        avatarUrl: google.avatar,
        role: "student",
        status: "incomplete"
    })
```

Redirect berdasarkan status:

```pseudo
if user.status == "incomplete":
    redirect("/register/student")

elif user.status == "pending":
    redirect("/pending")

elif user.status == "approved":
    redirect("/exisel")

elif user.status == "rejected":
    redirect("/rejected")

elif user.status == "suspended":
    redirect("/suspended")
```

## 10. Halaman Pendaftaran Siswa

Route:

```text
/register/student
```

Form MVP:

```text
Nama Lengkap
NIS
Kelas
```

Optional untuk masa depan:

```text
Nomor HP
No HP Orang Tua
Jenis Kelamin
Tahun Masuk
```

## 11. Validation Form

Nama:

```text
required
trim whitespace
minimal 3 karakter
maksimal 100 karakter
```

NIS:

```text
required
trim whitespace
hanya angka jika format sekolah numeric
panjang sesuai aturan sekolah
```

Contoh Zod:

```ts
nis: z
  .string()
  .trim()
  .regex(/^\d+$/, "NIS harus berupa angka")
```

Kelas sebaiknya dropdown, bukan free text.

Contoh:

```text
X-1
X-2
X-3
XI-1
XI-2
XI-3
XII-1
XII-2
XII-3
```

## 12. Submit Registration

Endpoint:

```http
POST /api/student/register
```

Payload:

```json
{
  "name": "Nama Siswa",
  "nis": "123456",
  "className": "XI-2"
}
```

Backend:

```pseudo
require_authenticated_google_user()
user = get_current_user()

if user.role != "student":
    reject()

if user.status == "approved":
    reject("Akun sudah aktif")

validate_input()
check_nis_duplicate()

update user:
    name = submitted_name
    nis = submitted_nis
    className = submitted_class
    status = "pending"

redirect /pending
```

## 13. Duplicate NIS

NIS wajib dicek di backend:

```pseudo
existing = db.user.findUnique({ nis: submitted_nis })

if existing exists and existing.id != current_user.id:
    return error("NIS tersebut sudah digunakan oleh akun lain.")
```

Jangan hanya mengandalkan frontend validation.

## 14. Pending Page

Route:

```text
/pending
```

Isi:

```text
Pendaftaran kamu sudah dikirim.

Status:
Menunggu verifikasi admin.

Data:
Nama: ...
NIS: ...
Kelas: ...

Kamu belum dapat masuk ke Exisel sampai akun disetujui admin.
```

Button optional:

```text
Cek Status
Logout
Edit Data
```

## 15. User Pending Login Lagi

Scenario:

```text
User daftar
status pending
logout
login lagi Google
```

Expected:

```text
Google Login sukses
Backend cek status = pending
Redirect → /pending
```

JANGAN redirect ke `/exisel`.

## 16. Pending User Memaksa Buka Exisel

Contoh route private:

```text
/exisel
/dashboard
/chat
/ekskul
/profile
```

Middleware wajib cek:

```pseudo
if user.status != "approved":
    block()
```

Redirect status:

```pseudo
if user.status == "incomplete":
    redirect("/register/student")

if user.status == "pending":
    redirect("/pending")

if user.status == "rejected":
    redirect("/rejected")

if user.status == "suspended":
    redirect("/suspended")
```

## 17. Middleware / Route Guard

```ts
async function protectExiselRoute(request) {
  const session = await getSession(request)

  if (!session) {
    return redirect("/login")
  }

  const user = await getUser(session.user.id)

  if (!user) {
    return redirect("/login")
  }

  if (user.role === "admin" || user.role === "superadmin") {
    return allow()
  }

  switch (user.status) {
    case "incomplete":
      return redirect("/register/student")
    case "pending":
      return redirect("/pending")
    case "rejected":
      return redirect("/rejected")
    case "suspended":
      return redirect("/suspended")
    case "approved":
      return allow()
    default:
      return redirect("/login")
  }
}
```

## 18. Jangan Cuma Protect Frontend

PENTING:

```text
UI GUARD != SECURITY
```

Walaupun tombol Exisel disembunyikan, user masih bisa memanggil API secara langsung.

Semua API Exisel wajib memeriksa:

```text
authenticated
AND
status == approved
```

Contoh:

```pseudo
POST /api/exisel/chat
session = requireAuth()
user = getUser(session.id)

if user.status != "approved":
    return HTTP 403
```

Response:

```json
{
  "error": "ACCOUNT_NOT_APPROVED"
}
```

## 19. Central Authorization Function

Buat helper sentral:

```ts
requireApprovedStudent()
```

Contoh:

```ts
async function requireApprovedStudent() {
  const session = await requireSession()

  const user = await db.user.findUnique({
    where: { id: session.user.id }
  })

  if (!user) {
    throw new UnauthorizedError()
  }

  if (user.role === "ADMIN" || user.role === "SUPERADMIN") {
    return user
  }

  if (user.status !== "APPROVED") {
    throw new ForbiddenError("ACCOUNT_NOT_APPROVED")
  }

  return user
}
```

Semua endpoint private Exisel harus memanggil helper tersebut.

## 20. Admin Dashboard

Route:

```text
/admin
```

Sub-pages:

```text
/admin/students
/admin/students/pending
/admin/students/approved
/admin/students/rejected
```

## 21. Pending Students Table

Kolom:

```text
Nama
Email Google
NIS
Kelas
Tanggal Daftar
Status
Action
```

Actions:

```text
Approve
Reject
View Detail
```

Optional:

```text
Search
Filter Kelas
Sort Tanggal
```

## 22. Approve Student

Endpoint:

```http
POST /api/admin/students/:id/approve
```

Authorization:

```pseudo
requireAdmin()
```

Logic:

```pseudo
student = getStudent(id)

if student does not exist:
    return 404

if student.status != "pending":
    reject_invalid_state()

update:
    status = "approved"
    approvedAt = now()
    approvedBy = current_admin.id
```

## 23. Reject Student

Endpoint:

```http
POST /api/admin/students/:id/reject
```

Body:

```json
{
  "reason": "NIS tidak ditemukan pada data sekolah."
}
```

Update:

```pseudo
status = "rejected"
rejectionReason = reason
rejectedAt = now()
rejectedBy = admin.id
```

## 24. Rejected Page

Route:

```text
/rejected
```

Contoh:

```text
Pendaftaran belum dapat disetujui.

Alasan:
NIS tidak ditemukan pada data sekolah.

Jika data yang kamu masukkan salah,
silakan perbaiki data dan kirim ulang.
```

Optional:

```text
Edit Data
Kirim Ulang
Logout
```

## 25. Re-Submit Setelah Ditolak

```text
rejected
↓
edit profile
↓
submit
↓
pending
```

Saat submit ulang:

```pseudo
status = pending
rejectionReason = null
rejectedAt = null
rejectedBy = null
```

## 26. Admin Verification Recommendation

Admin sebaiknya membandingkan:

```text
Nama
NIS
Kelas
Email
```

dengan data resmi siswa sekolah.

Jika nantinya ada database siswa master, admin dapat memakainya untuk validasi lebih cepat.

## 27. Optional Student Master Database

```ts
StudentMaster {
  id
  nis
  name
  className
  active
}
```

Saat user submit:

```pseudo
master = StudentMaster.findByNis(nis)
```

Jika tidak ditemukan, tandai untuk review admin. Admin tetap menjadi final authority.

## 28. Security Rules

Wajib:

```text
[ ] Jangan percaya role dari frontend
[ ] Jangan percaya status dari frontend
[ ] Jangan menerima userId client sebagai current user
[ ] Current user harus berasal dari session/token server
[ ] Verify OAuth token/session
[ ] Semua admin API pakai requireAdmin()
[ ] Semua Exisel API pakai requireApprovedStudent()
[ ] Validation dilakukan server-side
[ ] NIS duplicate dicek server-side
```

## 29. Prevent User Manipulating Status

JANGAN menyediakan endpoint yang menerima:

```json
{
  "status": "approved"
}
```

dari siswa.

Profile update hanya boleh menerima whitelist:

```ts
{
  name,
  nis,
  className
}
```

Tidak boleh menerima:

```text
role
status
approvedAt
approvedBy
rejectedBy
```

## 30. Safe Update Pattern

Benar:

```ts
await db.user.update({
  where: { id: currentUser.id },
  data: {
    name: input.name,
    nis: input.nis,
    className: input.className
  }
})
```

Jangan:

```ts
data: request.body
```

## 31. Session Data

Session boleh menyimpan:

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "role": "student"
  }
}
```

Tetapi status approval sebaiknya tetap diverifikasi ke database pada route sensitif supaya akun yang baru disuspend tidak tetap bisa masuk menggunakan session lama.

## 32. Login Redirect Logic

```pseudo
getPostLoginRedirect(user):

    if admin:
        return "/admin"

    if incomplete:
        return "/register/student"

    if pending:
        return "/pending"

    if approved:
        return "/exisel"

    if rejected:
        return "/rejected"

    if suspended:
        return "/suspended"

    return "/login"
```

## 33. Route Matrix

```text
ROUTE                  incomplete pending approved rejected suspended
---------------------------------------------------------------------
/register/student      YES        optional NO       YES      NO
/pending               NO         YES      NO       NO       NO
/rejected              NO         NO       NO       YES      NO
/suspended             NO         NO       NO       NO       YES
/exisel                NO         NO       YES      NO       NO
/dashboard             NO         NO       YES      NO       NO
/admin                 ADMIN ONLY
```

## 34. Exisel Access Rule

```pseudo
canAccessExisel(user):

    return (
        user exists
        AND authenticated
        AND (
            user.role == "admin"
            OR user.role == "superadmin"
            OR (
                user.role == "student"
                AND user.status == "approved"
            )
        )
    )
```

## 35. API Status Codes

```text
401 Unauthorized
→ belum login

403 Forbidden
→ sudah login tetapi belum boleh akses

404 Not Found
→ resource tidak ditemukan

409 Conflict
→ NIS sudah dipakai

422 Unprocessable Entity
→ data form invalid
```

## 36. Example Error Responses

Pending:

```json
{
  "error": "ACCOUNT_PENDING",
  "message": "Akun kamu masih menunggu persetujuan admin."
}
```

Incomplete:

```json
{
  "error": "PROFILE_INCOMPLETE",
  "message": "Lengkapi data siswa terlebih dahulu."
}
```

Rejected:

```json
{
  "error": "ACCOUNT_REJECTED",
  "message": "Pendaftaran kamu belum disetujui."
}
```

Suspended:

```json
{
  "error": "ACCOUNT_SUSPENDED",
  "message": "Akun kamu sedang dinonaktifkan."
}
```

## 37. UI Login Page

Route:

```text
/login
```

Elements:

```text
Logo Exisel

Masuk ke Exisel

[ Continue with Google ]

Akun siswa baru perlu diverifikasi admin sebelum dapat menggunakan Exisel.
```

## 38. Registration Page UI

```text
Lengkapi Data Siswa

Email Google:
user@gmail.com
(read-only)

Nama Lengkap:
[input]

NIS:
[input]

Kelas:
[select]

[ Kirim Pendaftaran ]
```

Informasi:

```text
Pastikan data sesuai dengan data sekolah.
Pendaftaran akan diperiksa oleh admin.
```

## 39. Pending UI

```text
⏳ Menunggu Persetujuan

Pendaftaran kamu sudah masuk.

Nama: ...
NIS: ...
Kelas: ...

Admin perlu memverifikasi data sebelum kamu bisa menggunakan Exisel.

[ Cek Status ]
[ Keluar ]
```

## 40. Approved Experience

Jika admin approve saat user masih membuka `/pending`:

```text
user klik Cek Status
↓
status approved
↓
redirect /exisel
```

Optional polling boleh dilakukan setiap 30–60 detik, jangan terlalu sering.

## 41. Optional Real-Time Approval

Bisa menggunakan:

```text
WebSocket
Supabase Realtime
Firebase listener
Server-Sent Events
```

Flow:

```text
admin approve
↓
client menerima update
↓
toast: Akun kamu sudah disetujui.
↓
redirect /exisel
```

Ini optional, bukan MVP.

## 42. Admin Notification

Ketika ada pendaftaran baru, admin dashboard bisa menampilkan badge:

```text
Pending (12)
```

Optional masa depan:

```text
email admin
Telegram bot
Discord webhook
```

## 43. Audit Log

Sebaiknya setiap tindakan admin dicatat.

```ts
AuditLog {
  id
  adminId
  action
  targetUserId
  metadata
  createdAt
}
```

Actions:

```text
STUDENT_APPROVED
STUDENT_REJECTED
STUDENT_SUSPENDED
STUDENT_UNSUSPENDED
```

## 44. Approval Audit

```json
{
  "action": "STUDENT_APPROVED",
  "adminId": "admin_123",
  "targetUserId": "student_456",
  "createdAt": "..."
}
```

Ini membantu mengetahui admin mana yang melakukan approve/reject.

## 45. Prevent Double Approve

Jika dua admin klik approve bersamaan, gunakan transaction atau conditional update:

```pseudo
UPDATE user
SET status = approved
WHERE id = ?
AND status = pending
```

Jika affected rows = 0, berarti status sudah berubah sebelumnya.

## 46. Email Google Rules

Jika sekolah memiliki domain Google Workspace sendiri, misalnya:

```text
@sma-example.sch.id
```

boleh tambahkan domain restriction.

Tetapi jangan aktifkan jika siswa menggunakan Gmail pribadi.

## 47. Account Linking

Gunakan `googleId` sebagai identity OAuth utama.

Jika library auth sudah mengelola struktur seperti:

```text
User
Account
Session
```

ikuti struktur library tersebut.

## 48. Important Edge Cases

### Case A — Close browser sebelum isi form

```text
status = incomplete
login berikutnya → /register/student
```

### Case B — Pending logout lalu login lagi

```text
status = pending
login → /pending
```

### Case C — Pending buka /exisel

```text
redirect /pending atau 403
```

### Case D — Pending call /api/exisel/chat

```text
403 ACCOUNT_PENDING
```

### Case E — Approved lalu admin suspend

```text
request berikutnya ditolak
redirect /suspended
```

### Case F — User ubah pilihan kelas via DevTools

```text
backend validation menolak kelas invalid
```

### Case G — User kirim status=approved di request

```text
backend ignore/reject field status
```

### Case H — User memakai NIS siswa lain

```text
409 NIS_ALREADY_USED
```

## 49. State Machine

```text
            GOOGLE LOGIN
                 ↓
            INCOMPLETE
                 ↓
            submit form
                 ↓
              PENDING
              /     \
         approve     reject
           ↓           ↓
       APPROVED     REJECTED
           ↓           |
        suspend        |
           ↓           |
       SUSPENDED       |
           |           |
       unsuspend    resubmit
           |           |
           ↓           ↓
       APPROVED      PENDING
```

## 50. Allowed Transitions

```yaml
INCOMPLETE:
  - PENDING

PENDING:
  - APPROVED
  - REJECTED

REJECTED:
  - PENDING

APPROVED:
  - SUSPENDED

SUSPENDED:
  - APPROVED
```

## 51. Backend State Validation

```pseudo
approveStudent(user):

    if user.status != PENDING:
        throw InvalidState()

    user.status = APPROVED
```

Jangan izinkan transisi status sembarangan.

## 52. Folder Structure Suggestion

```text
src/
│
├── auth/
│   ├── google.ts
│   ├── session.ts
│   ├── guards.ts
│   └── redirects.ts
│
├── student/
│   ├── register.ts
│   ├── validation.ts
│   └── status.ts
│
├── admin/
│   ├── approve.ts
│   ├── reject.ts
│   ├── suspend.ts
│   └── audit.ts
│
├── middleware/
│   ├── require-auth.ts
│   ├── require-approved.ts
│   └── require-admin.ts
│
└── database/
    ├── user.ts
    └── audit-log.ts
```

## 53. API Structure Suggestion

```text
GET    /api/me

POST   /api/student/register
PATCH  /api/student/profile
GET    /api/student/status

GET    /api/admin/students
GET    /api/admin/students/pending

POST   /api/admin/students/:id/approve
POST   /api/admin/students/:id/reject
POST   /api/admin/students/:id/suspend
POST   /api/admin/students/:id/unsuspend
```

## 54. GET /api/me

```json
{
  "id": "user_123",
  "email": "student@gmail.com",
  "name": "Nama Siswa",
  "nis": "12345",
  "className": "XI-2",
  "role": "student",
  "status": "pending"
}
```

Frontend boleh memakai data ini untuk menentukan tampilan, tetapi security tetap dilakukan backend.

## 55. Admin Pending Query

```pseudo
SELECT *
FROM User
WHERE role = 'STUDENT'
AND status = 'PENDING'
ORDER BY createdAt ASC
```

## 56. Search Admin

Admin dapat search berdasarkan:

```text
nama
NIS
email
kelas
```

Contoh:

```text
/admin/students?status=pending&search=farhan
```

## 57. Filter Kelas

Optional:

```text
Semua
X
XI
XII
```

atau per kelas spesifik.

## 58. Approval Confirmation UI

```text
Setujui akun ini?

Nama: ...
NIS: ...
Kelas: ...
Email: ...

[ Batal ]
[ Ya, Setujui ]
```

## 59. Reject Confirmation UI

```text
Tolak pendaftaran?

Alasan:
[ textarea ]

[ Batal ]
[ Tolak ]
```

Sebaiknya alasan diwajibkan agar siswa tahu apa yang perlu diperbaiki.

## 60. Recommended MVP Scope

```text
[ ] Login Google
[ ] Create user otomatis setelah login
[ ] Status incomplete
[ ] Student registration page
[ ] Nama
[ ] NIS
[ ] Kelas
[ ] Submit → pending
[ ] Pending page
[ ] Route guard
[ ] API guard
[ ] Admin pending list
[ ] Admin approve
[ ] Admin reject
[ ] Approved → Exisel
[ ] Pending cannot access Exisel
[ ] Rejected page
```

## 61. Phase 2

```text
[ ] Search siswa
[ ] Filter kelas
[ ] Audit logs
[ ] Resubmit rejected account
[ ] Suspend user
[ ] Notification
[ ] Realtime approval status
[ ] Master student database
[ ] Auto-match NIS
[ ] Bulk approve
```

## 62. Test Cases

### Test 1 — New Google User

```text
Login Google
→ user belum ada
→ create status incomplete
→ redirect /register/student
```

PASS jika user tidak masuk `/exisel`.

### Test 2 — Submit Student Data

```text
Nama valid
NIS valid
Kelas valid
```

Expected:

```text
status = pending
redirect /pending
```

### Test 3 — Pending Login

```text
status pending
login Google lagi
```

Expected:

```text
redirect /pending
```

### Test 4 — Pending Force Dashboard

```text
GET /exisel
```

Expected:

```text
redirect /pending atau 403
```

### Test 5 — Pending Force API

```text
POST /api/exisel/chat
```

Expected:

```text
403 ACCOUNT_PENDING
```

### Test 6 — Admin Approve

Before:

```text
pending
```

After approve:

```text
approved
approvedBy = admin
approvedAt != null
```

### Test 7 — Approved Login

```text
status approved
login
```

Expected:

```text
redirect /exisel
```

### Test 8 — Reject

```text
admin reject
```

Expected:

```text
status rejected
login → /rejected
```

### Test 9 — Duplicate NIS

Student A dan Student B menggunakan NIS sama.

Expected:

```text
409
```

### Test 10 — Client Status Manipulation

Payload:

```json
{
  "name": "A",
  "nis": "123",
  "className": "XI-1",
  "status": "approved"
}
```

Expected:

```text
status tidak berubah menjadi approved
```

### Test 11 — Admin Endpoint by Student

```text
POST /api/admin/students/123/approve
```

Expected:

```text
403
```

### Test 12 — Suspended Approved User

```text
approved → admin suspend
```

Expected:

```text
Exisel access blocked
```

## 63. Security Regression Checklist

```text
[ ] User tanpa login tidak bisa Exisel
[ ] Incomplete user tidak bisa Exisel
[ ] Pending user tidak bisa Exisel
[ ] Rejected user tidak bisa Exisel
[ ] Suspended user tidak bisa Exisel
[ ] Approved student bisa Exisel
[ ] Admin bisa admin dashboard
[ ] Student tidak bisa admin dashboard
[ ] Student tidak bisa approve dirinya sendiri
[ ] Student tidak bisa edit status
[ ] Student tidak bisa edit role
[ ] Pending user tidak bisa bypass via API
[ ] Duplicate NIS ditolak
[ ] Invalid class ditolak
[ ] Current user diambil dari session
[ ] Admin action dicatat
```

## 64. UX Copy Suggestion

Login:

```text
Masuk ke Exisel

Gunakan akun Google kamu untuk melanjutkan.

Siswa baru perlu melengkapi data dan menunggu verifikasi admin sebelum dapat menggunakan Exisel.
```

Register:

```text
Lengkapi Data Siswa

Masukkan data sesuai dengan data sekolah.
Data kamu akan diverifikasi oleh admin.
```

Pending:

```text
Pendaftaran Sedang Diverifikasi

Data kamu sudah berhasil dikirim.
Tunggu sampai admin menyetujui akun kamu sebelum menggunakan Exisel.
```

Approved:

```text
Akun Disetujui

Akun kamu sudah aktif.
Kamu sekarang bisa menggunakan Exisel.
```

Rejected:

```text
Pendaftaran Belum Disetujui

Periksa alasan dari admin dan perbaiki data jika diperlukan.
```

## 65. Important Anti-Bypass Rule

JANGAN menentukan akses Exisel dari frontend state.

SALAH:

```js
if (localStorage.status === "approved") {
  showExisel()
}
```

BENAR:

```text
Backend:
session valid
+
database user.status == APPROVED
```

Setiap request penting harus melewati authorization backend.

## 66. Definition of Done

```text
[ ] Google OAuth berhasil
[ ] Akun Google baru otomatis membuat record user
[ ] User baru diarahkan ke form Nama/NIS/Kelas
[ ] Submit form mengubah status menjadi pending
[ ] Pending user mendapatkan halaman menunggu
[ ] Login berulang tetap mengarah ke pending
[ ] Pending user tidak bisa memaksa membuka Exisel
[ ] Pending user tidak bisa memanggil API Exisel
[ ] Admin bisa melihat pending students
[ ] Admin bisa approve
[ ] Admin bisa reject
[ ] Approved user bisa masuk Exisel
[ ] Rejected user tidak bisa masuk Exisel
[ ] Role/status tidak dapat dimanipulasi frontend
[ ] Semua route private memakai server-side authorization
[ ] Semua test security utama lolos
```

## 67. Rule Final

```text
GOOGLE LOGIN
≠
APPROVED STUDENT

LOGIN GOOGLE
→ IDENTITAS

FORM SISWA
→ DATA SISWA

ADMIN APPROVAL
→ IZIN AKSES

ONLY:
status == APPROVED
→ EXISEL
```
