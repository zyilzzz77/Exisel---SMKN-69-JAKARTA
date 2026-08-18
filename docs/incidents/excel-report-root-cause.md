# Incident: Ringkasan sheet kosong pada export kehadiran Excel (.xlsx)

- **Komponen**: `src/lib/attendance/excel-export.ts` (pembuat workbook), dipanggil dari
  `src/app/(admin)/admin/kehadiran/export/route.ts`, metrik dihitung di
  `src/lib/attendance/report.ts` (`getAttendanceProgramReports`).
- **Impact**: Sheet **Ringkasan** pada laporan kehadiran menunjukkan sel kosong
  untuk seluruh metrik — kartu ringkasan baris 5 (Anggota, Agenda, Jumlah hadir,
  Izin, Tidak hadir, Tingkat kehadiran) dan kolom metrik per siswa E–J mulai
  baris 9 — pada semua viewer yang tidak melakukan kalkulasi ulang (Google
  Sheets, LibreOffice, preview mobile, dsb.). Sheet Rekap Kehadiran tetap
  terisi, sehingga laporan tampak "setengah rusak".
- **Penyebab utama**: seluruh sel metrik Ringkasan ditulis sebagai **formula
  dengan awalan `=` di dalam string formula**, yang menghasilkan OOXML
  `<f>` tidak valid (`=` tidak boleh menjadi konten `<f>`). Ditambah tidak ada
  cached `result` dan tidak ada hint `fullCalcOnLoad`, sehingga sheet tampil
  kosong di semua viewer non-recalc.
- **Fix**: Ringkasan (stat cards + metrik per siswa) kini ditulis sebagai
  **nilai literal** yang sudah dihitung sekali di `report.ts` (kontrak DTO
  diperluas). Rekap juga memakai literal yang sama agar konsisten antar viewer.

## CONFIRMED ROOT CAUSE

1. **String formula berawalan `=`**. ExcelJS menulis `cell.value = { formula }`
   apa adanya ke dalam `<f>`. OOXML mensyaratkan konten `<f>` TANPA `=`.
   Semua sel metrik Ringkasan ditulis dengan `=` di depan:
   - Stat cards baris 5: `excel-export.ts:500, 507, 514, 521, 528, 535`
   - Metrik per siswa E–J baris 9+: `excel-export.ts:606, 610, 614, 618, 622, 627`
   Contoh sel yang dihasilkan (dari XML `.xlsx` aktual, lihat EVIDENCE):
   `<c r="A5" s="4"><f>=COUNTA('Rekap Kehadiran'!$C$5:$C$5)</f></c>`.

2. **Tanpa cached result dan tanpa `fullCalcOnLoad`**. Semua sel formula
   Ringkasan di-emit hanya sebagai `<f>` tanpa `<v>` (nilai hasil hitung).
   Viewer tanpa engine kalkulasi (non-Excel) tidak bisa mengevaluasi formula,
   jadi sel dirender kosong.

3. **DTO writer tidak membawa metrik yang sudah dihitung**. `report.ts`
   (`:271-277`, `:298-307`) sudah menghitung per-member `present/excused/absent/
   missing/totalAgenda/attendanceRate/activityLevel` dan blok `summary`, dan
   route sudah menyebar seluruh report ke payload (`route.ts:86-90`). Namun
   tipe writer `AttendanceExportMember/AttendanceExportReport`
   (`excel-export.ts:16-34`) tidak memuat field-field itu, sehingga Ringkasan
   tidak punya nilai literal sebagai fallback — satu-satunya jalur keluar
   adalah formula, dan formula itu sendiri invalid (poin 1-2).

## EVIDENCE

Dua workbook dibangkitkan dari fixture identik (1 ekskul "Basket", anggota
siswa dengan hadir=3, izin=1, absen=0, rate 0.75):

- `output/kehadiran-before.xlsx` — writer pada `HEAD` (sebelum fix).
- `output/kehadiran-after.xlsx` — writer setelah fix.
- Generator bukti: `output/compare-export.mjs` (jalankan `npx tsx output/compare-export.mjs`).

**BEFORE — sheet Ringkasan (`xl/worksheets/sheet1.xml`), 12 sel `<f>` tanpa `<v>`, awalan `=`:**

```xml
<c r="A5" s="4"><f>=COUNTA(&apos;Rekap Kehadiran&apos;!$C$5:$C$5)</f></c>
<c r="C5" s="4"><f>=COUNTA(&apos;Rekap Kehadiran&apos;!$F$4:$I$4)</f></c>
<c r="E5" s="4"><f>=SUM(&apos;Rekap Kehadiran&apos;!$J$5:$J$5)</f></c>
<c r="F5" s="4"><f>=SUM(&apos;Rekap Kehadiran&apos;!$K$5:$K$5)</f></c>
<c r="G5" s="4"><f>=SUM(&apos;Rekap Kehadiran&apos;!$L$5:$L$5)</f></c>
<c r="H5" s="5"><f>=IF(SUM(&apos;Rekap Kehadiran&apos;!$M$5:$M$5)=0,0,E5/SUM(&apos;Rekap Kehadiran&apos;!$M$5:$M$5))</f></c>
<c r="E9" s="7"><f>=&apos;Rekap Kehadiran&apos;!J5</f></c>
<c r="F9" s="7"><f>=&apos;Rekap Kehadiran&apos;!K5</f></c>
```

