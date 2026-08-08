# PLAN.md — Mobile UI/UX Community Exisel

## Project
**Exisel — Website Ekstrakurikuler SMKN 69 Jakarta**

## Fokus
Optimasi halaman:

```txt
/community
```

agar nyaman digunakan di perangkat mobile dengan UX yang terinspirasi dari **Discord Mobile**, tetapi tetap menggunakan identitas visual dan design system Exisel.

---

# 1. Tujuan Mobile Community

Halaman Community versi mobile harus terasa:

- Ringkas
- Cepat dipahami
- Mudah berpindah channel
- Nyaman membaca pengumuman
- Tidak terlalu penuh
- Tidak memiliki horizontal scroll
- Tidak terasa seperti desktop yang dipaksa masuk ke layar HP

Konsep utama:

```txt
Discord Mobile Inspired
+
Exisel Design System
```

Jangan membuat clone Discord secara penuh.

---

# 2. Target Ukuran Mobile

Optimalkan terutama untuk:

```txt
360px
375px
390px
412px
430px
```

Breakpoint utama:

```css
@media (max-width: 767px)
```

Mobile harus menjadi layout tersendiri, bukan hanya mengecilkan layout desktop.

---

# 3. Layout Utama Mobile

Pada desktop:

```txt
Sidebar Channel | Message Area
```

Pada mobile:

```txt
Top Header
↓
Channel Header
↓
Message Area
↓
Read Only Notice
```

Sidebar channel tidak ditampilkan secara permanen.

Channel dibuka menggunakan drawer / slide panel.

---

# 4. Mobile Layout Structure

Struktur:

```txt
┌────────────────────────────┐
│ ☰  EXISEL COMMUNITY        │
├────────────────────────────┤
│ [LOGO] IT CLUB         ˅   │
│ Informasi IT Club          │
├────────────────────────────┤
│                            │
│ Message                    │
│ Message                    │
│ Message                    │
│ Message                    │
│                            │
│                            │
├────────────────────────────┤
│ 🔒 Hanya Admin & Guru      │
└────────────────────────────┘
```

Gunakan full width.

```css
width: 100%;
max-width: 100vw;
overflow-x: hidden;
```

---

# 5. Community Mobile Header

Header paling atas dibuat compact.

Contoh:

```txt
┌────────────────────────────┐
│ ☰   Community         ⋮    │
└────────────────────────────┘
```

Isi:

- Button channel menu
- Title Community
- Optional menu button

Height:

```txt
56px - 64px
```

Gunakan sticky header:

```css
position: sticky;
top: 0;
z-index: 50;
```

Tujuannya agar navigasi channel tetap mudah diakses saat user scroll pesan.

---

# 6. Channel Drawer

Ketika user klik:

```txt
☰
```

buka drawer dari kiri seperti Discord mobile.

Contoh:

```txt
┌────────────────────────────┐
│ COMMUNITY              ✕   │
│ SMKN 69 Jakarta            │
│                            │
│ CHANNEL EKSTRAKURIKULER    │
│                            │
│ [LOGO] IT Club          ●  │
│ [LOGO] Paskibra            │
│ [LOGO] PMR                 │
│ [LOGO] Pramuka             │
│ [LOGO] Futsal              │
│ [LOGO] Basket              │
│ [LOGO] Rohis               │
│ [LOGO] English Club        │
└────────────────────────────┘
```

Width drawer:

```txt
80% - 88% screen width
```

Maximum:

```txt
320px
```

---

# 7. Drawer Overlay

Saat drawer terbuka:

background halaman diberikan overlay.

Contoh:

```css
background: rgba(0, 0, 0, 0.45);
```

User dapat menutup drawer dengan:

- Tap tombol X
- Tap overlay
- Swipe ke kiri jika memungkinkan
- Pilih channel

Setelah memilih channel, drawer otomatis tertutup.

---

# 8. Drawer Animation

Gunakan slide animation.

Durasi:

```txt
200ms - 300ms
```

Contoh:

```txt
closed:
translateX(-100%)

open:
translateX(0)
```

Gunakan easing yang smooth.

```css
transition: transform 250ms ease;
```

Jangan menggunakan animasi bounce berlebihan.

---

# 9. Channel List

Channel list harus mudah disentuh.

Minimal touch target:

