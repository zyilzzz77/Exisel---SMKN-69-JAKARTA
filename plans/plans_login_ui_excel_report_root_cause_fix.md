# EXISEL — Login UI Unification + Excel Report Empty-Summary Root Cause Fix

> **STATUS: EXECUTED — ALL ACCEPTANCE CRITERIA MET (2026-08-18)**
> Wave 1 (A1–A4 audit/forensik), Wave 2 (A5 login unification + A6 Excel fix), Wave 3 (A7 integration QA) selesai.
>
> ## CONFIRMED ROOT CAUSE (Excel, evidence-backed dari XML `.xlsx` hasil generate)
> Klasifikasi: **FORMULA (primary) + DTO_MAPPING (enabling)**
> 1. 30 sel metrik Ringkasan ditulis sebagai formula dengan prefix `=` di dalam konten `<f>` OOXML (`'=COUNTA(...)'`, `='Rekap Kehadiran'!G5` — excel-export.ts lama). OOXML `<f>` tidak boleh mengandung `=` → semua formula Ringkasan invalid. Formula Rekap tidak pakai `=` → Rekap terisi.
> 2. Tidak ada cached `result` dan tidak ada `fullCalcOnLoad` → `<f>` tanpa `<v>` → kosong di semua viewer yang tidak recompute.
> 3. DTO writer (`AttendanceExportMember/Report`) tidak membawa metrik precomputed yang sudah dihitung report.ts → tidak ada fallback literal.
>
> ## FIX
> Arsitektur: DB facts → report.ts hitung sekali → writer tulis literal semua sheet dari satu contract. Ringkasan stat cards + E–J dan metrik Rekap kini literal (numFmt `0.0%` dipertahankan, rate 0–1 fraction). Styling/workbook layout tidak diubah. route.ts & report.ts tanpa perubahan.
>
> ## LOGIN UI
> Admin login di-recut ke design system siswa (canonical): shell 1360px, split 0.95/1.05fr, card 620px radius 8px shadow 10px, input/CTA 58px, CTA hover/active states, H2 fluid clamp, breakpoints 1080/850/560, `#0b235f` → `var(--navy)`. Orange strip + navy poster dipertahankan sebagai aksen role. Auth behavior: 0 baris logika berubah.
>
> ## VERIFIKASI AKTUAL
> - `pnpm typecheck` PASS • `pnpm test:auth` 37/37 PASS • report tests 7/7 PASS • lint pada file yang diubah: bersih (sisa error lint pre-existing di file lain)
> - XLSX aktual via jalur produksi di-load ulang dengan exceljs + inspeksi XML mentah: Ringkasan metrik terisi (0 formula tersisa, 78 `<v>` di sheet1), cross-sheet totals konsisten (SUM Hadir == Rekap labels, SUM Izin == Detail Izin rows), no NaN/undefined, styling intact — **PASS**
> - Detail: `docs/incidents/excel-report-root-cause.md`, `docs/incidents/login-ui-unification.md`
> - Catatan QA non-blocking: Turnstile 304px vs card sempit di 360–384px adalah kondisi pre-existing yang identik di kedua login (bukan regresi).

## Tujuan

Selesaikan dua masalah secara root-cause-first:

1. UI/UX login Admin/Guru dan Siswa jomplang.
2. Bug fatal Excel: sheet Ringkasan kosong, sementara Rekap dan Detail Izin berisi data.

Target bukan patch kosmetik. Trace source data sampai workbook output, lalu fix akar masalah.

---

# Orkestrasi Subagent

## Wave 1 — Investigation Parallel
- A1: audit UI login siswa
- A2: audit UI login admin/guru
- A3: forensic data pipeline Excel
- A4: forensic workbook writer/template

## Wave 2 — Fix Parallel
- A5: login UI unification
- A6: Excel root-cause fix

## Wave 3 — Integration / QA
- A7: regression + visual QA + generated XLSX verification

Strict file ownership. Jangan dua agent edit file yang sama.

---

# Ground Truth dari Screenshot

## Login siswa
Karakter:
- editorial / neo-brutalist
- hero cobalt besar
- login card polished
- header lavender
- black border tebal
- offset shadow
- CTA Google jelas
- orange accent konsisten

## Login Admin/Guru
Masalah:
- card kanan terlihat lebih kecil dan kaku
- hero kiri terlalu dominan
- spacing/typography tidak satu hierarchy dengan student login
- Turnstile terasa ditempel
- top nav dan form rhythm berbeda rasa

