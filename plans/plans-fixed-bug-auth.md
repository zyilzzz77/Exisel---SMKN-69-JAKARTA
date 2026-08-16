# EXISEL — Production OAuth Redirect Bug Fix Plan

## 1. Tujuan

Memperbaiki bug production ketika user melakukan **Register/Login dengan Google**, tetapi setelah OAuth berhasil browser malah diarahkan ke:

```txt
http://0.0.0.0:3000/register
```

Padahal seharusnya user kembali ke domain production Exisel, misalnya:

```txt
https://DOMAIN-EXISEL/register
```

Bug ini harus diperbaiki tanpa merusak:

- Login Google yang sudah berjalan.
- Session user.
- Register user baru.
- Login user lama.
- Redirect setelah login.
- Flow QR/barcode attendance yang membutuhkan login.
- Development environment (`localhost` / LAN IP).
- Production environment.

---

# 2. Gejala Bug

Flow sekarang:

```txt
User membuka Exisel production
        ↓
Klik "Continue with Google"
        ↓
Google OAuth berhasil
        ↓
Session berhasil dibuat
        ↓
Browser diarahkan ke:
http://0.0.0.0:3000/register
        ↓
ERROR / alamat tidak dapat dibuka user
```

Tetapi jika user kembali ke tab Exisel sebelumnya:

```txt
Session ternyata sudah aktif
        ↓
Website mendeteksi user sudah login
        ↓
User akhirnya masuk ke /register atau halaman tujuan
```

## Kesimpulan Awal

Autentikasi Google kemungkinan **berhasil**.

Masalah utama kemungkinan berada pada:

1. Base URL production salah.
2. `NEXTAUTH_URL` / `AUTH_URL` salah.
3. `NEXT_PUBLIC_APP_URL` / `SITE_URL` salah.
4. `callbackUrl` di `signIn()` menggunakan URL internal.
5. Reverse proxy mengirim host internal `0.0.0.0:3000`.
6. Auth.js tidak mempercayai forwarded host dari proxy.
7. Redirect callback membuat absolute URL berdasarkan host internal.
8. Environment variable production tidak terbaca / tidak di-set.
9. Environment variable public tertanam saat proses build dengan nilai development/internal.

---

# 3. Severity

```txt
Priority : P0 / Critical
Impact   : Authentication / Registration
Scope    : Production
```

Alasan:

- User baru gagal menyelesaikan flow register secara normal.
- Google OAuth terlihat seperti gagal walaupun session sebenarnya berhasil.
- Bisa menyebabkan user mencoba login berkali-kali.
- Bisa mengganggu flow attendance yang membutuhkan authentication.

---

# 4. Jangan Langsung Mengubah Logic Auth

Sebelum coding, lakukan audit untuk mencari sumber `0.0.0.0:3000`.

Jangan langsung menambah redirect workaround seperti:

```ts
window.location.href = "/register";
```

karena itu hanya menutupi akar masalah.

Target utama adalah memastikan Auth server memahami **canonical production origin** dengan benar.

---

# 5. Phase 1 — Audit Project

Cari seluruh project:

```bash
0.0.0.0
localhost
localhost:3000
127.0.0.1
NEXTAUTH_URL
AUTH_URL
AUTH_TRUST_HOST
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL
SITE_URL
APP_URL
BASE_URL
callbackUrl
redirect
signIn(
window.location
new URL(
request.url
headers()
x-forwarded-host
x-forwarded-proto
```

## File yang wajib diperiksa

Contoh kemungkinan lokasi:

```txt
.env
.env.local
.env.production
.env.production.local

auth.ts
src/auth.ts

app/api/auth/[...nextauth]/route.ts

pages/api/auth/[...nextauth].ts

components/auth/*
components/login/*
components/register/*

app/login/*
app/register/*

middleware.ts

next.config.js
next.config.mjs
next.config.ts

Dockerfile
docker-compose.yml
docker-compose.yaml

nginx.conf

deployment config
```

---

# 6. Phase 2 — Identifikasi Versi Auth

Tentukan apakah Exisel menggunakan:

## NextAuth.js v4

Biasanya pattern:

```ts
import NextAuth from "next-auth";
```

dan konfigurasi seperti:

```ts
export const authOptions = {};
```

Production canonical URL biasanya menggunakan:

```env
NEXTAUTH_URL=https://DOMAIN-EXISEL
```

---

## Auth.js / NextAuth v5

Biasanya pattern:

```ts
import NextAuth from "next-auth";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({...});
```

Untuk deployment di belakang reverse proxy, audit:

```env
AUTH_TRUST_HOST=true
```

dan bila project memang membutuhkan canonical URL eksplisit:

```env
AUTH_URL=https://DOMAIN-EXISEL
```

---

# 7. Phase 3 — Audit Environment Variables Production

## Target

Tidak boleh ada production variable yang bernilai:

```env
http://0.0.0.0:3000
http://localhost:3000
http://127.0.0.1:3000
```

untuk URL yang digunakan browser.

---

## Contoh Production

### Jika NextAuth v4

```env
NODE_ENV=production

NEXTAUTH_URL=https://DOMAIN-EXISEL
NEXTAUTH_SECRET=***
```

### Jika Auth.js v5

```env
NODE_ENV=production

AUTH_SECRET=***
AUTH_TRUST_HOST=true
```

Jika dibutuhkan oleh arsitektur project:

```env
AUTH_URL=https://DOMAIN-EXISEL
```

---

# 8. Bedakan Internal Server Address dan Public URL

Ini penting.

Server boleh listen ke:

```txt
0.0.0.0:3000
```

Contoh:

```bash
next start -H 0.0.0.0 -p 3000
```

Itu **normal**.

Tetapi browser user tidak boleh menerima:

```txt
http://0.0.0.0:3000
```

Konsepnya:

```txt
Internet
   ↓
https://exisel.example
   ↓
Reverse Proxy
   ↓
http://0.0.0.0:3000
   ↓
Next.js
```

`0.0.0.0:3000` hanya dipakai secara internal oleh server.

---

# 9. Phase 4 — Audit Google Login Button

Cari implementasi:

```ts
signIn("google", ...)
```

## Contoh yang berpotensi bermasalah

```ts
signIn("google", {
  callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/register`,
});
```

Jika:

```env
NEXT_PUBLIC_APP_URL=http://0.0.0.0:3000
```

maka redirect production akan salah.

---

# 10. Gunakan Relative Redirect Bila Masih Satu Domain

Untuk redirect internal Exisel, prioritaskan URL relatif.

Contoh:

```ts
await signIn("google", {
  callbackUrl: "/register",
});
```

atau sesuai API auth library yang digunakan:

```ts
await signIn("google", {
  redirectTo: "/register",
});
```

Gunakan hanya option yang sesuai dengan versi Auth/NextAuth di project.

Keuntungan:

```txt
Development:
http://localhost:3000/register

Production:
https://DOMAIN-EXISEL/register
```

tanpa hardcode hostname.

---

# 11. Jangan Membuat URL Production di Client Jika Tidak Perlu

Hindari:

```ts
const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
```

untuk navigasi internal sederhana.

Daripada:

```ts
router.push(`${baseUrl}/register`);
```

gunakan:

```ts
router.push("/register");
```

---

# 12. Catatan NEXT_PUBLIC_ Environment Variables

Variable:

```env
NEXT_PUBLIC_*
```

dapat masuk ke client bundle saat build.

Artinya jika image/container dibuild saat:

```env
NEXT_PUBLIC_APP_URL=http://0.0.0.0:3000
```

lalu environment production diganti setelah build, JavaScript client masih mungkin membawa nilai lama tergantung cara deployment.

Karena itu:

- Jangan gunakan public base URL untuk redirect internal jika tidak dibutuhkan.
- Pastikan build production memakai environment production yang benar.
- Setelah mengganti variable public, lakukan rebuild.

---

# 13. Phase 5 — Audit Auth Redirect Callback

Cari konfigurasi seperti:

```ts
callbacks: {
  async redirect({ url, baseUrl }) {
    ...
  }
}
```

## Pattern berbahaya

```ts
return "http://0.0.0.0:3000/register";
```

atau:

```ts
return `${process.env.APP_URL}/register`;
```

tanpa memastikan `APP_URL` benar.

---

## Target Logic

Redirect harus:

1. Menerima relative internal URL.
2. Mencegah redirect ke origin tidak terpercaya.
3. Menggunakan canonical/public origin.
4. Tidak menggunakan internal container hostname.

Pseudo logic:

```ts
if (url.startsWith("/")) {
  return `${baseUrl}${url}`;
}