```txt
44px
```

Recommended channel item height:

```txt
52px - 60px
```

Contoh:

```txt
┌──────────────────────────┐
│ [LOGO]  IT Club      ●   │
└──────────────────────────┘
```

Spacing antar channel:

```txt
4px - 8px
```

---

# 10. Channel Logo

Ukuran logo:

```txt
32px - 40px
```

Gunakan:

```css
border-radius: 10px;
object-fit: cover;
```

Jika logo berbentuk bulat:

gunakan bentuk asli jika sudah ada di project.

Jangan memaksa semua logo menjadi circle jika desain Exisel menggunakan rounded square.

---

# 11. Active Channel

Channel aktif harus terlihat jelas.

Contoh:

```txt
┌──────────────────────────┐
│ [LOGO] IT Club       ●   │
└──────────────────────────┘
```

Gunakan:

- Accent background
- Text lebih terang
- Border tipis
- Optional indicator

Contoh:

```txt
▌ IT Club
```

atau:

```txt
IT Club    ●
```

Jangan menggunakan warna terlalu mencolok.

Gunakan accent color Exisel.

---

# 12. Unread Indicator

Jika terdapat pesan baru:

```txt
IT CLUB               3
PASKIBRA
PMR                    ●
```

Optional untuk MVP.

Gunakan badge kecil.

Contoh:

```txt
3
```

atau dot:

```txt
●
```

---

# 13. Channel Header Mobile

Setelah memilih channel, tampilkan channel header.

Contoh:

```txt
┌────────────────────────────┐
│ [LOGO] IT CLUB         ˅   │
│ Informasi resmi IT Club    │
└────────────────────────────┘
```

Channel header harus compact.

Padding:

```txt
12px - 16px
```

Logo:

```txt
36px - 40px
```

Name:

```txt
14px - 16px
font-weight: 600
```

Description:

```txt
12px - 13px
```

---

# 14. Channel Header Interaction

User juga dapat menekan:

```txt
IT CLUB ˅
```

untuk membuka channel drawer.

Dengan demikian user tidak harus selalu menekan hamburger.

UX:

```txt
Tap Channel Header
        ↓
Open Channel List
```

---

# 15. Message Area

Message area menggunakan seluruh ruang yang tersedia.

Contoh:

```txt
┌────────────────────────────┐
│                            │
│ 👤 Admin Exisel            │
│    ADMIN • 10:30           │
│                            │
│    Besok akan ada          │
│    pertemuan IT Club...    │
│                            │
│ 👤 Pak Ahmad               │
│    GURU • 13:22            │
│                            │
│    Jangan lupa membawa...  │
│                            │
└────────────────────────────┘
```

Jangan menggunakan card besar untuk setiap pesan.

Lebih baik menggunakan style Discord:

```txt
avatar + sender + message
```

agar ruang layar lebih efisien.

---

# 16. Message Component Mobile

Struktur:

```txt
[Avatar] Sender Name [ROLE]
         Timestamp

         Message content
```

Contoh:

```txt
[👤] Admin Exisel [ADMIN]
     Hari ini • 10:30

     Besok akan ada pertemuan
     IT Club pukul 15:00 di Lab.
```

---

# 17. Avatar Mobile

Recommended:

```txt
36px - 40px
```

Jika user/admin tidak mempunyai avatar:

gunakan fallback:

```txt
A
```

atau icon user.

Contoh:

```txt
[A]
Admin Exisel
```

---

# 18. Sender Information

Nama sender:

```txt
14px - 15px
font-weight: 600
```

Role badge:

```txt
ADMIN
GURU
```

Badge dibuat kecil.

Contoh:

```txt
Admin Exisel  ADMIN
```

Jangan badge terlalu besar karena akan memenuhi baris.

---

# 19. Timestamp

Timestamp mobile harus sederhana.

Gunakan:

```txt
10:30
```

untuk hari ini.

Gunakan:

```txt
Kemarin • 15:22
```

untuk kemarin.

Gunakan:

```txt
7 Agu • 10:30
```

untuk tanggal lama.

Jangan selalu menggunakan format panjang:

```txt
8 Agustus 2026 • 10:30 WIB
```

karena terlalu panjang di layar HP.

---

# 20. Message Text

Text:

```txt
14px - 15px
```

