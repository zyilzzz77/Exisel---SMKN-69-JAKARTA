# Deployment production EXISEL

Panduan lengkap deploy EXISEL ke VPS production, arsitektur full stack:
Next.js, Go Core API, PostgreSQL, Redis, dan Caddy (TLS/reverse proxy),
semuanya dijalankan dengan Docker Compose.

Target production:

- Domain: `exisel.web.id`
- VPS: `208.84.100.133` (`ip-208-84-100-133.my-advin.com`)
- Runtime: Docker Compose
- TLS/reverse proxy: Caddy (sertifikat Let's Encrypt otomatis)
- Database: PostgreSQL dalam jaringan internal Docker
- Cache/throttle: Redis dalam jaringan internal Docker
- Core API: Go (`exisel-core`) untuk scan kehadiran high-throughput

## Arsitektur dan keamanan

Susunan container production (lihat `compose.production.yml`):

| Container | Image/build | Peran |
| --- | --- | --- |
| `caddy` | `caddy:2.11.4-alpine` | Satu-satunya yang membuka port host `80`, `443/tcp`, `443/udp`. Redirect HTTP→HTTPS, TLS otomatis, header keamanan. |
| `app` | build `Dockerfile` (target `runner`) | Next.js standalone di port 3000 (`expose`, tidak dipublikasikan). |
| `exisel-core` | build `backend-go/Dockerfile` | Go Core API di port 8080 (`expose`). Melayani `POST /api/core/v1/attendance/scan`. |
| `redis` | `redis:7-alpine` | Cache + rate-limit accelerator untuk core. Ephemeral (tanpa AOF), 128MB LRU. |
| `database` | `postgres:16-alpine` | PostgreSQL; tidak publik sama sekali. Auth `scram-sha-256`. |
| `migrate` | build `Dockerfile` (target `migrator`) | Mengjalankan `prisma migrate deploy` saat deploy, lalu berhenti. |

Routing: `Caddy → /api/core/* → exisel-core:8080`, selain itu `→ app:3000`
(sesuai `Caddyfile`). Jaringan `backend` bersifat `internal: true` (tidak ada
akses internet dari/ke database/redis/core kecuali lewat DNS/egress Docker),
sedangkan `edge` menghubungkan Caddy dengan aplikasi.

Pengerasan keamanan yang sudah terpasang:

- Cookie sesi dipaksa memakai atribut `Secure` (`SESSION_COOKIE_SECURE=true` di compose).
- Aplikasi dan core dijalankan sebagai user non-root.
- `security_opt: no-new-privileges` dan `cap_drop: ALL` pada `app` dan `exisel-core`.
- Log Docker dibatasi (json-file, 10MB × 5 file).
- Next.js memanggil core lewat hostname internal `http://exisel-core:8080`; token sesi
  diteruskan sebagai cookie, sehingga sesi divalidasi tanpa keluar dari jaringan Docker.

## 1. Siapkan DNS Cloudflare sebelum meminta sertifikat

Pastikan lebih dulu status zone di Cloudflare **Active**, bukan Pending. Di
registrar domain, nameserver harus sama persis dengan dua nameserver yang
ditampilkan Cloudflare pada halaman **Overview**. Periksa delegasi publik:

```bash
dig +short NS exisel.web.id
```

Jika hasilnya masih nameserver penyedia lama, record yang dibuat di dashboard
Cloudflare belum menjadi sumber DNS publik. Ubah nameserver di registrar,
tunggu propagasi, lalu periksa lagi sebelum melanjutkan.

Di Cloudflare, buka **Websites > exisel.web.id > DNS > Records**, kemudian
pilih **Add record** dan buat record berikut:

| Type | Name | IPv4 address | Proxy status | TTL |
| --- | --- | --- | --- | --- |
| A | `@` | `208.84.100.133` | **DNS only** (awan abu-abu) untuk deploy pertama | Auto |

Karena zone Cloudflare-nya adalah `exisel.web.id`, nilai `@` menghasilkan
hostname `exisel.web.id`. Jangan mengisi Name dengan `exisel`, karena itu akan
membuat `exisel.exisel.web.id`.

Hapus record `AAAA` untuk `exisel.web.id` jika VPS belum memiliki IPv6 yang
benar. Tunggu propagasi, lalu pastikan perintah berikut mengembalikan tepat
`208.84.100.133`:

```bash
dig +short A exisel.web.id
```

Caddy baru dapat memperoleh sertifikat publik setelah DNS benar dan port 80
serta 443 dapat dijangkau dari internet.

Untuk Windows/PowerShell, pemeriksaan yang setara:

```powershell
Resolve-DnsName exisel.web.id -Type A
```

Jangan lanjut ke aktivasi proxy Cloudflare sebelum perintah tersebut
mengembalikan `208.84.100.133` dan HTTPS origin pada langkah 9 sudah berhasil.

## 2. Masuk ke VPS

Ganti `<SSH_USER>` dengan user yang diberikan penyedia VPS:

```bash
ssh <SSH_USER>@208.84.100.133
```

Gunakan SSH key, nonaktifkan login password/root setelah key terverifikasi, dan
jangan menaruh private key atau password di repository.

## 3. Buka firewall minimum

Untuk Ubuntu dengan UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
sudo ufw status
```

Buka port yang sama pada firewall panel penyedia VPS jika tersedia. Jangan buka
port `3000`, `8080`, `6379`, atau `5432` ke internet.

## 4. Instal Docker Engine dan Compose

Gunakan repository APT resmi Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo docker compose version
```

Semua perintah Docker selanjutnya dapat tetap memakai `sudo`. Jika user
dimasukkan ke grup `docker`, perlakukan akses itu setara root.

## 5. Clone source production

```bash
sudo mkdir -p /opt/exisel
sudo chown "$USER":"$USER" /opt/exisel
git clone https://github.com/zyilzzz77/Exisel---SMKN-69-JAKARTA.git /opt/exisel
cd /opt/exisel
git checkout main
```

Jika repository private, gunakan GitHub deploy key khusus read-only.

## 6. Buat environment rahasia

```bash
cd /opt/exisel
cp .env.production.example .env.production
chmod 600 .env.production

POSTGRES_SECRET="$(openssl rand -hex 32)"
SESSION_SECRET_VALUE="$(openssl rand -hex 64)"

sed -i "s/GANTI_DENGAN_HEX_ACAK_MINIMAL_64_KARAKTER/${POSTGRES_SECRET}/" .env.production
sed -i "s/GANTI_DENGAN_SECRET_ACAK_MINIMAL_64_KARAKTER/${SESSION_SECRET_VALUE}/" .env.production
unset POSTGRES_SECRET SESSION_SECRET_VALUE
nano .env.production
```

Di editor, ganti `ACME_EMAIL` dengan email aktif. Pastikan nilai berikut tetap:

```dotenv
DOMAIN=exisel.web.id
NEXT_PUBLIC_APP_URL=https://exisel.web.id
GOOGLE_REDIRECT_URI=https://exisel.web.id/api/auth/google/callback
```

Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` menggunakan OAuth 2.0 Web
Client milik project Google Cloud EXISEL. Pada Google Cloud, Authorized redirect
URI harus sama persis dengan nilai `GOOGLE_REDIRECT_URI` di atas. Biarkan
`GOOGLE_ALLOWED_EMAIL_DOMAIN` kosong jika siswa memakai akun Gmail pribadi.
Panduan lengkap tersedia di [`GOOGLE_LOGIN.md`](./GOOGLE_LOGIN.md).

Isi konfigurasi Cloudflare Turnstile:

```dotenv
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAA...
TURNSTILE_EXPECTED_HOSTNAME=exisel.web.id
TURNSTILE_ENABLED=true
TURNSTILE_SITEVERIFY_TIMEOUT_MS=5000
```

Flag integrasi Go Core (bawaan sudah benar, biarkan apa adanya kecuali perlu darurat):

```dotenv
# true  = scan kehadiran diproses exisel-core (Next.js jadi fallback otomatis).
USE_GO_ATTENDANCE=true
# false sampai validasi sesi via Go selesai diuji.
USE_GO_SESSION_VALIDATE=false
```

`SESSION_SECRET` dipakai bersama oleh Next.js dan Go Core untuk token dan cookie
sesi (`exisel_session`), jadi cukup satu nilai yang sama untuk keduanya.
Compose sudah merakit `DATABASE_URL` dan `REDIS_URL` core secara otomatis,
jadi tidak perlu diisi di `.env.production`.

Jangan commit `.env.production` dan jangan mengirim isinya melalui chat.

## 7. Opsional tetapi disarankan: pindahkan akun dari database lokal

Di komputer lokal, buat dump PostgreSQL langsung di dalam container lalu copy
ke folder privat:

```powershell
New-Item -ItemType Directory -Force private | Out-Null
docker compose exec database pg_dump -U exisel -d exisel -Fc -f /tmp/exisel-production.dump
docker compose cp database:/tmp/exisel-production.dump ./private/exisel-production.dump
docker compose exec database rm -f /tmp/exisel-production.dump
scp ./private/exisel-production.dump <SSH_USER>@208.84.100.133:/opt/exisel/private/exisel-production.dump
```

Di VPS, nyalakan database saja dan restore dump:

```bash
cd /opt/exisel
mkdir -p private
chmod 700 private
chmod 600 private/exisel-production.dump

sudo docker compose --env-file .env.production -f compose.production.yml up -d database
sudo docker compose --env-file .env.production -f compose.production.yml cp \
  private/exisel-production.dump database:/tmp/exisel-production.dump
sudo docker compose --env-file .env.production -f compose.production.yml exec -T database \
  pg_restore --clean --if-exists --no-owner --no-privileges \
  -U exisel -d exisel /tmp/exisel-production.dump
sudo docker compose --env-file .env.production -f compose.production.yml exec -T database \
  rm -f /tmp/exisel-production.dump
```

Dump berisi data siswa dan hash password. Simpan secara privat, transfer hanya
melalui SSH/SCP, dan jangan masukkan dump ke GitHub.

Kalau memulai dari database kosong (tanpa dump), buat satu akun admin/guru
setelah langkah 8 selesai. Contoh (ubah email dan password):

```bash
sudo docker compose --env-file .env.production -f compose.production.yml exec -T database \
  psql -U exisel -d exisel -c \
  "INSERT INTO users (id, email, name, password_hash, role, status, is_active, must_change_password, created_at, updated_at)
   VALUES (gen_random_uuid(), 'guru@exisel.web.id', 'Admin Guru EXISEL',
           crypt('GANTI_DENGAN_PASSWORD_KUAT', gen_salt('bf')),
           'ADMIN', 'APPROVED', TRUE, TRUE, now(), now());"
```

Hash `crypt(gen_salt('bf'))` PostgreSQL BUKAN format argon2 yang dipakai
aplikasi login, jadi perlakukan akun ini sebagai akun darurat sementara dan
ganti dengan akun admin yang dibuat lewat mekanisme aplikasi resmi begitu
tersedia, atau seed akun dari dump database lokal.

## 8. Deploy aplikasi dan SSL

```bash
cd /opt/exisel
chmod +x scripts/deploy-production.sh
sudo ENV_FILE=/opt/exisel/.env.production ./scripts/deploy-production.sh
```

Skrip ini menjalankan `docker compose config --quiet`, pull image `database`,
`caddy`, dan `redis`, build image `migrate`, `app`, dan `exisel-core`, lalu
`up -d --remove-orphans`. Alur startup yang dijamin compose:
`database` sehat → `migrate` selesai → `redis` sehat → `exisel-core` + `app`
sehat → `caddy` mulai.

Periksa status dan log:

```bash
sudo docker compose --env-file .env.production -f compose.production.yml ps
sudo docker compose --env-file .env.production -f compose.production.yml logs --tail=100 app
sudo docker compose --env-file .env.production -f compose.production.yml logs --tail=100 exisel-core
sudo docker compose --env-file .env.production -f compose.production.yml logs --tail=100 caddy
```

Jika DNS dan firewall benar, log Caddy akan menunjukkan sertifikat berhasil
diterbitkan. HTTP otomatis diarahkan ke HTTPS.

## 9. Verifikasi HTTPS origin sebelum mengaktifkan proxy Cloudflare

```bash
curl -I http://exisel.web.id
curl -I https://exisel.web.id
curl -sS https://exisel.web.id/login >/dev/null && echo "HTTPS OK"
curl -sS https://exisel.web.id/api/core/v1/health
```

Health check core harus mengembalikan `{"status":"ok",...}`. Periksa juga dari
browser:

1. `https://exisel.web.id` terbuka tanpa peringatan sertifikat.
2. Ikon gembok aktif dan sertifikat mencantumkan `exisel.web.id`.
3. Login siswa dan admin berhasil.
4. Cookie `exisel_session` memiliki `Secure`, `HttpOnly`, dan `SameSite=Lax`.
5. Kamera QR dapat meminta izin karena halaman sudah berada pada secure context.
6. Scan QR kehadiran benar-benar tercatat (fitur Go Core aktif).
7. Port `3000`, `8080`, `6379`, dan `5432` tidak dapat diakses dari internet.

## 10. Aktifkan Cloudflare secara aman

Setelah `https://exisel.web.id` sudah berhasil saat record masih **DNS only**:

1. Buka **SSL/TLS > Overview** di Cloudflare.
2. Pilih mode enkripsi **Full (strict)**. Jangan gunakan **Flexible** karena
   koneksi Cloudflare ke Caddy harus tetap HTTPS dan sertifikat origin harus
   divalidasi.
3. Kembali ke **DNS > Records**, edit record A `@`, lalu ubah **Proxy status**
   menjadi **Proxied** (awan oranye).
4. Tunggu beberapa menit, kemudian ulangi pemeriksaan HTTPS.
5. **Always Use HTTPS** di Cloudflare boleh diaktifkan setelah verifikasi.
   Caddy juga sudah melakukan redirect HTTP ke HTTPS, jadi fitur ini bukan
   syarat agar aplikasi aman.
6. Jangan membuat Cache Rule **Cache Everything** untuk aplikasi ini karena
   halaman login, dashboard, API, dan data kehadiran bersifat dinamis.

Verifikasi setelah proxy aktif:

```bash
curl -I https://exisel.web.id
curl -sS https://exisel.web.id/login >/dev/null && echo "Cloudflare HTTPS OK"
curl -sS https://exisel.web.id/api/core/v1/health >/dev/null && echo "Core OK"
```

Jika muncul Cloudflare `526`, origin certificate belum valid atau mode
**Full (strict)** diaktifkan sebelum Caddy selesai memperoleh sertifikat.
Kembalikan record sementara ke **DNS only**, periksa log Caddy, selesaikan
masalah sertifikat, lalu aktifkan proxy lagi. Jangan menurunkan mode ke
Flexible sebagai jalan pintas.

## 11. Update release berikutnya (deploy ulang)

Jalankan setiap kali ada perubahan baru di `main`:

```bash
cd /opt/exisel
git fetch origin
git checkout main
git pull --ff-only origin main
sudo ENV_FILE=/opt/exisel/.env.production ./scripts/deploy-production.sh
```

Skrip deploy otomatis build ulang image yang berubah (Next.js, Go Core),
menjalankan migrasi Prisma, lalu `up -d` mengganti container lama dengan yang
baru. Karena `app` dan `exisel-core` punya `restart: unless-stopped` dan
healthcheck, container akan di-restart sendiri jika crash. Database dan
volume tidak tersentuh oleh langkah ini.

Sebelum update yang mengandung migrasi database, buat backup dulu
(lihat bagian Backup di bawah).

## 12. Darurat: matikan fitur Go Core

Jika `exisel-core` bermasalah dan scan kehadiran harus tetap jalan lewat
Next.js tanpa menunggu deploy baru:

```bash
cd /opt/exisel
sed -i 's/^USE_GO_ATTENDANCE=.*/USE_GO_ATTENDANCE=false/' .env.production
sudo docker compose --env-file .env.production -f compose.production.yml up -d app
```

Handler Next.js akan memproses scan langsung. Kembalikan ke `true` setelah
core diperbaiki:

```bash
sed -i 's/^USE_GO_ATTENDANCE=.*/USE_GO_ATTENDANCE=true/' .env.production
sudo docker compose --env-file .env.production -f compose.production.yml up -d app
```

## Backup database production

Buat backup manual sebelum migrasi atau eksimen berisiko:

```bash
cd /opt/exisel
mkdir -p private/backups
sudo docker compose --env-file .env.production -f compose.production.yml exec database \
  pg_dump -U exisel -d exisel -Fc -f /tmp/exisel-$(date +%F-%H%M).dump
sudo docker compose --env-file .env.production -f compose.production.yml cp \
  database:/tmp/exisel-$(date +%F-%H%M).dump private/backups/
sudo docker compose --env-file .env.production -f compose.production.yml exec database \
  rm -f /tmp/exisel-$(date +%F-%H%M).dump
```

Jadwalkan backup harian otomatis lewat cron (jalankan `crontab -e`, tambah):

```cron
0 2 * * * cd /opt/exisel && docker compose --env-file .env.production -f compose.production.yml exec -T database pg_dump -U exisel -d exisel -Fc -f /opt/exisel/private/backups/exisel-$(date +\%F).dump && find /opt/exisel/private/backups -name 'exisel-*.dump' -mtime +14 -delete
```

Copy hasil dump keluar VPS secara berkala, simpan terenkripsi di lokasi
berbeda, dan uji restore secara berkala:

```bash
sudo docker compose --env-file .env.production -f compose.production.yml exec -T database \
  pg_restore --clean --if-exists --no-owner --no-privileges \
  -U exisel -d exisel /tmp/nama-file.dump
```

## Restore backup

```bash
cd /opt/exisel
sudo docker compose --env-file .env.production -f compose.production.yml cp \
  private/backups/exisel-YYYY-MM-DD.dump database:/tmp/restore.dump
sudo docker compose --env-file .env.production -f compose.production.yml exec -T database \
  pg_restore --clean --if-exists --no-owner --no-privileges \
  -U exisel -d exisel /tmp/restore.dump
sudo docker compose --env-file .env.production -f compose.production.yml exec -T database \
  rm -f /tmp/restore.dump
```

## Rollback source

Jika rilis baru bermasalah, kembali ke commit sebelumnya:

```bash
cd /opt/exisel
git log --oneline -10
git checkout <COMMIT_SEBELUMNYA>
sudo ENV_FILE=/opt/exisel/.env.production ./scripts/deploy-production.sh
```

Rollback source tidak otomatis mengembalikan skema atau data database. Backup
database harus dibuat sebelum setiap perubahan migrasi. Setelah rollback
ke commit sebelum suatu migrasi dibuat, jangan menjalankan migrasi baru
yang maju sampai diputuskan strategi migrasi yang aman (misalnya restore
backup database ke kondisi sebelum migrasi).

## Troubleshooting umum

**`curl https://exisel.web.id` gagal / sertifikat tidak terbit.**
Periksa: DNS mengarah ke IP VPS (`dig +short A exisel.web.id`), firewall
membuka 80/443, dan record masih **DNS only** selama penerbitan pertama.
Lihat log: `sudo docker compose --env-file .env.production -f compose.production.yml logs caddy`.

**Cloudflare 526.** Mode **Full (strict)** aktif tapi origin Caddy belum
punya sertifikat valid. Kembalikan ke DNS only, cek log Caddy, terbitkan
ulang, lalu aktifkan proxy lagi.

**Halaman 502 dari Caddy.** Container `app` belum sehat atau mati.
Cek `docker compose ... ps` dan `docker compose ... logs app`. Healthcheck
`app` membuka `http://127.0.0.1:3000/login`; jika itu gagal, masalahnya
biasanya database atau variabel lingkungan yang hilang (compose akan menolak
start dan menyebut variabel yang kosong).

**`/api/core/*` mengembalikan 502 tapi halaman lain normal.** `exisel-core`
mati atau belum siap. Cek `docker compose ... logs exisel-core`. Karena
`USE_GO_ATTENDANCE=true` punya fallback otomatis ke Next.js, scan kehadiran
tetap berfungsi selama `app` sehat — tapi route `/api/core/*` sendiri tetap
502 sampai core pulih.

**Scan kehadiran lambat / timeout.** Timeout core di Next.js diatur 5 detik
(lihat `src/lib/core-api/client.ts`). Cek log core dan Redis:
`docker compose ... logs redis`. Redis down tidak mematikan core (graceful
fallback ke PostgreSQL), tapi rate-limit accelerator berhenti.

**Migrasi gagal saat deploy.** Lihat
`sudo docker compose --env-file .env.production -f compose.production.yml logs migrate`.
Compose menahan `app` dan `exisel-core` sampai `migrate` selesai
(`service_completed_successfully`), jadi jangan menyalakan keduanya manual
sebelum migrasi beres.

## Pemeliharaan berkala

- `sudo docker system prune -f` sebulan sekali untuk membersihkan image lama (jangan tambahkan flag `-a --volumes`).
- `sudo docker compose --env-file .env.production -f compose.production.yml ps` setiap hari untuk memastikan semua container sehat.
- Uji restore backup sebulan sekali dari dump terbaru.
- Cek pembaruan image base (`postgres:16-alpine`, `caddy:2.11.4-alpine`, `redis:7-alpine`, `node:22-bookworm-slim`, `golang:1.26-alpine`) secara berkala untuk patch keamanan.