Target:
```text
same EXISEL design system
different role personality
```

Student:
```text
friendly / onboarding
```

Admin:
```text
monitoring / authorized / operational
```

Shared:
- max width
- hero/card ratio
- border
- shadow
- header strip
- spacing scale
- typography scale
- input height
- CTA height
- responsive breakpoint

---

# Bug Excel — Known Symptom

Observed:
```text
Sheet Ringkasan:
- title/header ada
- struktur tabel ada
- daftar siswa ada
- angka/metrik attendance kosong

Sheet Rekap:
- ada data

Sheet Detail Izin:
- ada data
```

Artinya file generation tidak sepenuhnya gagal.

Trace:
```text
DB query
→ aggregation
→ normalized report DTO
→ worksheet population
→ formula/value mapping
→ formatting/merge
```

Jangan langsung isi blank dengan 0 sebelum root cause terbukti.

---

# Shared Report Contract

Freeze satu domain contract yang dipakai semua sheet.

Contoh konseptual:

```ts
type AttendanceReportSummary = {
  extracurricularId: string;
  extracurricularName: string;
  memberCount: number;
  agendaCount: number;
  totalPresent: number;
  totalExcused: number;
  totalAbsent: number;
  attendanceRate: number;
  members: Array<{
    userId: string;
    nis: string | null;
    name: string;
    className: string | null;
    present: number;
    excused: number;
    absent: number;
    totalAgenda: number;
    attendanceRate: number;
    activityLabel: string;
  }>;
};
```

Sesuaikan dengan domain existing. Jangan invent schema baru bila sudah ada contract yang benar.

Ringkasan, Rekap, Detail Izin tidak boleh drift karena masing-masing menghitung sendiri tanpa alasan.

---

# WAVE 1

## A1 — Student Login UI Auditor

### Ownership
Read-only:
```text
src/app/**login**
src/components/**login**
src/styles/**
src/app/globals.css
tailwind config jika ada
```

### Tugas
Catat tokens aktual:
```text
container width
hero/card ratio
card width
header height
border width
offset shadow
spacing
input height
button height
font sizes
accent usage
responsive behavior
```

Cari reusable components/tokens.

Output:
```text
docs/incidents/login-ui-student-audit.md
```

---

## A2 — Admin/Guru Login UI Auditor

### Ownership
Read-only:
```text
src/app/**admin**login**
src/app/**guru**login**
src/components/**admin**login**
src/components/**auth**
```

### Tugas
Bandingkan admin vs student:
```text
layout width
hero/card ratio
form alignment
Turnstile placement
CTA hierarchy
top navigation
responsive
```

Cari:
- duplicate styles
- hardcoded spacing
- typography divergence
- component divergence

Output:
```text
docs/incidents/login-ui-admin-audit.md
```

Buat tabel:
```text
Token          Student   Admin   Target
Card width     ...       ...     shared system
Border         ...       ...     shared
Shadow         ...       ...     shared
Input height   ...       ...     shared
CTA height     ...       ...     shared
```

---

## A3 — Excel Data Pipeline Forensic

### Ownership
Read-only:
```text
src/lib/**report**
src/lib/**attendance**
src/app/api/**report**
src/app/api/**export**
src/app/api/**excel**
prisma/schema.prisma
relevant repositories/services
```

### Trace wajib
```text
admin report page
→ download action
→ API route
→ report service
→ DB query
→ aggregation
→ workbook generator
→ HTTP response
```

Buat evidence table:
```text
Layer                    Ringkasan   Rekap   Detail Izin
DB rows                  ?
Normalized member rows   ?
Attendance records       ?
Aggregate counts         ?
Worksheet write          ?
```

Mandatory checks:
1. date range berbeda?
2. attendanceDate vs submittedAt?
3. enum status mismatch?
4. key mismatch user.id vs enrollment.id vs student.id?
5. Map keyed by UUID tapi lookup NIS?
6. agenda count berasal dari source berbeda?
7. undefined/null menyebabkan writer skip?
8. camelCase DTO vs snake_case raw result?
9. Ringkasan query relation berbeda dari Rekap?

Dilarang patch default zero sebelum source data diverifikasi.

Output:
```text
docs/incidents/excel-report-data-pipeline.md
```

---

## A4 — Excel Workbook Writer Forensic

### Ownership
Read-only:
```text
src/lib/**excel**
src/lib/**workbook**
src/lib/**export**
templates/**
tests/**excel**
```

