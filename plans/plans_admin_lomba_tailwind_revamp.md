# EXISEL — Admin `/admin/lomba` UI/UX Revamp Plan

> Fokus: rombak tampilan dan pengalaman penggunaan halaman **Admin/Guru → Lomba & Profil** memakai **Tailwind CSS**, tanpa mengubah identitas visual Exisel dan tanpa merusak logic/backend yang sudah berjalan.
>
> Target visual: lebih padat, lebih modern, lebih mudah dipakai admin, tetap punya karakter **neo-brutalist / editorial** Exisel dengan border hitam tebal, offset shadow, biru utama, orange accent, dan background terang.
>
> Scope halaman:
>
> ```txt
> /admin/lomba
> ```
>
> Konten yang dikelola:
>
> ```txt
> Lomba
> Prestasi
> Galeri
> ```
>
> Framework styling:
>
> ```txt
> Tailwind CSS v4
> ```
>
> Strategi migrasi:
>
> ```txt
> hanya halaman /admin/lomba dan komponen terkait
> ```
>
> Jangan rewrite seluruh CSS Modules Exisel sekaligus.

---

# 1. Tujuan Utama

Ubah halaman sekarang dari layout yang terasa:

```txt
besar
kosong
hero terlalu dominan
aksi admin tersebar
informasi konten kurang terlihat
```

menjadi dashboard konten yang:

```txt
lebih padat
lebih informatif
lebih cepat dipahami
lebih mudah mengelola Lomba/Prestasi/Galeri
responsive
konsisten dengan visual Exisel
```

---

# 2. Jangan Hilangkan Identitas Visual Exisel

Dari UI sekarang, karakter yang harus dipertahankan:

```txt
border hitam tebal
offset shadow hitam
warna biru kuat
accent orange
background putih/off-white
typography besar dan berani
button berbentuk rounded rectangular
layout editorial
```

Jangan mengubah halaman menjadi:

```txt
dashboard SaaS generik
glassmorphism
gradient berlebihan
card abu-abu monoton
rounded 24px di semua elemen
shadow blur lembut berlebihan
```

---

# 3. Existing Palette

Gunakan **warna existing project sebagai source of truth**.

Sebelum coding:

```txt
search:
globals.css
*.module.css
CSS variables
theme config
existing button styles
navbar styles
```

Jangan membuat palette baru jika variable warna sudah ada.

Berdasarkan screenshot, provisional palette kira-kira:

```txt
Background       : #F9F9F9
Surface          : #FFFFFF
Ink / Border     : #111111
Primary Blue     : sekitar #013ECC / existing Exisel blue
Orange Accent    : existing Exisel orange
Green Success    : existing Exisel green
Muted Text       : gray existing project
```

**Penting:** warna final harus mengambil value dari stylesheet/theme Exisel saat ini, bukan menebak dari screenshot.

---

# 4. Tailwind Theme Tokens

Untuk Tailwind CSS v4, map palette Exisel ke theme variables.

Contoh konsep:

```css
@import "tailwindcss";

@theme {
  --color-exisel-bg: #f9f9f9;
  --color-exisel-surface: #ffffff;
  --color-exisel-ink: #111111;
  --color-exisel-blue: #013ecc;
  --color-exisel-orange: #ff7b00;
  --color-exisel-green: #0b7a3e;
  --color-exisel-muted: #66666f;

  --shadow-brutal-sm: 3px 3px 0 #111111;
  --shadow-brutal-md: 5px 5px 0 #111111;
  --shadow-brutal-lg: 7px 7px 0 #111111;
}
```

Tetapi:

```txt
gunakan nilai existing Exisel jika sudah tersedia.
```

---

# 5. Migration Strategy

Jangan:

```txt
hapus semua .module.css
convert seluruh admin ke Tailwind dalam sekali kerja
```

Gunakan:

```txt
/admin/lomba → Tailwind
komponen baru → Tailwind
komponen shared lama → tetap CSS Modules kalau masih stabil
```

Jika Navbar admin sudah stabil:

```txt
jangan rewrite hanya demi Tailwind
```

kecuali memang dibutuhkan untuk konsistensi.

---

# 6. High-Level Layout Baru

Current:

```txt
Navbar
↓
Hero sangat besar
↓
stats kecil di kanan
↓
filter ekskul
↓
ruang kosong
↓
content
```

Proposed:

```txt
Navbar
↓
Compact page header
├── title + description
├── primary CTA
└── quick stats
↓
Ekskul selector
↓
Content type tabs
↓
Toolbar
├── search
├── status filter
├── sort
└── view toggle
↓
Content area
├── card/grid desktop
├── compact list/table optional
└── rich empty state
```

---