Line height:

```txt
1.45 - 1.6
```

Recommended:

```css
font-size: 14px;
line-height: 1.55;
```

Pastikan pesan panjang otomatis wrap.

```css
overflow-wrap: anywhere;
word-break: break-word;
```

---

# 21. Message Spacing

Spacing antar message:

```txt
16px - 20px
```

Jangan terlalu jauh.

Contoh:

```txt
Message
16px
Message
16px
Message
```

Jika pesan dikirim sender yang sama dalam waktu dekat, optional tampilkan compact grouping.

---

# 22. Discord Style Message Grouping

Jika sender yang sama mengirim beberapa pesan:

```txt
[Avatar] Admin Exisel
         10:30

         Pesan pertama

         Pesan kedua

         Pesan ketiga
```

Tidak perlu menampilkan avatar dan nama berulang.

Rule optional:

```txt
sender sama
+
jarak waktu < 5 menit
=
group message
```

Hal ini akan membuat UI jauh lebih bersih.

---

# 23. Date Separator

Gunakan separator tanggal.

Contoh:

```txt
──────── Hari ini ────────
```

atau:

```txt
──── 8 Agustus 2026 ────
```

Gunakan style tipis.

Jangan terlalu dominan.

---

# 24. Announcement Message

Jika pesan penting:

optional support:

```txt
📢 Pengumuman
```

Contoh:

```txt
📢 PENGUMUMAN

Besok ekstrakurikuler diliburkan...
```

Untuk versi MVP belum wajib.

---

# 25. Bottom Read-Only Bar

Karena siswa tidak dapat mengirim pesan, jangan tampilkan input chat palsu.

Gunakan bottom bar:

```txt
┌────────────────────────────┐
│ 🔒 Hanya Admin & Guru      │
│ yang dapat mengirim pesan  │
└────────────────────────────┘
```

Sticky:

```css
position: sticky;
bottom: 0;
```

atau fixed jika layout memungkinkan.

---

# 26. Bottom Bar Height

Gunakan:

```txt
52px - 64px
```

Jangan terlalu tinggi.

Text:

```txt
🔒 Read Only
Hanya Admin & Guru yang dapat mengirim pesan
```

Untuk layar sangat kecil:

```txt
🔒 Hanya Admin & Guru yang dapat mengirim
```

---

# 27. Mobile Safe Area

Support perangkat yang mempunyai home indicator.

Tambahkan:

```css
padding-bottom: env(safe-area-inset-bottom);
```

Terutama pada bottom bar.

---

# 28. Scroll Behavior

Message list harus scroll secara natural.

Gunakan:

```css
overflow-y: auto;
overscroll-behavior: contain;
```

Jangan membuat seluruh halaman memiliki beberapa nested scroll yang membingungkan.

Ideal:

```txt
Header fixed/sticky
Channel header sticky
Message list scroll
Bottom bar sticky
```

---

# 29. Auto Scroll

Saat membuka channel:

scroll menuju pesan terbaru.

Tetapi:

jangan memaksa scroll ke bawah jika user sedang membaca pesan lama dan message baru masuk.

Logic:

```txt
if user near bottom
    auto scroll
else
    show New Messages indicator
```

---

# 30. New Message Indicator

Jika pesan baru masuk ketika user sedang membaca pesan lama:

tampilkan:

```txt
↓ 2 pesan baru
```

Button muncul di bawah message area.

Ketika diklik:

scroll ke pesan terbaru.

Optional tetapi bagus untuk UX.

---

# 31. Loading Skeleton Mobile

Jangan gunakan:

```txt
Loading...
```

Gunakan skeleton message.

Contoh:

```txt
○ █████████
  ████

  ███████████████
  ██████████

○ ███████
  ███

  █████████████
```

Skeleton dibuat sesuai layout message.

---

# 32. Initial Channel Loading

Ketika pertama membuka `/community`:

tampilkan:

```txt
Community Skeleton
```

kemudian:

```txt
select default channel
```

Default channel:

- Last opened channel
atau
- Channel pertama

---

# 33. Remember Last Channel

Simpan channel terakhir yang dibuka.

Contoh:

```txt
localStorage:
exisel-community-channel = "it-club"
```

Saat user kembali:

```txt
/community
```

langsung buka channel terakhir.