if (new URL(url).origin === baseUrl) {
  return url;
}

return baseUrl;
```

Implementasi final harus disesuaikan dengan versi NextAuth/Auth.js yang dipakai.

---

# 14. Phase 6 — Audit Reverse Proxy

Jika Exisel berjalan melalui:

```txt
Nginx
Cloudflare
Docker
Coolify
Railway
Render
VPS reverse proxy
atau proxy lain
```

pastikan request ke Next.js meneruskan public host/protocol dengan benar.

Target header:

```txt
Host: DOMAIN-EXISEL
X-Forwarded-Host: DOMAIN-EXISEL
X-Forwarded-Proto: https
```

---

# 15. Contoh Nginx Proxy

Jika menggunakan Nginx, konfigurasi perlu memiliki header sejenis:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
}
```

Sesuaikan dengan infrastructure Exisel.

Jangan copy-paste ke production sebelum memastikan deployment memang menggunakan Nginx.

---

# 16. Phase 7 — Google Cloud OAuth Audit

Periksa Google Cloud Console:

```txt
APIs & Services
→ Credentials
→ OAuth 2.0 Client ID
```

## Authorized JavaScript Origins

Production:

```txt
https://DOMAIN-EXISEL
```

Development bila diperlukan:

```txt
http://localhost:3000
```

---

## Authorized Redirect URIs

Production:

```txt
https://DOMAIN-EXISEL/api/auth/callback/google
```

Development:

```txt
http://localhost:3000/api/auth/callback/google
```

Tidak boleh ada production callback ke:

```txt
http://0.0.0.0:3000/...
```

---

# 17. Phase 8 — Register Redirect Logic

Setelah OAuth berhasil, tentukan behavior berdasarkan status user.

## User Baru

```txt
Google Login
   ↓
Session dibuat
   ↓
Check user profile
   ↓
Profile belum lengkap
   ↓
/register
```

## User Lama

```txt
Google Login
   ↓
Session dibuat
   ↓
Check user profile
   ↓
Profile lengkap
   ↓
/dashboard atau halaman tujuan
```

Jangan menggunakan hostname hardcoded.

---

# 18. Preserve Destination Setelah Login

Exisel punya beberapa flow yang mungkin membawa user ke login:

```txt
/register
/dashboard
/community
/kehadiran
QR attendance
```

Buat sistem `returnTo` / `callbackUrl` yang aman.

Contoh:

```txt
/kehadiran?attendanceToken=abc
```

Jika user belum login:

```txt
/login?returnTo=%2Fkehadiran%3FattendanceToken%3Dabc
```

Setelah Google login:

```txt
redirect → returnTo
```

Bukan selalu:

```txt
redirect → /register
```

---

# 19. Security untuk returnTo

Jangan menerima arbitrary external redirect.

Contoh berbahaya:

```txt
/login?returnTo=https://evil.example
```

Hanya izinkan internal path seperti:

```txt
/register
/dashboard
/community
/kehadiran
```

Minimal validation:

```ts
function sanitizeReturnTo(value?: string) {
  if (!value) return "/";

  if (!value.startsWith("/")) {
    return "/";
  }

  if (value.startsWith("//")) {
    return "/";
  }

  return value;
}
```

---

# 20. Phase 9 — Logging Sementara

Tambahkan debug logging server-side sementara pada production.

Log:

```txt
request host
request protocol
x-forwarded-host
x-forwarded-proto
AUTH_URL / NEXTAUTH_URL presence
redirect target
callbackUrl
```

Contoh konsep:

```ts
console.log("[AUTH DEBUG]", {
  host: request.headers.get("host"),
  forwardedHost: request.headers.get("x-forwarded-host"),
  forwardedProto: request.headers.get("x-forwarded-proto"),
});
```

## Jangan pernah log:

```txt
AUTH_SECRET
NEXTAUTH_SECRET
Google client secret
access token
refresh token
session token
password
cookie content
```

---

# 21. Expected Debug Result

Production seharusnya terlihat seperti:

```txt
host:
DOMAIN-EXISEL

x-forwarded-host:
DOMAIN-EXISEL

x-forwarded-proto:
https

redirect:
https://DOMAIN-EXISEL/register
```

