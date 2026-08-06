# Aktivasi PostgreSQL EXISEL

Skema, migrasi, dan SQL impor akun sudah siap. Lakukan langkah berikut setelah
memiliki password role PostgreSQL yang sah.

1. Buat database kosong bernama `exisel` melalui pgAdmin atau `createdb`.
2. Salin `.env.example` menjadi `.env.local`.
3. Isi `DATABASE_URL` dengan host, port, database, user, dan password PostgreSQL.
4. Isi `SESSION_SECRET` dengan nilai acak minimal 32 karakter.
5. Jalankan migrasi dan impor:

```powershell
pnpm db:migrate
pnpm db:import:students
```

Perintah impor menjalankan data akun dan backfill NIS privat secara berurutan.
NIS disimpan sebagai identifier siswa agar dapat mengisi formulir pendaftaran,
sedangkan password tetap hanya disimpan sebagai hash Argon2id.

Pendaftaran ekskul yang lolos validasi session, duplikasi, dan kapasitas
langsung disimpan dengan status `APPROVED`; siswa dapat hadir sesuai jadwal
tanpa menunggu persetujuan manual.

Kehadiran hanya dapat diisi siswa pada hari jadwal ekskulnya melalui
`/kehadiran`. Pilihan `Hadir` atau `Izin` (dengan alasan wajib) disimpan ke tabel
`attendances` dan dapat dipantau admin/guru melalui `/admin/dashboard`.

Setiap siswa hanya dapat mengirim satu absensi untuk satu ekskul pada satu
tanggal. Setelah berhasil, form dikunci dan data tidak dapat diubah atau dikirim
ulang. Menu kehadiran hanya menampilkan ekskul `APPROVED` yang benar-benar
terjadwal pada hari Jakarta saat ini.

Saat hari jadwal sudah lewat, sistem merekonsiliasi enrollment yang belum
mempunyai catatan dan menyimpannya sebagai `ABSENT` (`Tidak hadir`) secara
otomatis. Rekonsiliasi bersifat idempotent dan dibatasi oleh unique constraint
siswa, ekskul, dan tanggal.

Untuk membuat akun admin/guru lokal pertama kali, jalankan:

```powershell
pnpm db:local:create-admin
```

Kredensial acak disimpan hanya di
`private/admin-initial-credentials.txt` dan diabaikan Git. Jangan menyalin
password tersebut ke dokumentasi, log, atau repository.

6. Buka `http://localhost:3000/login`, lalu masuk memakai email e-Learning dan
   NIS pada workbook sebagai password awal.

File `private/imports/xi-sija-1-users.sql` berisi data privat siswa dan sengaja
diabaikan Git. Jangan mengunggah, membagikan, atau memindahkannya ke folder
publik.

## Database lokal proyek

Untuk pengembangan di komputer ini, EXISEL memakai instance PostgreSQL khusus
proyek pada `127.0.0.1:5433`. Data fisiknya berada di folder `private/` dan tidak
masuk Git.

Setelah Windows direstart, hidupkan database sebelum menjalankan aplikasi:

```powershell
pnpm db:local:start
pnpm dev
```

Untuk menghentikan database lokal:

```powershell
pnpm db:local:stop
```

Instance ini hanya untuk development lokal. Production harus memakai database
terkelola, password kuat, TLS, dan `SESSION_SECRET` acak tersendiri.