Setiap `<f>` di atas diawali karakter `=` — invalid menurut OOXML, dan tidak
ada pasangan `<v>` (no cached value) maupun calcChain/`fullCalcOnLoad`.

**BEFORE — sheet Rekap Kehadiran (`xl/worksheets/sheet2.xml`), formula TANPA `=` (valid) tapi tanpa `<v>`:**

```xml
<c r="J5" s="7"><f>COUNTIF(F5:I5,&quot;Hadir&quot;)</f></c>
```

**AFTER — sheet Ringkasan, seluruh metrik jadi literal `<v>`:**

```xml
<c r="A5" s="4"><v>1</v></c>        <!-- Anggota -->
<c r="C5" s="4"><v>4</v></c>        <!-- Agenda -->
<c r="E5" s="4"><v>3</v></c>        <!-- Jumlah hadir -->
<c r="F5" s="4"><v>1</v></c>        <!-- Izin -->
<c r="G5" s="4"><v>0</v></c>        <!-- Tidak hadir -->
<c r="H5" s="5"><v>0.75</v></c>     <!-- Tingkat kehadiran, numFmt style 5 = 0.0% -->
<c r="E9" s="7"><v>3</v></c>        <!-- Hadir siswa A -->
<c r="F9" s="7"><v>1</v></c>        <!-- Izin siswa A -->
<c r="G9" s="7"><v>0</v></c>        <!-- Tidak hadir siswa A -->
<c r="H9" s="7"><v>4</v></c>        <!-- Total agenda siswa A -->
<c r="I9" s="10"><v>0.75</v></c>    <!-- Rate siswa A, numFmt style 10 = 0.0% -->
<c r="J9" s="7" t="s"><v>18</v></c> <!-- Keaktifan siswa A -> sharedString "Aktif" -->
```

Jumlah sel `<f>` per sheet Ringkasan: BEFORE 12 → AFTER 0. `I9`/`H5` memakai
`numFmtId=164` (`formatCode="0.0%"`), nilai disimpan sebagai pecahan 0–1
(0.75 → tampil `75.0%`), persis seperti perilaku formula lama di dalam Excel.

## WHY REKAP WORKED

Sheet Rekap Kehadiran tetap terisi (di Excel) karena dua alasan:

1. Formula Rekap (`excel-export.ts:341-367`) ditulis **tanpa awalan `=`** —
   string-nya `COUNTIF(...)`, bukan `=COUNTIF(...)` — sehingga `<f>` yang
   dihasilkan valid secara OOXML. Excel mampu mengevaluasinya.
2. Sel status per tanggal (kolom F–I) pada Rekap ditulis sebagai **literal
   teks** ("Hadir"/"Izin"/"Tidak hadir"/"Belum mengisi"), bukan formula, jadi
   selalu tampil di semua viewer.

Metrik Rekap (kolom total/rate) memang tampil dengan benar di Excel, tetapi
tetap tanpa cached `<v>`; di viewer non-Excel kolom metrik Rekap ikut kosong.

## WHY DETAIL IZIN WORKED

Sheet Detail Izin murni literal, tidak pernah memakai formula maupun sel
berbasis kalkulasi: tanggal, NIS, nama, kelas, dan alasan izin semuanya
ditulis langsung sebagai value. Karena itu tampil konsisten di semua viewer.

## WHY RINGKASAN WAS EMPTY

Ringkasan adalah kebalikan dari Detail Izin: **seluruh sel metriknya adalah
formula**, dan formula itu rusak karena (1) string-nya diawali `=` (OOXML
invalid) dan (2) tidak ada cached `<v>` dan tidak ada `fullCalcOnLoad`. Viewer
yang mencoba mengevaluasi formula invalid gagal; viewer yang tidak menghitung
(sama sekali tidak tahu nilainya karena tidak ada `<v>`) menampilkan sel
kosong. Karena kedua kegagalan itu menimpa semua 30 sel metrik (stat cards
`E5/F5/...` dsb. bukan hanya satu kolom), seluruh metrik sheet tampil kosong
sekaligus — inilah gejala "Ringkasan sheet kosong".

`attendanceRate` di `report.ts` adalah **pecahan 0–1** (bukan persen 0–100),
dibuktikan oleh formula Rekap lama
`IF(totalAgenda=0,0,present/totalAgenda)` dan label rate, sehingga numFmt
`0.0%` yang sudah ada tetap benar dan tidak perlu diubah.

## FIX

Arsitektur yang dibenarkan: **fakta DB → `report.ts` menghitung sekali →
writer menulis SEMUA sheet dari satu kontrak DTO yang sama**. Tidak ada
per-sheet re-derivation formula lagi.