# 7. Desktop Wireframe

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ NAVBAR ADMIN                                                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ LOMBA & PROFIL                                      [+ Tambah konten]│
│ Kelola agenda lomba, prestasi dan galeri ekskul.                     │
│                                                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                  │
│ │ LOMBA        │ │ PRESTASI     │ │ GALERI       │                  │
│ │ 12           │ │ 08           │ │ 24           │                  │
│ │ +2 bulan ini │ │ +1 terbaru   │ │ 6 foto baru  │                  │
│ └──────────────┘ └──────────────┘ └──────────────┘                  │
│                                                                      │
│ EKSKUL                                                               │
│ [Basket] [English Club] [Futsal] [ITC] [Nihon] ...                  │
│                                                                      │
│ [ Lomba 12 ] [ Prestasi 8 ] [ Galeri 24 ]                           │
│                                                                      │
│ [Cari konten...]    [Status ▾] [Terbaru ▾]            [Grid][List] │
│                                                                      │
│ ┌──────────────────────┐ ┌──────────────────────┐                   │
│ │ ACTIVE               │ │ DRAFT                │                   │
│ │ Turnamen Basket ...  │ │ Kejuaraan ...        │                   │
│ │ 12 September 2026    │ │ belum diterbitkan    │                   │
│ │                      │ │                      │                   │
│ │ [Edit] [•••]         │ │ [Edit] [•••]         │                   │
│ └──────────────────────┘ └──────────────────────┘                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

# 8. Hero Harus Diperkecil

Current hero:

```txt
"Kabar ekskul, selalu hidup."
```

terlalu besar untuk halaman kerja admin.

Tetap boleh mempertahankan branding tersebut tetapi jadikan lebih compact.

Contoh:

```txt
LOMBA & PROFIL

Kabar ekskul,
tetap hidup.

Kelola agenda lomba, prestasi, dan galeri yang tampil
di halaman siswa.

[+ Tambah konten]
```

Desktop target:

```txt
hero height sekitar 230–320px
```

bukan mengambil hampir seluruh viewport.

---

# 9. Page Header Recommended

```tsx
<section className="
  border-b-4 border-exisel-ink
  bg-exisel-bg
  px-6 py-8
  lg:px-10 lg:py-10
">
```

Inner:

```txt
max-width 1500px
centered
```

Tailwind:

```tsx
<div className="
  mx-auto
  w-full
  max-w-[1500px]
">
```

---

# 10. Header Grid

Desktop:

```txt
left  = title/description
right = CTA + stats
```

Example:

```tsx
<div className="
  grid gap-8
  lg:grid-cols-[minmax(0,1fr)_520px]
  lg:items-end
">
```

Mobile:

```txt
1 column
```

---

# 11. Typography

Hero title:

```txt
desktop: 56–72px
tablet : 46–56px
mobile : 38–48px
```

Tailwind example:

```tsx
className="
  max-w-3xl
  text-5xl
  font-black
  leading-[0.92]
  tracking-[-0.05em]
  sm:text-6xl
  lg:text-7xl
"
```

Do not make text so large that admin actions move below fold.

---

# 12. Primary CTA

Add visible:

```txt
+ Tambah konten
```

Button:

```tsx
className="
  inline-flex
  items-center
  justify-center
  gap-2
  rounded-xl
  border-[3px]
  border-exisel-ink
  bg-exisel-blue
  px-5 py-3
  font-bold
  text-white
  shadow-[4px_4px_0_#111]
  transition
  hover:-translate-x-0.5
  hover:-translate-y-0.5
  hover:shadow-[6px_6px_0_#111]
  active:translate-x-0.5
  active:translate-y-0.5
  active:shadow-[2px_2px_0_#111]
"
```

CTA opens:

```txt
Create Content Drawer / Modal
```

---

# 13. Stats Cards

Current:

```txt
Lomba 0
Prestasi 0
Galeri 0
```

Upgrade each stat menjadi standalone compact card.

Card info:

```txt
label
count
small helper text
optional trend/status
```

Example:

```txt
LOMBA
12
3 aktif
```

```txt
PRESTASI
8
1 bulan ini
```

```txt
GALERI
24
6 foto terbaru
```

---

# 14. Stats Card Visual

Base:

```tsx
className="
  border-[3px]
  border-exisel-ink
  bg-white
  p-5
  shadow-[4px_4px_0_#111]
"
```

Use accent per type:

```txt
Lomba    → blue
Prestasi → orange
Galeri   → green
```

Do not use gradient.

---

# 15. Stats Grid

```tsx
className="
  grid
  grid-cols-3
  gap-3
"
```

Mobile:

```tsx
grid-cols-1
sm:grid-cols-3
```

---

# 16. Eskul Selector

Current pill selector is good and should be retained.

Upgrade behavior:

```txt
horizontal scroll on mobile
sticky visual selection
show count optional
```

Example:

```txt
[Basket 12]
[English Club 5]
[Futsal 9]
...
```

But count is optional.

---

# 17. Eskul Pills

Active:

```txt
blue background
white text
black border
offset shadow
```

Inactive:

```txt
white
black text
black border
smaller shadow
```

Tailwind active:

```tsx
className="
  shrink-0
  rounded-full
  border-[3px]
  border-exisel-ink
  bg-exisel-blue
  px-5 py-2.5
  text-sm
  font-bold
  text-white
  shadow-[3px_3px_0_#111]
"
```

Inactive:

```tsx
className="
  shrink-0
  rounded-full
  border-[3px]
  border-exisel-ink
  bg-white
  px-5 py-2.5
  text-sm
  font-bold
  text-exisel-ink
  transition
  hover:bg-black/5
"
```

---

# 18. Mobile Eskul Selector

Container:

```tsx
className="
  -mx-4
  flex
  gap-3
  overflow-x-auto
  px-4
  pb-2
  [scrollbar-width:none]
  [&::-webkit-scrollbar]:hidden
"
```