UX akan terasa seperti Discord.

---

# 34. URL Channel State

Tetap support:

```txt
/community?channel=it-club
```

Flow:

```txt
URL channel tersedia
↓
gunakan URL channel

URL tidak tersedia
↓
gunakan last opened channel

tidak ada keduanya
↓
gunakan channel pertama
```

---

# 35. Mobile Search

Optional.

Di drawer dapat ditambahkan:

```txt
🔍 Cari channel
```

Jika hanya 8 channel:

search channel tidak wajib.

Search pesan dapat ditempatkan di:

```txt
⋮
```

menu.

---

# 36. Mobile Channel Info

Jika user klik nama channel atau tombol:

```txt
ⓘ
```

buka bottom sheet.

Contoh:

```txt
┌────────────────────────────┐
│        IT CLUB             │
│                            │
│       [LOGO BESAR]         │
│                            │
│ Informasi resmi IT Club    │
│ SMKN 69 Jakarta.           │
│                            │
│ 🔒 Read Only               │
└────────────────────────────┘
```

Optional.

---

# 37. Mobile Bottom Sheet

Untuk menu tambahan gunakan bottom sheet, bukan modal desktop.

Contoh:

```txt
┌────────────────────────────┐
│ ─────                      │
│ Channel Info               │
│ Search Message             │
│ Tentang Community          │
│ Tutup                      │
└────────────────────────────┘
```

Lebih natural di mobile.

---

# 38. Navbar Existing

Jika website sudah mempunyai navbar mobile:

jangan membuat navbar kedua yang berlebihan.

Gunakan:

```txt
Existing Navbar
↓
Community Header
```

atau gabungkan jika memungkinkan.

Prioritaskan ruang untuk message.

---

# 39. Avoid Double Header

Jangan membuat:

```txt
Navbar
Community Header
Breadcrumb
Channel Header
```

semuanya sekaligus.

Itu akan memakan terlalu banyak layar.

Mobile cukup:

```txt
Main Header
+
Channel Header
```

---

# 40. Mobile Height

Gunakan:

```css
min-height: 100dvh;
```

bukan hanya:

```css
100vh
```

karena browser mobile memiliki dynamic address bar.

Recommended:

```css
min-height: 100dvh;
```

---

# 41. Discord-Like Navigation Flow

Flow ideal:

```txt
/community
    ↓
IT Club aktif
    ↓
User tap ☰
    ↓
Channel drawer muncul
    ↓
User tap PMR
    ↓
Drawer close
    ↓
Header berubah ke PMR
    ↓
Pesan PMR muncul
```

Transisi harus terasa cepat.

---

# 42. Channel Switching

Saat pindah channel:

jangan full page reload.

Gunakan client-side state.

Flow:

```txt
select channel
↓
update URL
↓
show lightweight skeleton
↓
load message
↓
fade message
```

---

# 43. Preserve Scroll Per Channel

Optional advanced UX.

Simpan posisi scroll setiap channel.

Contoh:

```txt
IT Club:
scrollPosition = 1200

PMR:
scrollPosition = 500
```

Saat kembali ke IT Club:

user kembali ke posisi sebelumnya.

Mirip aplikasi chat modern.

---

# 44. Touch Feedback

Semua interactive item harus memiliki feedback.

Contoh:

```css
:active {
  transform: scale(0.98);
}
```

atau:

```txt
background berubah sedikit
```

Gunakan subtle feedback.

Jangan animation berlebihan.

---

# 45. Swipe Gesture

Optional.

Support:

```txt
swipe right
→ open channel drawer

swipe left
→ close drawer
```

Namun jangan membuat gesture sebagai satu-satunya cara navigasi.

Button tetap harus tersedia.

---

# 46. Typography

Gunakan typography website Exisel.

Recommended mobile:

```txt
Page title:
18px - 20px

Channel name:
15px - 16px

Sender:
14px - 15px

Message:
14px - 15px

Timestamp:
11px - 12px

Badge:
10px - 11px
```

---

# 47. Mobile Padding

Horizontal padding:

```txt
14px - 16px
```

Jangan:

```txt
24px - 32px
```

karena terlalu memakan ruang mobile.

Message area recommended:

```css
padding: 12px 14px;
```

---

# 48. Long Message