1. **Extend DTO** (`excel-export.ts`): `AttendanceExportMember` kini membawa
   `present/excused/absent/missing/totalAgenda/attendanceRate/activityLevel`,
   dan `AttendanceExportReport` membawa blok `summary`
   (`members/agenda/present/excused/absent/missing/totalExpected/attendanceRate`)
   — nama field identik dengan yang dihasilkan `getAttendanceProgramReports`
   (`report.ts`), bukan nama baru. Field baru bersifat **opsional**, sehingga
   payload route yang menyebar `...report` (`route.ts:86-90`) tetap valid
   **tanpa perubahan kode**.
2. **Ringkasan jadi literal**: stat cards baris 5 dan metrik per siswa E–J
   (baris 9+) ditulis sebagai nilai literal dari payload (atau fallback
   deterministik dari `statuses` bila payload lebih sempit). ExcelJS tidak
   punya engine formula server-side → literal adalah perbaikan root-cause yang
   benar. NumFmt `0.0%` dipertahankan; rate dinormalisasi (nilai > 1 dianggap
   persen lalu dibagi 100) supaya render benar di semua kondisi.
3. **Rekap jadi literal juga**: metrik per row (total/rate/keaktifan) kini
   memakai `memberMetrics(...)` yang sama dengan Ringkasan, dan label per
   tanggal serta semua styling tetap tidak diubah. Ini menjamin konsistensi
   antar-seller dan menghilangkan dependensi recalc. Hasil tampilan identik.
4. **Detail Izin tidak berubah** (selain type yang di-extend).
5. **Styling/layout/print/header-footer/empty-state semua dipertahankan**.
6. **Zero agenda / data kosong**: tidak ada pembagian nol, tidak ada NaN;
   metrik nol ditulis literal 0. Keaktifan memakai label "Belum ada agenda".
   Member dengan NIS/className null tetap memakai fallback "-".
   `activityLevelFor` meniru `getActivityLevel` di `report.ts` (label,
   ambang, dan urutan sama persis).

## REGRESSION TEST

`src/lib/attendance/excel-export.test.ts` (jalankan
`npx tsx --test src/lib/attendance/excel-export.test.ts`):

1. **Ringkasan menampilkan metrik literal anggota, kartu ringkasan, Rekap, dan Detail Izin** —
   fixture utama 1 ekskul (Basket), 3 members, 4 agenda:
   A (hadir 3/izin 1/absen 0), B (2/0/2), C (0/1/3, NIS/kelas null).
   Membaca kembali buffer aktual dengan `workbook.xlsx.load` lalu mengassert
   pada value sel yang dimuat (bukan objek TS): kartu stat + nilai siswa
   per kolom E–J, numFmt `0.0%`, Rekap (label per tanggal + fill warna +
   total literal), Detail Izin (2 entri dengan alasan/tanggal tepat),
   invariants antar-sheet (SUM Ringkasan.Hadir == jumlah label "Hadir" di
   Rekap; SUM Ringkasan.Izin == jumlah entri Detail Izin), tidak ada sel
   NaN/undefined/`[object Object]`, dan tidak ada sel formula tersisa.
2. **laporan Excel memiliki blok tanda tangan dan pengaturan cetak A4** — kept.
3. **nol agenda** — tanpa pembagian nol, kartu agenda 0, keaktifan
   "Belum ada agenda".
4. **NIS dan kelas null** — fallback "-" di Ringkasan & Rekap.
5. **semua sesi tidak terisi (missing)** — payload sempit, metrik diturunkan
   dari `statuses`, tanpa NaN.
6. **semua hadir** — rate 100% (1.0), keaktifan "Sangat aktif".
7. **semua tidak hadir** — izin/absen literal, Detail Izin kosong
   ("Belum ada catatan izin.").

## ACTUAL GENERATED XLSX PASS/FAIL

- **BEFORE (HEAD)**: **FAIL** — Ringkasan `<f>` berawalan `=` (12 sel), tanpa
  `<v>`, tanpa `fullCalcOnLoad` → metrik kosong di viewer non-recalc.
  Lihat blok EVIDENCE di atas.
- **AFTER (fix)**: **PASS** — Ringkasan 0 sel formula, semua metrik literal
  `<v>`, numFmt `0.0%` terikat pada `I9`/`H5`, Keaktifan = sharedString
  "Aktif". Verifikasi oleh 7 unit test yang membaca bytes aktual (7 pass, 0 fail).

Run verification (verbatim):

```
$ pnpm typecheck
> exisel-app@0.1.0 typecheck …
> tsc --noEmit
(exit 0 — no output)

$ npx tsx --test src/lib/attendance/excel-export.test.ts
✔ Ringkasan menampilkan metrik literal anggota, kartu ringkasan, Rekap, dan Detail Izin
✔ laporan Excel memiliki blok tanda tangan dan pengaturan cetak A4
✔ nol agenda: tanpa pembagian nol, kartu agenda 0, dan keaktifan 'Belum ada agenda'
✔ NIS dan kelas null memakai fallback '-' di Ringkasan dan Rekap
✔ semua sesi tidak terisi (missing): metrik nol dihitung dari statuses tanpa NaN
✔ semua hadir: rate 100% dan keaktifan 'Sangat aktif'
✔ semua tidak hadir: izin/tidak hadir literal dan Detail Izin kosong
ℹ tests 7  pass 7  fail 0
```