Do not wrap into 4 lines on small phone.

---

# 19. Main Content Section

Use:

```txt
max-width 1500px
centered
padding 24–40px
```

```tsx
<main className="
  mx-auto
  w-full
  max-w-[1500px]
  px-4 py-8
  sm:px-6
  lg:px-10
">
```

---

# 20. Content Type Tabs

Create strong tab group:

```txt
Lomba
Prestasi
Galeri
```

Example:

```txt
[ LOMBA 12 ] [ PRESTASI 8 ] [ GALERI 24 ]
```

Selected tab gets blue.

This should become the primary content switcher.

---

# 21. Tabs Desktop

```tsx
className="
  inline-flex
  rounded-xl
  border-[3px]
  border-exisel-ink
  bg-white
  p-1
  shadow-[4px_4px_0_#111]
"
```

Each button:

```tsx
px-5 py-2.5
rounded-lg
font-bold
```

Active:

```txt
bg-exisel-blue text-white
```

---

# 22. Toolbar

Under tabs:

```txt
Search
Status Filter
Sort
View Toggle
```

Example:

```txt
[ 🔎 Cari lomba / prestasi / galeri ] [Status ▾] [Terbaru ▾] [▦][☰]
```

---

# 23. Search

Placeholder contextual:

```txt
Cari lomba Basket...
```

or:

```txt
Cari konten...
```

Search should filter client-side if data already loaded.

If server search exists:

```txt
debounce 250–400ms
```

---

# 24. Status Filter

Possible values:

```txt
Semua
Aktif
Draft
Dijadwalkan
Berakhir
```

Only show statuses that actually exist in current backend model.

Do not invent backend statuses.

---

# 25. Sort

Possible:

```txt
Terbaru
Terlama
Tanggal lomba terdekat
Nama A-Z
```

Again:

```txt
only implement fields available in data
```

---

# 26. View Toggle

Optional:

```txt
Grid
List
```

Default:

```txt
Grid
```

Persist in:

```txt
localStorage
```

only if desired.

Do not require backend.

---

# 27. Lomba Card

Card should show:

```txt
status badge
title
eskul
date
location if available
registration deadline if available
thumbnail optional
published state
edit
more actions
```

---

# 28. Example Lomba Card

```txt
┌────────────────────────────┐
│ AKTIF                •••   │
│                            │
│ Turnamen Basket Antar      │
│ Sekolah 2026               │
│                            │
│ Basket                     │
│ 12 Sep 2026 · GOR Jakarta │
│                            │
│ [Edit]        Lihat ↗      │
└────────────────────────────┘
```

---

# 29. Card Styling

```tsx
className="
  group
  flex
  min-h-[240px]
  flex-col
  border-[3px]
  border-exisel-ink
  bg-white
  p-5
  shadow-[5px_5px_0_#111]
  transition
  hover:-translate-x-0.5
  hover:-translate-y-0.5
  hover:shadow-[7px_7px_0_#111]
"
```

Avoid excessive motion.

---

# 30. Card Grid

```tsx
className="
  grid
  grid-cols-1
  gap-5
  md:grid-cols-2
  xl:grid-cols-3
"
```

For very wide monitors:

```txt
max 3 columns
```

so cards don't become too narrow.

---

# 31. Prestasi Card

Use orange accent:

```txt
rank / award
title
student/team
event
date
eskul
```

Example:

```txt
JUARA 1

Basket Putra
Jakarta Student Cup 2026

Basket · Agustus 2026
```

---

# 32. Galeri Card

Gallery should be more visual.

Card:

```txt
thumbnail/photo
album title
photo count
date
eskul
actions
```

Grid could be:

```txt
2 columns tablet
3 columns desktop
4 columns very wide if thumbnails remain useful
```

---

# 33. Empty State

Current zero counts make page feel empty.

Create purposeful empty state.

Example for Lomba:

```txt
Belum ada lomba Basket.

Mulai tambahkan agenda lomba supaya siswa
bisa melihat informasi terbaru.

[ + Tambah lomba ]
```

With simple decorative icon/shape that matches Exisel.

---

# 34. Empty State Styling

```tsx
className="
  border-[3px]
  border-dashed
  border-exisel-ink
  bg-white
  px-6 py-16
  text-center
"
```

Do not leave blank white space.

---

# 35. Create Content Flow

Primary CTA:

```txt
+ Tambah konten
```

opens selector:

```txt
Apa yang ingin ditambahkan?

[Lomba]
[Prestasi]
[Galeri]
```

Then opens relevant form.

---

# 36. Modal vs Drawer

Recommended desktop:

```txt
right-side drawer
```

Why:

```txt
admin can see list context
less disruptive
good for editing
```

Mobile:

```txt
full-screen sheet
```

---

# 37. Drawer Desktop

Target width:

```txt
480–560px
```

Structure:

```txt
header
scrollable form
sticky footer actions
```

---

# 38. Form Layout

Use consistent sections:

```txt
Informasi utama
Jadwal
Media
Status publikasi
```

Avoid one giant vertical list.

---

# 39. Form Inputs

Visual should stay brutalist but easier to scan:

```tsx
className="
  h-12
  w-full
  rounded-lg
  border-[3px]
  border-exisel-ink
  bg-white
  px-4
  text-sm
  font-medium
  outline-none
  transition
  focus:ring-4
  focus:ring-exisel-blue/20
"
```