Jika message sangat panjang:

biarkan terbuka secara natural.

Jangan memotong pengumuman penting.

Optional:

untuk pesan > 1000 karakter:

```txt
Lihat selengkapnya
```

tetapi bukan requirement MVP.

---

# 49. Link Inside Message

URL pada message harus clickable.

Contoh:

```txt
https://forms.gle/...
```

Tampilkan link dengan:

- accent color
- underline on hover
- safe wrapping

Gunakan:

```css
overflow-wrap: anywhere;
```

agar URL panjang tidak merusak layout.

---

# 50. Images

Jika di masa depan terdapat attachment image:

image width:

```txt
max-width: 100%
```

Border radius sesuai design system.

Jangan membuat gambar melewati viewport.

---

# 51. Empty Channel Mobile

Jika belum ada pesan:

```txt
        [ICON]

   Belum ada informasi

Belum ada pengumuman pada
channel IT Club.

Pesan dari Admin atau Guru
akan muncul di sini.
```

Center secara horizontal.

Jangan center secara vertical penuh jika membuat page terlihat kosong ekstrem.

---

# 52. Error State Mobile

Contoh:

```txt
        ⚠

Gagal memuat pesan

Periksa koneksi lalu coba lagi.

[ Coba Lagi ]
```

Button harus mudah ditekan.

Minimum height:

```txt
44px
```

---

# 53. Offline State

Optional.

Jika koneksi hilang:

```txt
Anda sedang offline
```

Tampilkan banner kecil.

Jika data lama tersedia:

tetap tampilkan cached messages.

---

# 54. Performance

Mobile priority:

- lazy load avatar
- compress logo
- avoid heavy animation
- avoid large JS bundle
- paginate message
- cache channel list
- lazy load older message

Jangan fetch semua message dari semua 8 channel sekaligus.

---

# 55. Message Pagination Mobile

Load:

```txt
20 - 30 message terbaru
```

Saat user scroll ke atas:

```txt
Muat pesan sebelumnya
```

atau auto infinite scroll.

Contoh:

```txt
↑ Muat pesan sebelumnya
```

---

# 56. Pull to Refresh

Optional.

Support refresh message dengan pull down.

Jika terlalu kompleks:

gunakan button refresh pada menu.

MVP tidak wajib.

---

# 57. Accessibility Mobile

Pastikan:

```txt
touch target >= 44px
font tidak terlalu kecil
contrast cukup
drawer keyboard accessible
focus visible
aria-label tersedia
```

Contoh:

```txt
aria-label="Buka daftar channel"
```

---

# 58. Mobile UI Components

Suggested components:

```txt
components/community/mobile/
```

Isi:

```txt
MobileCommunityHeader
MobileChannelHeader
MobileChannelDrawer
MobileChannelItem
MobileMessageList
MobileMessageItem
MobileDateSeparator
MobileReadOnlyBar
MobileNewMessageIndicator
MobileCommunitySkeleton
MobileCommunityEmptyState
MobileCommunityErrorState
```

---

# 59. State Management

State minimum:

```ts
activeChannel
channels
messages
drawerOpen
loading
error
unreadCount
```

Optional:

```ts
scrollPosition
newMessageCount
```

---

# 60. Mobile Component Hierarchy

```txt
CommunityPage
│
├── MobileCommunityHeader
│
├── MobileChannelDrawer
│   └── MobileChannelItem
│
├── MobileChannelHeader
│
├── MobileMessageList
│   ├── MobileDateSeparator
│   └── MobileMessageItem
│
├── MobileNewMessageIndicator
│
└── MobileReadOnlyBar
```

---

# 61. Suggested Mobile Visual

Default:

```txt
┌──────────────────────────────┐
│ ☰  Community            ⋮    │
├──────────────────────────────┤
│ [IT] IT CLUB             ˅   │
│      Informasi resmi         │
├──────────────────────────────┤
│                              │
│ [A] Admin Exisel  ADMIN      │
│     Hari ini • 10:30         │
│                              │
│     Besok akan diadakan      │
│     pertemuan IT Club pada   │
│     pukul 15:00.             │
│                              │
│ [G] Pak Ahmad  GURU          │
│     Hari ini • 12:10         │
│                              │
│     Jangan lupa membawa      │
│     laptop masing-masing.    │
│                              │
│                              │
├──────────────────────────────┤
│ 🔒 Hanya Admin & Guru        │
│    yang dapat mengirim       │
└──────────────────────────────┘
```

