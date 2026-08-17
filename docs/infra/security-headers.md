# EXISEL — Security Headers Production (Caddy)

> Audit oleh Subagent 7 (Infrastructure & Browser Security Engineer) untuk rencana P0
> `plans/plans_exisel_qr_camera_8_subagents.md` bagian 32–33 (Permissions-Policy / CSP /
> HTTPS) dan 79–82 (Headers production, Camera Policy, HTTPS, Cache).
> Status audit: **bersih** — Caddyfile tidak perlu diubah.

## 1. Satu-satunya sumber security header: Caddyfile

Produksi berjalan di belakang Caddy 2 (`compose.production.yml`, service `caddy`,
Caddyfile di-mount read-only ke `/etc/caddy/Caddyfile`). Blok `header {}` pada level
site berlaku untuk **semua** respons: halaman Next.js (`app:3000`) dan Go Core API
(`/api/core/*` → `exisel-core:8080`).

Tidak ada sumber header lain yang menimpa:

- `next.config.ts` → **tidak ada** `headers()`; hanya `poweredByHeader: false`
  (Caddy juga menstrip `X-Powered-By`, jadi perlindungan ganda).
- `src/app/layout.tsx` / `globals.css` → **tidak ada** `<meta http-equiv>` CSP apa pun.
- Tidak ada `src/middleware.ts`.
- Backend Go → tidak men-set header keamanan sendiri (disengaja: Caddy yang mengurus).

## 2. Header efektif di production

| Header | Nilai | Rationale |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Wajib HTTPS 1 tahun + subdomain. `getUserMedia` hanya tersedia di secure context (HTTPS) — HSTS menjaga kondisi itu permanen. |
| `X-Content-Type-Options` | `nosniff` | Mencegah MIME-type sniffing. |
| `X-Frame-Options` | `DENY` | Mencegah clickjacking; aplikasi memang tidak dirancang untuk di-frame. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Standar aman; URL sensitif (token `?t=` pada `/attendance/scan`) tidak bocor ke pihak ketiga. |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=()` | `camera=(self)` wajib: scanner QR absensi memanggil `getUserMedia` pada origin yang sama (same-origin). Mikrofon & geolocation tidak dipakai → dikosongkan. |
| `Server`, `X-Powered-By` | dihapus (`-Server`, `-X-Powered-By`) | Menghilangkan fingerprint stack (Caddy/Next.js). |

### Header yang sengaja TIDAK di-set (dan jangan ditambah sembarangan)

- **Content-Security-Policy (CSP)**: belum ada, dan tidak ada yang memblokir kamera.
  Jika nanti ditambahkan, pastikan tidak menghalangi `mediacapture`/kamera dan sumber
  daya same-origin. Jangan menambah CSP ketat di tengah jalur fix P0 ini.
- **Cross-Origin-Embedder-Policy (COEP)**: jangan diaktifkan. COEP mensyaratkan
  `crossorigin`/CORP pada semua resource cross-origin — akan memecah gambar Google
  (`lh3.googleusercontent.com`, dipakai `next/image` untuk foto profil Google Login)
  dan foto profil siswa dari Google.
- **Cross-Origin-Opener-Policy (COOP)**: tidak dibutuhkan untuk scanner; menambahnya
  tanpa alasan hanya berisiko memecah OAuth redirect.

## 3. Peringatan Keras

1. **JANGAN pernah deploy `camera=()`.**
   Bug P0 Android Chrome scanner berasal dari build lama yang men-deploy
   `Permissions-Policy: camera=()`. Nilai `()` memblokir `getUserMedia` bahkan untuk
   origin sendiri → `NotAllowedError` permanen tanpa prompt → scanner mati total.
   Nilai wajib di Caddyfile adalah `camera=(self)`. Jika hasil `curl` production
   menunjukkan `camera=()`, itu berarti build/image lama masih terdeploy — rebuild dan
   redeploy, bukan mengubah kode frontend.

   ```sh
   # FAIL (build lama, kamera mati):
   permissions-policy: camera=(), microphone=(), geolocation=()
   # OK (nilai wajib saat ini):
   permissions-policy: camera=(self), microphone=(), geolocation=()
   ```

2. **Kamera butuh HTTPS (secure context).**
   `navigator.mediaDevices.getUserMedia` hanya tersedia bila
   `window.isSecureContext === true`. Di Android Chrome, memanggilnya lewat HTTP
   menghasilkan `SecurityError`, bukan `NotAllowedError`. Produksi
   (`https://exisel.web.id`) wajib TLS via Caddy/ACME; jangan pernah mengarahkan flow
   absensi QR ke host HTTP internal (mis. `http://0.0.0.0:3000`). Ini relevan langsung
   untuk flow absensi QR Android (Google Lens → scanner).