Bukan:

```txt
host:
0.0.0.0:3000

redirect:
http://0.0.0.0:3000/register
```

---

# 22. Phase 10 — Fix Strategy

Urutan fix:

## Fix A — Environment

Pastikan production canonical URL benar.

```txt
NEXTAUTH_URL / AUTH_URL
```

---

## Fix B — Trust Proxy

Jika Auth.js v5 + reverse proxy:

```env
AUTH_TRUST_HOST=true
```

---

## Fix C — Remove Hardcoded Internal URL

Hapus penggunaan:

```txt
0.0.0.0
localhost
127.0.0.1
```

dari browser-facing redirect.

---

## Fix D — Relative callback

Ubah navigasi internal menjadi relative:

```txt
/register
/dashboard
/kehadiran
```

---

## Fix E — Proxy Headers

Pastikan reverse proxy meneruskan:

```txt
Host
X-Forwarded-Host
X-Forwarded-Proto
```

---

## Fix F — Google OAuth

Pastikan Google callback menggunakan domain HTTPS production.

---

# 23. Phase 11 — Build & Deploy

Setelah environment/config diperbaiki:

```bash
npm run build
```

Lalu jalankan test:

```bash
npm run start
```

Pastikan tidak ada error auth pada build log.

Jika menggunakan Docker:

```txt
rebuild image
↓
redeploy container
↓
restart application
```

Jangan hanya restart container jika bug berasal dari `NEXT_PUBLIC_*` yang sudah tertanam saat build.

---

# 24. Testing Matrix

## Test 1 — Google Register User Baru

```txt
Production
→ Open /register
→ Continue with Google
→ Google authentication
→ kembali ke DOMAIN-EXISEL
→ /register
```

Expected:

```txt
PASS
```

Tidak boleh ada:

```txt
0.0.0.0
localhost
127.0.0.1
```

---

# 25. Test 2 — Google Login User Lama

```txt
/login
→ Continue with Google
→ login berhasil
→ masuk ke halaman user
```

Expected:

```txt
PASS
```

---

# 26. Test 3 — Direct Login dari QR Attendance

```txt
Scan QR
→ /kehadiran?...
→ belum login
→ redirect login
→ Google login
→ kembali ke attendance flow
→ proses attendance
```

Expected:

```txt
PASS
```

User tidak boleh kehilangan destination setelah OAuth.

---

# 27. Test 4 — Session Existing

```txt
User sudah login
→ refresh
→ buka tab baru
→ buka /register
→ buka /community
```

Expected:

```txt
Session tetap valid
Tidak ada OAuth redirect ulang
Tidak ada 0.0.0.0
```

---

# 28. Test 5 — Incognito

Lakukan test incognito untuk memastikan hasil tidak dipengaruhi:

```txt
cookie lama
localStorage
service worker
browser cache
existing Google session
```

---

# 29. Test 6 — Mobile

Wajib test:

```txt
Android Chrome
Google app/browser
Google Lens redirect
iOS Safari jika tersedia
```

Karena QR attendance akan banyak digunakan dari HP.

---

# 30. Test 7 — Development

Production fix tidak boleh merusak local development.

Expected:

```txt
http://localhost:3000
```

masih dapat menggunakan Google OAuth bila development callback memang didaftarkan.

---

# 31. Test 8 — LAN Development

Jika Exisel dites dari HP melalui:

```txt
http://192.168.x.x:3000
```

jangan otomatis menganggapnya production canonical URL.

Pisahkan environment:

```txt
development
staging
production
```

Perhatikan juga bahwa OAuth provider dapat memiliki aturan redirect origin sendiri.

---

# 32. Regression Test

Pastikan fitur berikut tetap normal:

```txt
[ ] Credentials login jika ada
[ ] Google login
[ ] Google register
[ ] Logout
[ ] Session restore
[ ] Session expiry
[ ] Protected route
[ ] Admin authentication
[ ] Guru authentication
[ ] Student authentication
[ ] Community
[ ] Attendance
[ ] QR attendance
[ ] Mobile navigation
```

---

# 33. Acceptance Criteria

Bug dianggap selesai jika semua kondisi berikut terpenuhi:

```txt
[ ] Google OAuth production berhasil
[ ] User baru kembali ke domain production
[ ] User lama kembali ke domain production
[ ] Tidak ada redirect browser ke 0.0.0.0
[ ] Tidak ada redirect browser ke localhost
[ ] Tidak ada redirect browser ke 127.0.0.1
[ ] /register berjalan setelah OAuth
[ ] Session tetap tersimpan
[ ] QR attendance tetap menyimpan destination
[ ] HTTPS tetap digunakan
[ ] Mobile login berhasil
[ ] Incognito login berhasil
[ ] Development login tidak rusak
[ ] Tidak ada secret yang terekspos ke client/log
```

---

# 34. Optional Improvement — Centralized URL Config

Untuk menghindari bug serupa, buat helper canonical URL server-side.

Contoh konsep:

```ts
export function getAppUrl() {
  if (process.env.NODE_ENV === "production") {
    const url =
      process.env.AUTH_URL ??
      process.env.NEXTAUTH_URL;

    if (!url) {
      throw new Error(
        "Production application URL is not configured"
      );
    }

    return url.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
```

Catatan:

- Sesuaikan dengan versi auth Exisel.
- Hindari mengirim secret/server config ke client.
- Untuk internal navigation tetap prioritaskan relative path.

---

# 35. Optional Improvement — Production Guard

Saat server production start, validasi environment.

Contoh:

```ts
const forbiddenProductionHosts = [
  "0.0.0.0",
  "localhost",
  "127.0.0.1",
];

if (process.env.NODE_ENV === "production") {
  const authUrl =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL;

  if (authUrl) {
    const hostname = new URL(authUrl).hostname;

    if (forbiddenProductionHosts.includes(hostname)) {
      throw new Error(
        `Invalid production auth URL: ${hostname}`
      );
    }
  }
}
```

Tujuannya supaya kesalahan konfigurasi gagal saat deploy, bukan baru ditemukan user.

---

# 36. Optional Improvement — Health Check

Tambahkan internal production health check yang memvalidasi:

```txt
App environment
Database
Auth configuration
Public origin
```

Jangan expose secret.

Contoh response:

```json
{
  "status": "ok",
  "environment": "production",
  "authOriginConfigured": true
}
```

---

# 37. Root Cause Report Setelah Fix

Setelah bug selesai, dokumentasikan akar masalah.

Format:

```txt
Incident:
Google OAuth Redirect to 0.0.0.0:3000

Root Cause:
...

Affected Environment:
Production

Why Session Still Worked:
...

Fix:
...

Preventive Action:
...
```

Tujuannya supaya bug yang sama tidak muncul lagi saat deployment berikutnya.

---

# 38. Recommended Execution Order

```txt
1. Search 0.0.0.0 / localhost di codebase
                ↓
2. Identifikasi NextAuth v4 atau Auth.js v5
                ↓
3. Audit production environment variables
                ↓
4. Audit signIn callbackUrl / redirectTo
                ↓
5. Audit auth redirect callback
                ↓
6. Audit reverse proxy headers
                ↓
7. Audit Google OAuth redirect URI
                ↓
8. Implement root-cause fix
                ↓
9. Rebuild production
                ↓
10. Deploy
                ↓
11. Test user baru
                ↓
12. Test user lama
                ↓
13. Test QR attendance
                ↓
14. Remove temporary debug logs
                ↓
15. Close incident
```

---

# 39. Definition of Done

Fitur authentication dianggap production-safe ketika:

```txt
Google → Exisel → Session → Correct Destination
```

berjalan konsisten tanpa bergantung pada:

```txt
tab lama
manual refresh
browser back
alamat internal server
```

Final expected flow:

```txt
User
 ↓
https://DOMAIN-EXISEL/register
 ↓
Google OAuth
 ↓
Auth callback
 ↓
Session created
 ↓
https://DOMAIN-EXISEL/register
 ↓
Register/Profile flow
```

Untuk attendance:

```txt
QR
 ↓
/kehadiran
 ↓
Login Google jika diperlukan
 ↓
OAuth callback
 ↓
kembali ke /kehadiran
 ↓
Attendance diproses
```

---

# 40. Important Rule

```txt
0.0.0.0:3000 = INTERNAL LISTEN ADDRESS
DOMAIN HTTPS   = PUBLIC BROWSER ADDRESS
```

Keduanya tidak boleh tercampur dalam redirect OAuth production.