---

# 62. Drawer Visual

```txt
┌──────────────────────────────┐
│ EXISEL COMMUNITY         ✕   │
│ SMKN 69 JAKARTA              │
│                              │
│ CHANNEL                      │
│                              │
│ ▌ [IT] IT Club           ●   │
│   [PS] Paskibra              │
│   [PM] PMR                   │
│   [PR] Pramuka               │
│   [FT] Futsal                │
│   [BK] Basket                │
│   [RH] Rohis                 │
│   [EN] English Club          │
│                              │
│ ──────────────────────────── │
│ Tentang Community            │
└──────────────────────────────┘
```

---

# 63. UI Rules

DO:

```txt
✅ Full width
✅ Compact header
✅ Drawer channel
✅ Message seperti Discord
✅ Avatar kecil
✅ Typography jelas
✅ Sticky navigation
✅ Touch friendly
✅ Smooth channel switching
✅ Responsive
```

DON'T:

```txt
❌ Sidebar desktop dipaksa jadi kecil
❌ Horizontal scroll
❌ Card besar untuk setiap message
❌ Padding terlalu besar
❌ Header terlalu tinggi
❌ Banyak border
❌ Banyak modal desktop
❌ Input chat untuk siswa
❌ Font < 12px untuk content
❌ Full page reload saat ganti channel
```

---

# 64. Priority Implementation

## Phase 1

Implement mobile basic layout:

```txt
Header
Channel Header
Message List
Read Only Bar
```

---

## Phase 2

Implement:

```txt
Channel Drawer
Overlay
Channel Switching
Active Channel
```

---

## Phase 3

Implement:

```txt
Mobile message styling
Avatar
Role badge
Timestamp
Date separator
```

---

## Phase 4

Implement:

```txt
Loading skeleton
Empty state
Error state
```

---

## Phase 5

Implement UX improvements:

```txt
Last opened channel
URL state
Auto scroll
New message indicator
```

---

# 65. Mobile Testing

Test minimum:

```txt
360 x 800
375 x 812
390 x 844
412 x 915
430 x 932
```

Checklist:

```txt
[ ] Tidak ada horizontal scroll
[ ] Drawer tidak melebihi viewport
[ ] Drawer dapat ditutup
[ ] Channel mudah dipilih
[ ] Active channel jelas
[ ] Logo tidak terlalu besar
[ ] Message mudah dibaca
[ ] Message panjang tidak keluar layar
[ ] URL panjang tidak merusak layout
[ ] Timestamp tidak bertabrakan
[ ] Badge tidak memenuhi layar
[ ] Bottom bar tidak menutup pesan
[ ] Safe area bekerja
[ ] Scroll smooth
[ ] Header tetap mudah diakses
[ ] Switching channel tanpa reload
[ ] Empty state terlihat baik
[ ] Loading skeleton terlihat baik
[ ] Error state terlihat baik
```

---

# 66. Final Design Principle

Mobile Community harus mengikuti prinsip:

```txt
CHANNEL FIRST
CONTENT SECOND
MINIMAL DISTRACTION
```

User harus dapat:

```txt
Buka Community
↓
Lihat Channel Aktif
↓
Baca Pengumuman
↓
Buka Drawer
↓
Pilih Channel Lain
↓
Baca Pesan
```

dengan maksimal:

```txt
1 - 2 tap
```

---

# 67. Important Developer Instruction

Jangan mengubah tampilan desktop Community yang sudah baik hanya untuk menyesuaikan mobile.

Gunakan responsive behavior.

Contoh:

```txt
Desktop
Sidebar + Messages

Mobile
Drawer + Messages
```

Reuse:

```txt
channel data
message data
API
authentication
role
logo
design tokens
```

Tetapi UI mobile dibuat secara khusus agar lebih nyaman.

---

# 68. Final Target

Target akhir `/community` pada mobile:

```txt
Discord-like navigation
+
Exisel branding
+
Read-only student community
+
Fast channel switching
+
Clean announcement timeline
```

Hasil harus terasa seperti aplikasi komunitas mobile, bukan website desktop yang dikecilkan.