3. **Perubahan Caddyfile = restart container.**
   Global option `admin off` membuat `caddy reload` (admin API) tidak tersedia.
   Caddyfile dimount `:ro`, jadi setelah edit jalankan:

   ```sh
   docker compose -f compose.production.yml up -d caddy   # atau: ... restart caddy
   ```

   lalu verifikasi ulang header dari luar (bagian 4).

## 4. Cara verifikasi dari luar server

```sh
curl -sI https://exisel.web.id | grep -i 'permissions-policy\|content-security\|strict-transport'
```

Hasil yang diharapkan (nama header bisa beda kapitalisasi):

```txt
strict-transport-security: max-age=31536000; includeSubDomains
permissions-policy: camera=(self), microphone=(), geolocation=()
```

`Content-Security-Policy` tidak muncul — itu kondisi saat ini (belum diset; tidak
memblokir kamera).

Catatan: cache/CDN di depan Caddy dapat menyembunyikan header asli; jika ragu,
tambahkan `-H 'Cache-Control: no-cache'` atau tes via path berbeda (mis.
`/attendance/scan` dan `/api/core/healthz`).

---

## 5. Checklist verifikasi header production (untuk QA / Subagent 8)

Jalankan semua perintah terhadap **production nyata** (`https://exisel.web.id`),
bukan localhost. Semua cek harus PASS sebelum deklarasi done.

| # | Perintah | Ekspektasi (PASS) | FAIL berarti |
| --- | --- | --- | --- |
| 1 | `curl -sI https://exisel.web.id/ \| grep -i permissions-policy` | `camera=(self), microphone=(), geolocation=()` | `camera=()` → build lama terdeploy, redeploy image baru |
| 2 | `curl -sI https://exisel.web.id/ \| grep -i strict-transport` | `max-age=31536000; includeSubDomains` | HSTS hilang/berkurang → periksa blok header Caddyfile |
| 3 | `curl -sI https://exisel.web.id/ \| grep -i 'x-content-type-options\|x-frame-options\|referrer-policy'` | `nosniff`, `DENY`, `strict-origin-when-cross-origin` | header hilang → Caddyfile tidak aktif/bukan Caddy yang melayani |
| 4 | `curl -sI https://exisel.web.id/ \| grep -i '^server:\|x-powered-by'` | kosong (tidak ada output) | muncul → strip `-Server`/`-X-Powered-By` tidak jalan |
| 5 | `curl -sI https://exisel.web.id/ \| grep -i 'cross-origin-\|content-security-policy'` | kosong | muncul COEP/COOP/CSP tak terduga → dapat memecah kamera/OAuth; review sebelum lanjut |
| 6 | `curl -sI https://exisel.web.id/api/core/healthz \| grep -i permissions-policy` | sama dengan cek #1 | header berbeda di path API → blok header tidak diterapkan site-level |
| 7 | `curl -sI -o /dev/null -w '%{http_code} %{redirect_url}\n' http://exisel.web.id/` | `301`/`308` ke `https://exisel.web.id/` | tidak redirect ke HTTPS → TLS/Caddy salah; kamera mustahil jalan di HTTP |
| 8 | Di browser Android Chrome, console `https://exisel.web.id`: `window.isSecureContext` | `true` | `false` → halaman dibuka lewat HTTP/insecure origin |
| 9 | Di browser yang sama: `!!navigator.mediaDevices?.getUserMedia` | `true` | `false` padahal cek 8 `true` → browser terlalu tua; tangani sebagai UNSUPPORTED |
| 10 | `curl -sI https://exisel.web.id/api/attendance/scan \| grep -i cache-control` | `no-store` (mutasi absensi tidak di-cache) | hasil QR/attendance ter-cache → melanggar bagian 82; perbaiki route handler |
| 11 | Setelah edit Caddyfile: `docker compose -f compose.production.yml up -d caddy` lalu ulangi cek #1–#3 | semua tetap PASS | perubahan tidak terlihat → container belum ter-recreate (admin off, wajib restart) |

> Tes header saja belum cukup untuk kamera: konfirmasi akhir tetap uji fisik
> "Aktifkan Kamera" di Android Chrome + Google Lens (ranah Subagent 8, plan bagian 78).
