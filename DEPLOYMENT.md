# Deployment production EXISEL

Target production:

- Domain: `exisel.web.id`
- VPS: `208.84.100.133` (`ip-208-84-100-133.my-advin.com`)
- Runtime: Docker Compose
- TLS/reverse proxy: Caddy
- Database: PostgreSQL dalam jaringan internal Docker

## Arsitektur dan keamanan

Hanya container Caddy yang memublikasikan port host `80` dan `443`. Container
Next.js memakai `expose: 3000` pada jaringan Docker, sedangkan PostgreSQL tidak
memublikasikan port sama sekali. Caddy mengurus redirect HTTP ke HTTPS,
penerbitan sertifikat publik, dan pembaruan sertifikat otomatis.

Cookie sesi dipaksa memakai atribut `Secure`; aplikasi dijalankan sebagai user
non-root, capability Linux aplikasi dihapus, dan log Docker dibatasi ukurannya.

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
port `3000` atau `5432` ke internet.

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

Jangan commit `.env.production` dan jangan mengirim isinya melalui chat.

## 7. Opsional tetapi disarankan: pindahkan 36 akun dari database lokal

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

## 8. Deploy aplikasi dan SSL

```bash
cd /opt/exisel
chmod +x scripts/deploy-production.sh
sudo ENV_FILE=/opt/exisel/.env.production ./scripts/deploy-production.sh
```

Periksa status dan log:

```bash
sudo docker compose --env-file .env.production -f compose.production.yml ps
sudo docker compose --env-file .env.production -f compose.production.yml logs --tail=100 app
sudo docker compose --env-file .env.production -f compose.production.yml logs --tail=100 caddy
```

Jika DNS dan firewall benar, log Caddy akan menunjukkan sertifikat berhasil
diterbitkan. HTTP otomatis diarahkan ke HTTPS.

## 9. Verifikasi HTTPS origin sebelum mengaktifkan proxy Cloudflare

```bash
curl -I http://exisel.web.id
curl -I https://exisel.web.id
curl -sS https://exisel.web.id/login >/dev/null && echo "HTTPS OK"
```

Periksa juga dari browser:

1. `https://exisel.web.id` terbuka tanpa peringatan sertifikat.
2. Ikon gembok aktif dan sertifikat mencantumkan `exisel.web.id`.
3. Login siswa dan admin berhasil.
4. Cookie `exisel_session` memiliki `Secure`, `HttpOnly`, dan `SameSite=Lax`.
5. Kamera QR dapat meminta izin karena halaman sudah berada pada secure context.
6. Port `3000` dan `5432` tidak dapat diakses dari internet.

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
```

Jika muncul Cloudflare `526`, origin certificate belum valid atau mode
**Full (strict)** diaktifkan sebelum Caddy selesai memperoleh sertifikat.
Kembalikan record sementara ke **DNS only**, periksa log Caddy, selesaikan
masalah sertifikat, lalu aktifkan proxy lagi. Jangan menurunkan mode ke
Flexible sebagai jalan pintas.

## 11. Update release berikutnya

```bash
cd /opt/exisel
git fetch origin
git checkout main
git pull --ff-only origin main
sudo ENV_FILE=/opt/exisel/.env.production ./scripts/deploy-production.sh
```

## Backup database production

```bash
cd /opt/exisel
mkdir -p private/backups
sudo docker compose --env-file .env.production -f compose.production.yml exec database \
  pg_dump -U exisel -d exisel -Fc -f /tmp/exisel-$(date +%F-%H%M).dump
```

Copy hasil dump keluar container, simpan terenkripsi di lokasi berbeda dari
VPS, lalu hapus file sementara dalam container. Uji restore backup secara
berkala.

## Rollback source

```bash
cd /opt/exisel
git log --oneline -10
git checkout <COMMIT_SEBELUMNYA>
sudo ENV_FILE=/opt/exisel/.env.production ./scripts/deploy-production.sh
```

Rollback source tidak otomatis mengembalikan skema atau data database. Backup
database harus dibuat sebelum setiap perubahan migrasi.