---

# 40. Form Labels

```tsx
className="
  mb-2
  block
  text-xs
  font-black
  uppercase
  tracking-[0.12em]
"
```

---

# 41. Error State

```txt
border red
small error message
aria-describedby
```

Do not rely only on color.

---

# 42. Save Actions

Footer:

```txt
[Batal] [Simpan draft] [Terbitkan]
```

Only include Draft if backend already supports it.

Primary:

```txt
Terbitkan
```

Blue.

Secondary:

```txt
Simpan draft
```

White.

Destructive:

```txt
Hapus
```

not placed beside primary unless necessary.

---

# 43. Delete Confirmation

Never immediate delete from `•••`.

Flow:

```txt
Delete
↓
confirmation modal
↓
title of content shown
↓
confirm
```

---

# 44. Bulk Actions

Do not implement yet unless admin actually needs it.

Phase 1 should focus on:

```txt
create
edit
publish
delete
search/filter
```

---

# 45. Navbar Relationship

Current navbar is already visually strong.

Do not overfill it.

Potential small improvement:

```txt
active nav remains blue
admin identity remains right aligned
```

No need to change navbar as part of `/admin/lomba` revamp unless spacing bug exists.

---

# 46. Content Density

Admin page should show useful content above fold.

Target desktop first viewport:

```txt
navbar
compact header
stats
eskul selector
tabs
toolbar
start of first row of cards
```

Current giant title prevents this.

---

# 47. Desktop Spacing Scale

Use consistent Tailwind spacing:

```txt
section gap     32–48px
card gap        16–24px
inner card gap  12–20px
button gap      8–12px
```

Avoid random:

```txt
37px
53px
71px
```

---

# 48. Border Standard

Create design rules:

```txt
major container : 3px
card            : 3px
small control   : 2–3px
divider         : 2–3px
```

Don't mix 1px thin SaaS borders with brutalist cards.

---

# 49. Shadow Standard

Use only 2–3 sizes:

```txt
sm = 3px 3px
md = 5px 5px
lg = 7px 7px
```

All black.

Avoid blurred shadows.

---

# 50. Radius Standard

Keep current feel:

```txt
pills       = rounded-full
buttons     = rounded-xl
cards       = rounded-none / rounded-sm / rounded-lg max
inputs      = rounded-lg
```

Do not turn everything into `rounded-3xl`.

---

# 51. Icons

Use icons only where they improve clarity:

```txt
Plus
Search
Filter
Calendar
MapPin
Image
MoreHorizontal
Edit
Trash
ExternalLink
```

If project already has:

```txt
lucide-react
```

reuse it.

Do not add a new icon dependency if existing icons can be reused.

---

# 52. Microinteractions

Allowed:

```txt
small translate on hover
shadow shift
150–200ms transition
button press effect
```

Avoid:

```txt
large scaling
bouncy animations everywhere
parallax
blur transitions
```

---

# 53. Loading State

Use skeleton cards matching final layout.

Example:

```txt
3 card skeletons desktop
1 card mobile
```

Avoid huge spinner centered in blank page.

---

# 54. Error State

If API fails:

```txt
Gagal memuat konten.

Data belum dapat ditampilkan.
[Coba lagi]
```

Keep navigation and filters visible where useful.

---

# 55. Optimistic UX

If current API architecture safely supports:

```txt
publish/unpublish
```

optimistically update UI.

For destructive actions:

```txt
wait server confirmation
```

before removing permanently.

---

# 56. Toasts

Use concise feedback:

```txt
Lomba berhasil diterbitkan.
Prestasi berhasil diperbarui.
Galeri berhasil dihapus.
```

No giant success modal.

---

# 57. Responsive Breakpoints

Use mobile-first.

Tailwind defaults are fine unless Exisel already defines custom breakpoints.

Plan:

```txt
<640px      mobile
640–1023    tablet
>=1024      desktop
>=1280      wide desktop
```

---

# 58. Mobile Layout

Mobile should become:

```txt
Navbar/mobile header
↓
Page title
↓
CTA full width
↓
Stats horizontal/stacked
↓
Eskul horizontal scroll
↓
Content tabs
↓
Search
↓
Filter row
↓
Cards 1 column
```

---

# 59. Mobile Hero

Title:

```txt
Lomba &
Profil
```

No 90px headline.

Use:

```txt
text-4xl
sm:text-5xl
```

---

# 60. Mobile CTA

```tsx
className="
  w-full
  sm:w-auto
"
```

---

# 61. Mobile Stats

Option A:

```txt
3-column compact grid
```

if readable.

Option B:

```txt
horizontal scroll cards
```

Prefer 3-column compact grid if counts are simple.

---

# 62. Mobile Toolbar

Desktop:

```txt
search + status + sort + view
```

Mobile:

```txt
search full width
↓
[Filter] [Sort]
```

Hide grid/list toggle if unnecessary on mobile.

---

# 63. Mobile Forms

Drawer becomes:

```txt
fixed inset-0
full-screen sheet
```

Header/footer sticky.

---

# 64. Accessibility

Must include:

```txt
semantic headings
button labels
aria-label on icon-only buttons
visible focus
keyboard navigation
correct form labels
aria-current for active nav/tab
color contrast
```

