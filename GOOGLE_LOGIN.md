# Aktivasi Google Login EXISEL

Google Login di EXISEL memakai OAuth 2.0 Authorization Code Flow dengan PKCE.
Google hanya membuktikan identitas akun; izin memakai fitur siswa tetap diberikan
oleh admin/guru EXISEL setelah Nama, NIS, dan Kelas diverifikasi.

## 1. Buat OAuth Web Client di Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/), lalu pilih
   atau buat project khusus EXISEL.
2. Konfigurasikan OAuth consent screen. Isi nama aplikasi, email dukungan, dan
   informasi developer yang benar.
3. Buat credential **OAuth client ID** dengan application type
   **Web application**.
4. Tambahkan Authorized JavaScript origins:

   ```text
   http://localhost:3000
   https://exisel.web.id
   ```

5. Tambahkan Authorized redirect URIs berikut secara persis:

   ```text
   http://localhost:3000/api/auth/google/callback
   https://exisel.web.id/api/auth/google/callback
   ```

Perbedaan protokol, domain, port, path, atau garis miring dapat membuat Google
menolak callback dengan `redirect_uri_mismatch`. Referensi protokol resmi:
[OpenID Connect Google](https://developers.google.com/identity/openid-connect/openid-connect)
dan [OAuth 2.0 endpoint Google](https://developers.google.com/identity/protocols/oauth2/web-server).

## 2. Konfigurasi lokal

Salin `.env.example` menjadi `.env.local`, lalu isi nilai berikut:

```dotenv
GOOGLE_CLIENT_ID=CLIENT_ID_DARI_GOOGLE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=CLIENT_SECRET_DARI_GOOGLE
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_ALLOWED_EMAIL_DOMAIN=
```

Untuk Docker lokal, masukkan nilai yang sama ke `.env` berdasarkan
`.env.docker.example`. Jangan commit `.env`, `.env.local`, client secret, atau
hasil tangkapan layar yang menampilkan secret.

Jalankan aplikasi, buka `http://localhost:3000/login`, lalu pilih
**Lanjutkan dengan Google**.

## 3. Konfigurasi production

Di VPS, edit `/opt/exisel/.env.production`:

```dotenv
NEXT_PUBLIC_APP_URL=https://exisel.web.id
GOOGLE_CLIENT_ID=CLIENT_ID_DARI_GOOGLE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=CLIENT_SECRET_DARI_GOOGLE
GOOGLE_REDIRECT_URI=https://exisel.web.id/api/auth/google/callback
GOOGLE_ALLOWED_EMAIL_DOMAIN=
```

Setelah nilainya tersimpan, deploy menggunakan alur production repository:

```bash
cd /opt/exisel
sudo ENV_FILE=/opt/exisel/.env.production ./scripts/deploy-production.sh
```

`GOOGLE_ALLOWED_EMAIL_DOMAIN` bersifat opsional. Kosongkan agar akun Gmail
pribadi dapat digunakan. Isi hanya jika sekolah memang mewajibkan satu domain
Google Workspace tertentu.

## 4. Alur akun yang harus diuji

1. Siswa baru login dengan Google dan diarahkan ke `/register/student`.
2. Siswa mengisi Nama, NIS tujuh angka, dan Kelas resmi.
3. Setelah dikirim, siswa diarahkan ke `/pending` dan belum dapat membuka
   dashboard, kehadiran, pendaftaran, maupun community.
4. Admin login melalui `/admin/login`, membuka `/admin/students`, kemudian
   menyetujui atau menolak data siswa.
5. Siswa yang disetujui masuk ke `/dashboard`.
6. Siswa yang ditolak melihat alasan di `/rejected` dan dapat mengirim ulang.
7. Siswa yang ditangguhkan diarahkan ke `/suspended`.

## 5. Aturan keamanan implementasi

- OAuth memakai `state`, `nonce`, dan PKCE; semuanya disimpan dalam cookie
  `HttpOnly`, `SameSite=Lax`, berumur 10 menit, dan `Secure` di production.
- ID token diverifikasi terhadap signature Google, issuer, audience, masa
  berlaku, nonce, serta status `email_verified`.
- Role dan status tidak diterima dari form/browser. Status hanya berubah melalui
  transisi server yang diizinkan.
- Record akun lama tetap berstatus `APPROVED`; migrasi tidak memblokir siswa
  yang sebelumnya sudah dapat login.
- Aktivitas approve, reject, suspend, dan buka suspend dicatat pada audit log.
- Jangan menaruh client secret di source code, log publik, proposal, atau
  repository GitHub.
