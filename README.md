# EXISEL

Aplikasi ekstrakurikuler SMKN 69 Jakarta berbasis Next.js, Prisma, dan PostgreSQL.

## Menjalankan dengan Docker (disarankan untuk produksi/demo)

Prasyarat: Docker Desktop sudah terpasang dan sedang berjalan.

1. Buat konfigurasi rahasia dari contoh yang tersedia:

   ```powershell
   Copy-Item .env.docker.example .env
   ```

2. Buka `.env`, lalu ganti `POSTGRES_PASSWORD` dan `SESSION_SECRET`. Nilai
   `SESSION_SECRET` harus berupa string acak minimal 32 karakter. Untuk
   `POSTGRES_PASSWORD`, gunakan karakter alfanumerik agar aman dipakai di URL
   koneksi PostgreSQL.

3. Bangun dan jalankan seluruh layanan:

   ```powershell
   docker compose up --build -d
   ```

4. Buka <http://localhost:3000>. Jika `APP_PORT` diubah, gunakan port tersebut.

Migrasi Prisma berjalan otomatis setelah PostgreSQL siap dan sebelum aplikasi
dimulai. Data PostgreSQL disimpan dalam volume `postgres_data` yang dikelola
Compose, sehingga tetap tersedia setelah container dihentikan.

### Perintah Docker yang berguna

```powershell
# Melihat status container
docker compose ps

# Melihat log aplikasi
docker compose logs -f app

# Menghentikan container tanpa menghapus data
docker compose down

# Menjalankan ulang setelah kode berubah
docker compose up --build -d
```

Untuk menghapus container **beserta seluruh data database**, gunakan
`docker compose down --volumes`. Perintah ini tidak dapat dipulihkan, jadi
pastikan data sudah dicadangkan.

## Menjalankan secara lokal tanpa Docker

Siapkan PostgreSQL dan `.env.local`, kemudian jalankan:

```powershell
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Buka <http://localhost:3000>.