### Fokus
Pastikan normalized data benar-benar ditulis.

Check:
- row offsets
- off-by-one column mapping
- merge cells menimpa row
- wrong worksheet name
- formula referensi salah
- formula tidak punya cached value
- percent format salah
- sparse array / map callback tidak return
- conditional writer skip undefined
- hidden rows/columns

Kolom Ringkasan:
```text
No
NIS
Nama siswa
Kelas
Hadir
Izin
Tidak hadir
Total agenda
Tingkat kehadiran
Keaktifan
```

Jika library tidak menghitung formulas server-side, prefer calculated values dari server.

Output:
```text
docs/incidents/excel-workbook-writer-audit.md
```

---

# Wave 1 Exit Condition

Orkestrator tidak boleh mulai fix sebelum klasifikasi exact:

```text
DATA_QUERY
AGGREGATION
DTO_MAPPING
WORKBOOK_WRITER
FORMULA
atau kombinasi yang punya evidence
```

Valid:
```text
summaryByMember keyed by enrollment.id,
writer lookup menggunakan user.id,
hasil selalu undefined → cells blank.
```

Tidak valid:
```text
Maybe ExcelJS bug.
```

---

# WAVE 2

## A5 — Login UI Unification Fixer

### Ownership
Set setelah A1/A2 selesai. Likely:
```text
src/app/(auth)/**
src/components/auth/**
src/components/login/**
login-only styles
```

Jangan ubah backend auth behavior.

### Goal
Buat shared visual shell:
```text
AuthShell
├── AuthTopbar
├── AuthHero
└── AuthPanel
    ├── AuthPanelHeader
    ├── AuthField
    ├── AuthCTA
    └── AuthHelper
```

Nama boleh menyesuaikan codebase.

Desktop target:
```text
HERO 52–55%
LOGIN CARD 45–48%
```

Admin card jangan lagi terasa mini.

Shared visual tokens:
- max-width
- spacing
- border/shadow
- panel header height
- input height
- CTA height
- typography hierarchy
- responsive stacking

Admin improvements:
- card lebih proporsional
- form vertical rhythm rapi
- Turnstile punya slot dedicated
- login CTA jelas primary
- "Login siswa" secondary
- preserve navy/orange identity

Responsive test:
```text
1440
1024
768
390
360
```

Mobile:
- no horizontal overflow
- Turnstile tidak terpotong
- form muncul cukup cepat
- hero boleh dipendekkan

### Guardrails
Jangan ubah:
- Google OAuth semantics
- password auth
- Turnstile verification
- session duration
- returnTo
- attendance intent

---

## A6 — Excel Root-Cause Fixer

### Ownership
Setelah A3/A4:
```text
exact report service
exact export API
exact workbook generator
report tests
```

### Goal
Fix berdasarkan root cause terverifikasi.

Architecture target:
```text
DB facts
→ normalize once
→ calculate report once
→ write all sheets
```

Hindari logic drift antar sheet.

Per member wajib hasilkan:
```text
present
excused
absent
totalAgenda
attendanceRate
activityLabel
```

Pakai business rule actual codebase.

Zero agenda:
- no divide by zero
- no NaN
- deterministic 0% atau rule domain existing

Overall Ringkasan wajib terisi:
```text
anggota
agenda
jumlah hadir
izin
tidak hadir
tingkat kehadiran
```

Per student wajib terisi:
```text
Hadir
Izin
Tidak hadir
Total agenda
Tingkat kehadiran
Keaktifan
```

Jika formula engine tidak calculate server-side, write numeric value secara langsung.

---

# Excel Regression Tests — WAJIB

Fixture contoh:

```text
Basket
members: 3
sessions: 4
```

A:
```text
present 3
excused 1
absent 0
```

B:
```text
present 2
excused 0
absent 2
```

C:
```text
present 0
excused 1
absent 3
```

Sesuaikan definisi rate actual project.

Assert Ringkasan:
- rows student ada
- NIS/name/class terisi
- hadir terisi
- izin terisi
- tidak hadir terisi
- total agenda terisi
- attendance rate numeric
- activity terisi

Assert Rekap tetap benar.

Assert Detail Izin tetap benar.

Cross-sheet invariants:
```text
SUM(Ringkasan.Hadir)
==
count(Rekap PRESENT)
```

```text
SUM(Ringkasan.Izin)
==
count(Detail Izin valid)
```

Gunakan enum actual project.