---

# 65. Tab Accessibility

Use:

```txt
role="tablist"
role="tab"
aria-selected
```

or semantic buttons with appropriate state.

---

# 66. Focus Style

Use visible style:

```tsx
focus-visible:outline-none
focus-visible:ring-4
focus-visible:ring-exisel-blue/30
```

Do not remove focus without replacement.

---

# 67. Reduced Motion

Respect:

```txt
prefers-reduced-motion
```

Avoid animation essential to understanding state.

---

# 68. Component Architecture

Suggested:

```txt
src/
└── app/
    └── admin/
        └── lomba/
            ├── page.tsx
            ├── _components/
            │   ├── AdminContentHeader.tsx
            │   ├── ContentStats.tsx
            │   ├── EskulSelector.tsx
            │   ├── ContentTypeTabs.tsx
            │   ├── ContentToolbar.tsx
            │   ├── ContentGrid.tsx
            │   ├── LombaCard.tsx
            │   ├── PrestasiCard.tsx
            │   ├── GaleriCard.tsx
            │   ├── ContentEmptyState.tsx
            │   └── ContentDrawer.tsx
            └── _lib/
                └── view-model.ts
```

Adapt to current codebase conventions.

---

# 69. Keep `page.tsx` Small

Target:

```txt
page.tsx = orchestration
components = UI
hooks/lib = behavior
```

Avoid new:

```txt
1500-line page.tsx
```

Target roughly:

```txt
page.tsx 100–250 lines
```

when reasonable.

---

# 70. Server vs Client Components

Keep:

```txt
data loading/server logic
```

in Server Components where current architecture allows.

Mark `"use client"` only for:

```txt
tabs
filters
search
drawer
interactive forms
```

Do not convert whole page to client unnecessarily.

---

# 71. Data Logic Guardrail

This project is a **UI/UX revamp**.

Do not change:

```txt
database schema
API contracts
auth
permissions
role checks
content ownership
publish rules
```

unless a UI feature absolutely requires it.

---

# 72. Preserve Role Authorization

Admin/guru access checks must remain server-side.

UI hiding button is not authorization.

---

# 73. Selected Eskul State

Current selected:

```txt
Basket
```

Behavior:

```txt
click different ekskul
→ list + counts update
```

Recommended URL state:

```txt
/admin/lomba?eskul=basket&type=lomba
```

if architecture supports it.

Benefits:

```txt
shareable
refresh-safe
back/forward-safe
```

Do not force if existing state approach is stable.

---

# 74. Content Type URL State

Optional:

```txt
?type=lomba
?type=prestasi
?type=galeri
```

This improves navigation.

---

# 75. Search URL State

Only if server-side querying:

```txt
?q=turnamen
```

If simple client search:

```txt
keep local state
```

---

# 76. Empty Dataset Example

Screenshot currently shows:

```txt
0 Lomba
0 Prestasi
0 Galeri
```

Page should still look intentional.

Show:

```txt
stats
selector
tabs
empty state
CTA
```

not giant blank region.

---

# 77. Empty State Per Type

Lomba:

```txt
Belum ada agenda lomba.
Tambah lomba pertama untuk Basket.
```

Prestasi:

```txt
Belum ada prestasi yang dicatat.
Dokumentasikan pencapaian Basket.
```

Galeri:

```txt
Galeri Basket masih kosong.
Tambahkan dokumentasi kegiatan.
```

---

# 78. Admin Workflow Optimization

Common admin journey:

```txt
select ekskul
↓
choose content type
↓
see existing content
↓
add/edit
↓
publish
```

The UI should optimize this exact path.

---

# 79. Avoid Decorative Dead Space

Every large section should answer:

```txt
what is this?
what is the current status?
what can I do next?
```

---

# 80. Visual Hierarchy

Priority:

```txt
1. Page title
2. Primary CTA
3. Current selected ekskul
4. Content tabs
5. Content list
6. Stats
```

Stats should support work, not compete with CTA.

---

# 81. Hero Copy

Current:

```txt
Kabar ekskul, selalu hidup.
```

Can remain as branded secondary phrase.

Suggested:

```txt
LOMBA & PROFIL
Kabar ekskul,
tetap hidup.

Kelola lomba, prestasi, dan galeri dari satu tempat.
```

Shorter admin-oriented copy.

---

# 82. Section Labels

Continue small blue uppercase labels:

```txt
RINGKASAN
EKSKUL
KONTEN
```

This is already part of Exisel style.

---

# 83. Design Token Utility Examples

Use:

```txt
bg-exisel-bg
bg-exisel-blue
text-exisel-ink
border-exisel-ink
text-exisel-muted
```

Avoid repeated random:

```txt
bg-[#003dcc]
border-[#111111]
```

throughout every component.

---

# 84. Tailwind v4 Setup Audit

Before migration:

```txt
check package.json
check PostCSS
check globals.css
check existing Tailwind installation
```

If Tailwind v4 already exists:

```txt
reuse
```

If not:

```txt
follow current official Tailwind Next.js setup
```

Do not install Tailwind v3 configs into a v4 project.

---

# 85. Coexist With CSS Modules

Valid during migration:

```tsx
import styles from "./legacy.module.css";

<div
  className={`${styles.oldThing} flex items-center gap-3`}
>
```

