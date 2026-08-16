import { extracurricularKeywordDataset } from "../chatbot/eskul-keyword-dataset";

export function buildEksibotContext(): string {
  const summary = extracurricularKeywordDataset
    .map((e) => {
      const schedule = e.schedule ? `${e.schedule.label} (${e.schedule.time})` : "Belum ditentukan";
      return `- Ekskul: ${e.name}
  Kategori: ${e.category}
  Deskripsi: ${e.description}
  Jadwal: ${schedule}
  Lokasi: ${e.location || "Sekolah"}
  Kapasitas/Kuota: ${e.capacity} siswa
  Cara Pendaftaran: ${e.registration}`;
    })
    .join("\n\n");

  const systemFaq = `
INFORMASI SISTEM EXISEL (SMKN 69 JAKARTA):
1. Apa itu EXISEL: Sistem Informasi & Manajemen Ekstrakurikuler di SMK Negeri 69 Jakarta.
2. Alur Pendaftaran Ekskul:
   - Login menggunakan akun siswa (atau Akun Google yang terdaftar).
   - Masuk ke menu "Jelajahi Ekskul" / Katalog Ekstrakurikuler.
   - Pilih ekstrakurikuler yang diminati.
   - Klik "Daftar Sekarang", cek identitas NIS & Kelas, lalu submit pendaftaran.
   - Pendaftaran berstatus APPROVED (terdaftar) atau PENDING jika butuh verifikasi kuota.
3. Presensi / Kehadiran Siswa:
   - Kehadiran dilakukan pada hari kegiatan ekskul.
   - Siswa bisa mengisi status "Hadir" melalui Scan QR yang ditampilkan oleh Pembina/Admin ekskul di layar proyektor/HP.
   - Atau memilih "Izin" dengan menyertakan alasan jelas (minimal 5 karakter).
   - Presensi hanya dapat disubmit 1 kali per hari kegiatan dan tidak dapat diubah setelah terkirim.
4. Fitur Community:
   - Forum & papan pengumuman resmi setiap channel ekstrakurikuler.
   - Tempat pembina membagikan materi, jadwal latihan tambahan, dan lampiran file/foto kegiatan.
5. Profil & Keamanan Akun:
   - Siswa dapat memperbarui foto profil dan kata sandi di halaman Profil.
   - Tersedia tombol Keluar (Logout) aman di navbar pojok kanan atas.
`;

  return `${systemFaq}\n\nDAFTAR EKSTRAKURIKULER:\n${summary}`;
}