Test:
- zero agenda
- optional NIS/class null
- empty attendance
- all present
- all absent

---

# WAVE 3 — A7 Integration / QA

## Login QA
Checklist:
```text
[ ] student/admin satu design family
[ ] admin card tidak mini
[ ] hero/card balance
[ ] border/shadow consistent
[ ] typography consistent
[ ] inputs/CTA shared sizing
[ ] Turnstile fit
[ ] mobile 390 works
[ ] auth behavior unchanged
```

## Excel QA
Generate actual `.xlsx` lewat production-equivalent path.

Jangan hanya inspect object TS.

Assert workbook hasil:
```text
[ ] Ringkasan metrics non-empty
[ ] Rekap populated
[ ] Detail Izin populated
[ ] totals consistent
[ ] no broken formula refs
[ ] percent correct
[ ] no NaN/undefined/null strings
[ ] styling preserved
```

Jika memungkinkan buka manual di Excel/LibreOffice setelah automated read.

---

# Observability

Export error gunakan requestId jika pattern project sudah ada.

Log boleh:
```text
requestId
extracurricularId
date range
row counts
sheet row counts
error category
```

Dilarang:
```text
password
session token
OAuth token
raw sensitive student payload
```

Temporary debug logs harus dibersihkan sebelum final.

---

# Mandatory Verification

Minimum:
```bash
pnpm typecheck
```

Jika tersedia:
```bash
pnpm lint
pnpm test:auth
```

Tambahkan/run report tests:
```bash
pnpm test:reports
```
atau direct test file sesuai runner existing.

Tidak boleh claim PASS kalau command tidak benar-benar dieksekusi.

---

# Final Root-Cause Report

## Login UI
```text
CONFIRMED divergence:
...

CHANGES:
...

VISUAL VERIFICATION:
...
```

## Excel
```text
CONFIRMED ROOT CAUSE:
...

CODE/RUNTIME EVIDENCE:
...

WHY REKAP WORKED:
...

WHY DETAIL IZIN WORKED:
...

WHY RINGKASAN WAS EMPTY:
...

FIX:
...

REGRESSION TEST:
...

ACTUAL GENERATED XLSX:
PASS/FAIL
```

---

# Stop Conditions untuk Qwen

Maksimal 15 menit hypothesis phase.

Setelah itu wajib:
```text
trace API
inspect data DTO
count normalized rows
inspect workbook writer
build failing regression test
fix
```

Begitu exact root cause terbukti, stop eksplorasi area lain.

Jangan refactor seluruh reporting system jika tidak perlu.

---

# Acceptance Criteria

## Login
```text
[ ] student/admin share same EXISEL design system
[ ] admin card proportion fixed
[ ] auth behavior unchanged
[ ] Turnstile unchanged functionally
[ ] OAuth unchanged
[ ] credential login unchanged
[ ] attendance intent unchanged
[ ] desktop/mobile verified
[ ] pnpm typecheck PASS
```

## Excel
```text
[ ] root cause documented
[ ] Ringkasan overall metrics populated
[ ] per-student Hadir populated
[ ] per-student Izin populated
[ ] per-student Tidak hadir populated
[ ] Total agenda populated
[ ] Tingkat kehadiran populated
[ ] Keaktifan populated
[ ] Rekap still correct
[ ] Detail Izin still correct
[ ] cross-sheet totals consistent
[ ] zero agenda handled
[ ] no NaN/undefined
[ ] actual XLSX verified
[ ] report regression tests PASS
[ ] pnpm typecheck PASS
```

---

# Immediate Prompt for Qwen Orchestrator

Execute this plan with subagents.

Wave 1:
dispatch A1, A2, A3, A4 in parallel with strict non-overlapping ownership.

During Wave 1:
do not modify production code except owned diagnostic tests/docs.

After Wave 1 freeze:
1. shared login design tokens,
2. exact Excel root cause,
3. report calculation contract.

Wave 2:
dispatch A5 and A6 in parallel.

Wave 3:
dispatch A7 QA/integration.

Hard rules:
- Do NOT fix Ringkasan by blindly replacing blanks with 0.
- Do NOT redesign auth backend while fixing UI.
- Do NOT weaken Turnstile, OAuth, session, QR, attendance intent, or rate limiting.
- Preserve existing EXISEL workbook styling unless a styling bug is proven.
- Verify the actual generated `.xlsx`, not just TypeScript objects.
- Root cause must be evidence-backed.