But avoid mixed styling in newly-created components unless necessary.

---

# 86. Shared Brutalist Utility

Optional component utility:

```ts
export const brutalCard =
  "border-[3px] border-exisel-ink bg-white shadow-[5px_5px_0_#111]";
```

Better:

```txt
small reusable component
```

than huge duplicated strings.

---

# 87. Utility Component Ideas

```txt
BrutalButton
BrutalCard
StatusBadge
SectionEyebrow
```

Only create if used 3+ times.

Avoid abstraction too early.

---

# 88. Lomba Status Badge

Example:

```txt
AKTIF       blue
DRAFT       neutral
SELESAI     green/neutral
```

Only use statuses existing in backend.

---

# 89. Gallery Visual

Use Next.js `<Image>` if existing data provides stable image source.

Need:

```txt
aspect ratio
object-cover
alt text
```

Example:

```tsx
className="
  aspect-[4/3]
  w-full
  object-cover
"
```

---

# 90. Image Placeholder

If missing image:

```txt
branded placeholder
not broken image icon
```

Use:

```txt
blue/orange geometric shapes
```

matching Exisel.

---

# 91. Delete / Edit Actions

Card actions:

```txt
[Edit]
[•••]
```

`•••` menu:

```txt
Lihat
Duplikat optional
Terbitkan/Arsipkan if supported
Hapus
```

Do not overload card with 5 buttons.

---

# 92. Keyboard UX

`Escape`:

```txt
close drawer/menu
```

`Enter`:

```txt
submit where safe
```

Do not accidentally submit destructive action.

---

# 93. Search Empty State

If content exists but filter gives none:

```txt
Tidak ada hasil untuk "turnamen".

[Hapus filter]
```

Different from true empty dataset.

---

# 94. Filter Chips

When filters active:

```txt
Status: Aktif ×
Terbaru ×
```

Optional but helpful.

---

# 95. URL Deep Linking Optional

Good target:

```txt
/admin/lomba?eskul=basket&type=prestasi
```

This makes reload deterministic.

---

# 96. Loading During Filter Change

Avoid full page spinner.

Use:

```txt
content-area skeleton
```

Toolbar remains.

---

# 97. Desktop Max Width

Current screenshot is 1885px wide and content stretches heavily.

Use:

```txt
max-w-[1500px]
mx-auto
```

This prevents empty horizontal space.

---

# 98. Navbar Alignment

Align navbar content and page main content to the same:

```txt
max-width 1500px
```

This makes the whole admin interface feel intentional.

---

# 99. Wide-Screen Behavior

On 1800–2000px screens:

```txt
content does not stretch edge-to-edge
```

Keep central composition.

---

# 100. Tablet

At roughly 768–1024:

```txt
header 1 column
stats 3 columns
cards 2 columns
toolbar wraps
```

---

# 101. Performance

Avoid:

```txt
large client bundle
all modals mounted permanently
massive animation library
```

Use:

```txt
CSS/Tailwind transitions
lazy image loading
server data where possible
```

---

# 102. No New Heavy UI Framework

User requested Tailwind.

Do not automatically add:

```txt
Material UI
Ant Design
Bootstrap
Chakra
```

If shadcn/ui already exists:

```txt
may reuse primitives carefully
```

but style them to Exisel.

---

# 103. Testing — Visual

Viewport:

```txt
390x844
430x932
768x1024
1366x768
1440x900
1920x1080
```

Check:

```txt
overflow
button wrapping
stats
tabs
drawer
cards
empty state
```

---

# 104. Testing — Interaction

```txt
change ekskul
change content type
search
filter
sort
open create
close create
edit
delete confirmation
publish
empty state CTA
```

---

# 105. Testing — Accessibility

```txt
Tab navigation
Shift+Tab
Enter
Space
Escape
visible focus
screen-reader labels
contrast
```

---

# 106. Testing — Data States

Must test:

```txt
0 items
1 item
3 items
20+ items
long title
missing thumbnail
long ekskul name
network loading
network error
```

---

# 107. Long Title

Cards must not break:

```txt
line-clamp-2
```

but full title accessible via detail/edit.

---

# 108. Content Pagination

If data can become large:

```txt
pagination or load more
```

should be prepared.

Do not implement infinite scroll unless current backend supports it.

Admin prefers deterministic list.

---

# 109. Desktop Toolbar Sticky Optional

If content list long:

```txt
tabs + toolbar
```

could become sticky under navbar.

Only after validating UX.

Avoid stacking too many sticky bars.

---

# 110. Animation

Use:

```txt
transition-[transform,box-shadow,background-color]
duration-150
```

No Framer Motion required for basic interactions.

---

# 111. Navbar Active State

Current active:

```txt
Lomba & profil
```

blue.

Keep exactly this visual relationship after page revamp.

---

# 112. Stats Should Be Clickable Optional

Could make:

```txt
Lomba card → selects Lomba tab
Prestasi card → selects Prestasi
Galeri card → selects Galeri
```

This improves UX.

If implemented:

```txt
keyboard accessible
```

---

# 113. Page Header Mobile Copy

Reduce to:

```txt
Lomba & Profil
Kelola kabar ekskul dari satu tempat.
```

Avoid huge paragraph.

---

# 114. Content Creation Selector

If CTA `Tambah konten`:

```txt
desktop popover
mobile bottom sheet
```

Options:

```txt
Lomba
Prestasi
Galeri
```

with short descriptions.

---

# 115. Create Option Example

```txt
LOMBA
Buat agenda kompetisi atau perlombaan.

PRESTASI
Catat pencapaian siswa atau tim.

GALERI
Publikasikan dokumentasi kegiatan.
```

---

# 116. Permission UI

If guru only manages certain ekskul:

```txt
only show allowed ekskul
```

Do not expose unauthorized ones and rely on disabled state.

Backend authorization remains mandatory.

---

# 117. Publish State

If data has:

```txt
isActive
publishedAt
```

map UI accordingly.

Do not invent a new state model without backend need.

---

# 118. Confirmation Pattern

Publish:

```txt
usually no confirmation needed
```

Delete:

```txt
confirmation required
```

Unsaved drawer close:

```txt
confirm if dirty
```

---

# 119. Form Dirty State

If user edits then closes:

```txt
Perubahan belum disimpan.
Keluar tanpa menyimpan?
```

---

# 120. Error Recovery

If save fails:

```txt
keep form data
show error
allow retry
```

Never close drawer and lose input.

---

# 121. Optimistic Update Guard

Only optimistic-update fields that can be safely rolled back.

For create/delete:

```txt
prefer confirmed server response
```

---

# 122. Suggested Page Skeleton

```tsx
export default async function AdminLombaPage() {
  const data = await getAdminContentData();

  return (
    <>
      <AdminNavbar />

      <AdminContentHeader
        stats={data.stats}
      />

      <main className="
        mx-auto
        max-w-[1500px]
        px-4 py-8
        sm:px-6
        lg:px-10
      ">
        <EskulSelector />

        <div className="mt-8">
          <ContentTypeTabs />
        </div>

        <div className="mt-5">
          <ContentToolbar />
        </div>

        <div className="mt-6">
          <ContentGrid />
        </div>
      </main>
    </>
  );
}
```

Adapt to current data-fetch architecture.

---

# 123. Suggested Header Skeleton

```tsx
<section className="
  border-b-[3px]
  border-exisel-ink
  bg-exisel-bg
">
  <div className="
    mx-auto
    grid
    max-w-[1500px]
    gap-8
    px-4 py-8
    sm:px-6
    lg:grid-cols-[1fr_520px]
    lg:items-end
    lg:px-10
    lg:py-10
  ">
    <div>
      <p className="
        text-xs
        font-black
        uppercase
        tracking-[0.16em]
        text-exisel-blue
      ">
        Satu panel / tiga jenis konten
      </p>

      <h1 className="
        mt-4
        max-w-3xl
        text-5xl
        font-black
        leading-[0.92]
        tracking-[-0.05em]
        sm:text-6xl
        lg:text-7xl
      ">
        Kabar ekskul,
        <span className="
          text-exisel-blue
        ">
          {" "}tetap hidup.
        </span>
      </h1>

      <p className="
        mt-5
        max-w-2xl
        text-base
        leading-7
        text-exisel-muted
      ">
        Kelola lomba, prestasi, dan galeri
        dari satu tempat.
      </p>
    </div>

    <div>
      <div className="
        mb-5
        flex
        justify-start
        lg:justify-end
      ">
        <CreateContentButton />
      </div>

      <ContentStats />
    </div>
  </div>
</section>
```

---

# 124. Suggested Stats Skeleton

```tsx
<div className="
  grid
  grid-cols-3
  gap-3
">
  {stats.map((stat) => (
    <button
      key={stat.type}
      className="
        border-[3px]
        border-exisel-ink
        bg-white
        p-4
        text-left
        shadow-[4px_4px_0_#111]
        transition
        hover:-translate-y-0.5
      "
    >
      <span className="
        text-[11px]
        font-black
        uppercase
        tracking-[0.12em]
      ">
        {stat.label}
      </span>

      <strong className="
        mt-2
        block
        text-4xl
        font-black
      ">
        {stat.count}
      </strong>
    </button>
  ))}
</div>
```

---

# 125. Suggested Content Card Header

```tsx
<div className="
  flex
  items-start
  justify-between
  gap-4
">
  <StatusBadge />

  <button
    aria-label="Buka menu konten"
    className="
      grid
      size-9
      place-items-center
      rounded-lg
      border-2
      border-exisel-ink
      bg-white
    "
  >
    ...
  </button>
</div>
```

---

# 126. No Inline Magic Colors

Bad:

```tsx
bg-[#003ecb]
text-[#ff7b00]
border-[#111111]
```

everywhere.

Preferred:

```txt
bg-exisel-blue
text-exisel-orange
border-exisel-ink
```

---

# 127. Phase 1 — Audit

Before editing:

```txt
inspect current /admin/lomba
inspect component tree
inspect CSS Modules
inspect API/data
inspect role guards
inspect modal/edit flow
inspect existing Tailwind setup
inspect palette variables
```

Document what is safe to change.

---

# 128. Phase 2 — Tailwind Foundation

If Tailwind not installed:

```txt
install current Tailwind v4 using official Next.js guide
```

If already installed:

```txt
do not reinstall
```

Map Exisel design tokens.

---

# 129. Phase 3 — Layout Only

First commit:

```txt
compact header
container width
spacing
stats placement
eskul selector
tabs skeleton
```

Do not touch CRUD yet.

Verify visual hierarchy.

---

# 130. Phase 4 — Content Cards

Create:

```txt
LombaCard
PrestasiCard
GaleriCard
EmptyState
```

Use existing data.

---

# 131. Phase 5 — Toolbar

Add:

```txt
search
status filter
sort
```

Only wire behavior supported by current data.

---

# 132. Phase 6 — Create/Edit UX

Refactor existing form presentation into:

```txt
drawer desktop
full-screen sheet mobile
```

Keep same submission logic.

---

# 133. Phase 7 — Feedback States

Add:

```txt
loading
error
success toast
empty
no search result
```

---

# 134. Phase 8 — Responsive

Test mobile/tablet/wide screen.

No horizontal body scroll.

---

# 135. Phase 9 — Accessibility

Run:

```txt
keyboard
focus
aria
contrast
```

---

# 136. Phase 10 — Regression

Verify:

```txt
auth
admin role
create
edit
delete
publish
filter
selected ekskul
student-facing content
```

---

# 137. Phase 11 — Build

Run existing project commands, e.g.:

```bash
npm run lint
npm run test
npm run build
```

Use package.json as source of truth.

---

# 138. Phase 12 — Production Visual QA

Check actual production:

```txt
1366 desktop
1920 desktop
Android Chrome
```

Screenshots before/after.

---

# 139. Guardrails

Do NOT:

```txt
rewrite auth
change DB schema unnecessarily
remove permissions
replace entire admin navbar
migrate all CSS Modules
change Exisel palette
add gradients randomly
add heavy UI frameworks
add unnecessary dependencies
turn all components into Client Components
hardcode data
```

---

# 140. Acceptance Criteria — Visual

```txt
[ ] Exisel palette unchanged.
[ ] Neo-brutalist visual preserved.
[ ] Header no longer dominates full viewport.
[ ] Content begins above fold on desktop.
[ ] Wide screens no longer feel empty.
[ ] Main content aligns with navbar.
[ ] Stats are readable and useful.
[ ] Empty dataset still looks intentional.
[ ] Cards have consistent border/shadow/radius.
```

---

# 141. Acceptance Criteria — UX

```txt
[ ] Admin can identify selected ekskul instantly.
[ ] Admin can switch Lomba/Prestasi/Galeri quickly.
[ ] Primary Add Content action visible without scrolling.
[ ] Search/filter controls easy to find.
[ ] Empty state has clear CTA.
[ ] Edit/delete actions easy but not cluttered.
[ ] Form input is not lost on network error.
[ ] Mobile flow remains comfortable.
```

---

# 142. Acceptance Criteria — Technical

```txt
[ ] Tailwind CSS v4 used for new /admin/lomba UI.
[ ] Existing Tailwind installation reused if present.
[ ] No unnecessary global CSS regression.
[ ] No backend/API contract change unless required.
[ ] Role authorization remains intact.
[ ] Server/Client Component boundaries remain reasonable.
[ ] No giant monolithic page component.
[ ] No magic color repetition.
[ ] Build passes.
[ ] Existing CRUD still works.
```

---

# 143. Definition of Done

Before:

```txt
Navbar
↓
very large hero
↓
small stats
↓
pills
↓
large empty region
↓
content
```

After:

```txt
Navbar
↓
compact branded admin header
├── title
├── CTA
└── useful stats
↓
Eskul selector
↓
Lomba / Prestasi / Galeri tabs
↓
Search + filters
↓
dense, responsive content cards
↓
clear empty/loading/error states
↓
drawer-based create/edit workflow
```

Result:

```txt
lebih modern
lebih padat
lebih cepat dipakai
tetap khas Exisel
```

---

# 144. Recommended Final Design Direction

Gunakan istilah:

```txt
"Editorial Neo-Brutalist Admin Dashboard"
```

Visual formula:

```txt
off-white background
+
thick black borders
+
black offset shadows
+
Exisel cobalt blue
+
orange accent
+
green success
+
large but controlled typography
+
high-density admin controls
+
responsive Tailwind layout
```

Jangan mengejar tampilan:

```txt
generic corporate dashboard
```

Tujuan akhirnya adalah:

```txt
ketika siswa/admin melihat halaman ini,
mereka langsung tahu ini masih Exisel —
hanya jauh lebih matang dan mudah digunakan.
```

---

# 145. Suggested Coding-Agent Prompt

Gunakan plan ini dengan instruksi:

```txt
Implementasikan redesign /admin/lomba berdasarkan plans.md ini.

Audit existing component, CSS Modules, Tailwind setup, data flow, dan
permissions terlebih dahulu.

Gunakan Tailwind CSS v4 hanya untuk halaman/komponen yang direfactor.
Jangan migrasi seluruh project.

Pertahankan palette Exisel dari existing source code sebagai source of truth.
Jangan mengarang warna baru dari screenshot.

Prioritaskan:
1. compact hero/header
2. useful stats
3. ekskul selector
4. content tabs
5. search/filter toolbar
6. Lomba/Prestasi/Galeri cards
7. responsive empty states
8. create/edit drawer

Jangan mengubah backend/API/auth/role logic kecuali benar-benar diperlukan.
Run lint/test/build setelah selesai.
```
