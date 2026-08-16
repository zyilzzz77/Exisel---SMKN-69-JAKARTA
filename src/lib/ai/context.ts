import { extracurricularKeywordDataset } from "../chatbot/eskul-keyword-dataset";

export function buildEksibotContext(): string {
  const summary = extracurricularKeywordDataset
    .map((e) => {
      const schedule = e.schedule ? `${e.schedule.label} (${e.schedule.time})` : "Belum ditentukan";
      return `- Ekskul: ${e.name} (${e.slug.toUpperCase()})
  Kategori: ${e.category}
  Deskripsi: ${e.description}
  Jadwal: ${schedule}
  Lokasi Latihan: ${e.location || "Lingkungan Sekolah"}
  Kapasitas/Kuota: ${e.capacity} siswa
  Cara Pendaftaran: ${e.registration}`;
    })
    .join("\n\n");

  const systemFaq = `
INFORMASI SEKOLAH & SISTEM EXISEL:
1. Sekolah: SMKN 69 Jakarta (sering disingkat NAMSEL).
   - Alamat / Lokasi: Jl. Swadaya No.4, RW.7, Jatinegara, Kec. Cakung, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13930.
   - Singkatan Populer: Namsel (Enam Sembilan), EC (English Club), ITC (Information Technology Club), PMR (Palang Merah Remaja).
2. Apa itu EXISEL: Sistem Informasi & Manajemen Ekstrakurikuler di SMK Negeri 69 Jakarta (Namsel).
3. Alur Pendaftaran Ekskul:
   - Login menggunakan akun siswa (atau Akun Google yang terdaftar).
   - Masuk ke menu "Jelajahi Ekskul" / Katalog Ekstrakurikuler (/ekstrakurikuler).
   - Pilih ekstrakurikuler yang diminati (misalnya English Club / EC, PMR, Basket, ITC, Nihon, Paskibra, Futsal, Pramuka).
   - Klik "Daftar Sekarang", cek identitas NIS & Kelas, lalu submit pendaftaran.
   - Pendaftaran berstatus APPROVED (terdaftar) atau PENDING jika butuh verifikasi kuota.
4. Presensi / Kehadiran Siswa:
   - Kehadiran dilakukan pada hari kegiatan ekskul.
   - Siswa bisa mengisi status "Hadir" melalui Scan QR yang ditampilkan oleh Pembina/Admin ekskul di layar proyektor/HP.
   - Atau memilih "Izin" dengan menyertakan alasan jelas (minimal 5 karakter).
   - Presensi hanya dapat disubmit 1 kali per hari kegiatan dan tidak dapat diubah setelah terkirim.
5. Fitur Community:
   - Forum & papan pengumuman resmi setiap channel ekstrakurikuler.
   - Tempat pembina membagikan materi, jadwal latihan tambahan, dan lampiran file/foto kegiatan.
6. Profil & Keamanan Akun:
   - Siswa dapat memperbarui foto profil dan kata sandi di halaman Profil (/profile).
   - Tersedia tombol Keluar (Logout) aman di navbar pojok kanan atas.
`;

  return `${systemFaq}\n\nDAFTAR EKSTRAKURIKULER:\n${summary}`;
}

