# PLAN.md — Fitur Community Exisel

## Project
**Exisel — Website Ekstrakurikuler SMKN 69 Jakarta**

## Fitur Baru
**Community Page**

Route utama:

```txt
/community
```

Route admin:

```txt
/admin/community
```

---

# 1. Tujuan Fitur

Menambahkan sebuah halaman komunitas pada website Exisel yang berfungsi sebagai pusat informasi dan komunikasi dari masing-masing ekstrakurikuler.

Konsep tampilan dibuat seperti **Discord Server**, tetapi lebih sederhana dan menyesuaikan desain website Exisel yang sudah ada.

Community memiliki **8 channel ekstrakurikuler**.

Setiap channel memiliki:

- Nama ekstrakurikuler
- Logo ekstrakurikuler
- Deskripsi singkat
- Riwayat pesan
- Informasi pengirim
- Waktu pesan dikirim

User biasa / siswa hanya dapat:

- Membuka Community
- Memilih channel ekstrakurikuler
- Membaca pesan
- Melihat informasi pengirim
- Melihat waktu pesan

User biasa **tidak dapat mengirim pesan**.

Pesan hanya dapat dikirim melalui dashboard:

```txt
/admin/community
```

oleh:

- Admin
- Guru

---

# 2. Struktur Route

Struktur halaman yang dibutuhkan:

```txt
/
├── community
│
├── admin
│   └── community
│
└── api
    └── community
```

Jika menggunakan dynamic route:

```txt
/community
/community/[channel]
```

Contoh:

```txt
/community/it-club
/community/paskibra
/community/pmr
/community/pramuka
```

Tetapi disarankan menggunakan satu halaman:

```txt
/community
```

dan pergantian channel dilakukan tanpa reload halaman.

---

# 3. Community Page

Route:

```txt
/community
```

Halaman ini merupakan halaman yang dapat dibuka oleh semua pengunjung website.

Konsep UI dibuat seperti Discord.

Layout desktop:

```txt
┌───────────────────────────────────────────────────────────┐
│ Navbar Exisel                                             │
├───────────────┬───────────────────────────────────────────┤
│               │ # IT CLUB                                 │
│ CHANNEL       │ ────────────────────────────────────────  │
│               │                                           │
│ ● IT CLUB     │ Admin Exisel                              │
│ ● PASKIBRA    │ 8 Agustus 2026 • 10:30                   │
│ ● PMR         │                                           │
│ ● PRAMUKA     │ Selamat datang di channel IT Club...      │
│ ● ...         │                                           │
│               │ ────────────────────────────────────────  │
│               │                                           │
│               │ Guru Pembina                              │
│               │ 8 Agustus 2026 • 12:15                   │
│               │                                           │
│               │ Besok akan dilaksanakan pertemuan...      │
│               │                                           │
└───────────────┴───────────────────────────────────────────┘
```

---

# 4. Sidebar Channel

Pada sisi kiri halaman terdapat daftar channel.

Heading:

```txt
COMMUNITY
```

Subheading:

```txt
Channel Ekstrakurikuler
```

Setiap channel ditampilkan sebagai item.

Contoh:

```txt
[LOGO] IT CLUB
[LOGO] PASKIBRA
[LOGO] PMR
[LOGO] PRAMUKA
[LOGO] FUTSAL
[LOGO] BASKET
[LOGO] ROHIS
[LOGO] ENGLISH CLUB
```

Nama tersebut merupakan contoh.

Gunakan **8 ekstrakurikuler asli yang tersedia pada data Exisel**.

Jangan membuat data ekstrakurikuler baru jika data sudah tersedia di database atau project.

---

# 5. Channel Item

Setiap channel memiliki:

```ts
id
name
slug
logo
description
```

Contoh:

```json
{
  "id": "1",
  "name": "IT Club",
  "slug": "it-club",
  "logo": "/images/extracurricular/it-club.png",
  "description": "Channel informasi IT Club SMKN 69 Jakarta"
}
```

---

# 6. Active Channel

Channel yang sedang dibuka harus terlihat berbeda.

Contoh visual:

```txt
> IT CLUB
```

Gunakan style active dari design system website yang sudah ada.

Active channel dapat menggunakan:

- background accent
- border
- sedikit glow
- warna text lebih terang

Jangan membuat desain yang terlalu berbeda dari halaman Exisel lainnya.

---

# 7. Header Channel

Bagian atas area chat harus memiliki header.

Contoh:

```txt
# IT CLUB

Informasi dan pengumuman resmi IT Club
```

Header berisi:

- Logo ekstrakurikuler
- Nama ekstrakurikuler
- Deskripsi
- Status channel

Contoh:

```txt
[Logo IT Club]

IT Club
Channel Informasi IT Club SMKN 69 Jakarta
```

---

# 8. Area Message

Pesan ditampilkan dalam bentuk timeline seperti Discord.

Contoh:

```txt
[Avatar]

Admin Exisel
08 Aug 2026 • 10:30

Selamat datang di channel IT Club.

Channel ini digunakan untuk memberikan informasi mengenai kegiatan,
jadwal, pengumuman, dan informasi lainnya dari IT Club.
```

Setiap message memiliki:

```ts
id
channelId
senderId
senderName
senderRole
senderAvatar
message
createdAt
updatedAt
```

---

# 9. Role Pengirim

Tampilkan badge role.

Contoh:

```txt
Admin Exisel    [ADMIN]
Pak Ahmad       [GURU]
```

Badge:

```txt
ADMIN
GURU
```

Tujuannya agar siswa dapat membedakan siapa yang mengirim informasi.

---

# 10. Timestamp

Setiap pesan memiliki waktu pengiriman.

Contoh:

```txt
8 Agustus 2026 • 10:32
```

atau:

```txt
Hari ini • 10:32
Kemarin • 15:22
7 Agustus 2026 • 09:10
```

Gunakan format Bahasa Indonesia.

---

# 11. Student Read Only

Pada halaman:

```txt
/community
```

JANGAN tampilkan input chat kepada user biasa.

Bagian bawah dapat menampilkan informasi:

```txt
Channel ini hanya dapat digunakan untuk membaca informasi.
Pesan hanya dapat dikirim oleh Admin dan Guru.
```

UI:

```txt
┌───────────────────────────────────────────────┐
│ 🔒 Hanya Admin & Guru yang dapat mengirim     │
└───────────────────────────────────────────────┘
```

---

# 12. Empty State

Jika channel belum memiliki pesan:

```txt
Belum ada informasi

Belum ada pesan atau pengumuman pada channel ini.
Informasi dari Admin atau Guru akan muncul di sini.
```

Tambahkan icon sederhana.

---

# 13. Loading State

Saat mengambil pesan:

gunakan skeleton.

Contoh:

```txt
[avatar] ████████
         █████████████
         ███████████████████

[avatar] ███████
         ███████████████
```

Jangan hanya menggunakan tulisan:

```txt
Loading...
```

---

# 14. Error State

Jika gagal mengambil data:

```txt
Gagal memuat Community

Terjadi masalah saat mengambil pesan.
Silakan coba kembali.
```

Button:

```txt
Coba Lagi
```

---

# 15. Mobile Design

Desktop:

```txt
Sidebar | Chat
```

Mobile:

sidebar jangan selalu terbuka.

Gunakan button:

```txt
☰ Channel
```

Ketika diklik:

munculkan drawer.

Contoh:

```txt
┌───────────────────────────┐
│ Community             X   │
│                           │
│ IT CLUB                   │
│ PASKIBRA                  │
│ PMR                       │
│ PRAMUKA                   │
│ ...                       │
└───────────────────────────┘
```

Setelah channel dipilih:

drawer otomatis ditutup.

---

# 16. Admin Community Page

Route:

```txt
/admin/community
```

Halaman ini hanya dapat dibuka oleh:

```txt
ADMIN
GURU
```

User biasa harus mendapatkan:

```txt
403 Unauthorized
```

atau diarahkan ke halaman login.

---

# 17. Admin Community Layout

Contoh:

```txt
┌────────────────────────────────────────────────────────┐
│ Admin Dashboard                                        │
├──────────────┬─────────────────────────────────────────┤
│ Dashboard    │ Community                               │
│ Users        │                                         │
│ Ekskul       │ Pilih Channel                           │
│ Community    │ [ IT CLUB ▼ ]                           │
│ Settings     │                                         │
│              │ Pesan                                   │
│              │ ┌────────────────────────────────────┐ │
│              │ │ Tulis pengumuman...                 │ │
│              │ │                                      │ │
│              │ └────────────────────────────────────┘ │
│              │                                         │
│              │              [ Kirim Pesan ]            │
└──────────────┴─────────────────────────────────────────┘
```

---

# 18. Pilih Channel

Admin/Guru harus memilih channel tujuan.

Component:

```txt
Pilih Channel

[ IT CLUB        ▼ ]
```

Dropdown berisi:

```txt
IT CLUB
PASKIBRA
PMR
PRAMUKA
...
```

Tampilkan logo pada dropdown jika memungkinkan.

---

# 19. Message Composer

Admin/Guru dapat membuat pesan.

Textarea:

```txt
Tulis pesan atau pengumuman...
```

Minimal support:

- Plain text
- Line break
- Emoji
- URL/link

Optional future feature:

- Bold
- Italic
- List
- Attachment
- Image

Untuk versi pertama cukup gunakan plain text.

---

# 20. Character Limit

Berikan batas pesan:

```txt
2000 karakter
```

UI:

```txt
245 / 2000
```

Jika melebihi:

disable button:

```txt
Kirim Pesan
```

---

# 21. Send Message

Button:

```txt
Kirim Pesan
```

Saat proses:

```txt
Mengirim...
```

Setelah berhasil:

Toast:

```txt
Pesan berhasil dikirim ke IT Club.
```

Pesan langsung muncul pada halaman:

```txt
/community
```

tanpa harus melakukan perubahan manual.

---

# 22. Preview Pesan

Sebelum mengirim, admin dapat melihat preview.

Contoh:

```txt
Preview

Admin Exisel [ADMIN]
Sekarang

Besok IT Club akan mengadakan pertemuan pada pukul 15:00
di Lab Komputer.
```

Optional tetapi direkomendasikan.

---

# 23. Message Management

Pada `/admin/community`, tampilkan pesan yang pernah dikirim.

Contoh:

```txt
Recent Messages

IT CLUB
Admin Exisel
8 Aug 2026 • 10:30

"Besok akan diadakan pertemuan..."
```

Admin dapat:

```txt
Edit
Delete
```

Guru dapat:

```txt
Edit pesan sendiri
Delete pesan sendiri
```

---

# 24. Permission

Role:

```txt
ADMIN
GURU
USER
```

Permission:

| Feature | Admin | Guru | User |
|---|---|---|---|
| View Community | ✅ | ✅ | ✅ |
| View Message | ✅ | ✅ | ✅ |
| Send Message | ✅ | ✅ | ❌ |
| Edit Own Message | ✅ | ✅ | ❌ |
| Delete Own Message | ✅ | ✅ | ❌ |
| Edit All Message | ✅ | ❌ | ❌ |
| Delete All Message | ✅ | ❌ | ❌ |
| Manage Channel | ✅ | ❌ | ❌ |

Permission harus dicek **server-side**.

Jangan hanya menyembunyikan tombol pada frontend.

---

# 25. Database

Disarankan memiliki collection/table:

```txt
community_channels
```

dan:

```txt
community_messages
```

---

# 26. Community Channel Schema

Contoh:

```ts
CommunityChannel {
    id: string
    extracurricularId: string
    name: string
    slug: string
    logo: string
    description: string
    createdAt: Date
    updatedAt: Date
}
```

Jika data extracurricular sudah tersedia:

jangan duplicate data.

Lebih baik menggunakan:

```txt
extracurricularId
```

sebagai relation.

---

# 27. Community Message Schema

```ts
CommunityMessage {
    id: string
    channelId: string

    senderId: string
    senderName: string
    senderRole: "ADMIN" | "GURU"

    content: string

    createdAt: Date
    updatedAt: Date
}
```

Lebih baik senderName dan senderRole diambil melalui relation user apabila sistem authentication sudah mempunyai tabel users.

---

# 28. Relation

Struktur relation:

```txt
Extracurricular
       │
       │
       ▼
CommunityChannel
       │
       │
       ▼
CommunityMessage
       │
       │
       ▼
User
```

---

# 29. API

API minimum:

```txt
GET /api/community/channels
```

Mengambil semua channel.

---

```txt
GET /api/community/channels/:channelId/messages
```

Mengambil pesan berdasarkan channel.

---

```txt
POST /api/admin/community/messages
```

Mengirim pesan baru.

Permission:

```txt
ADMIN
GURU
```

---

```txt
PATCH /api/admin/community/messages/:messageId
```

Edit pesan.

---

```txt
DELETE /api/admin/community/messages/:messageId
```

Delete pesan.

---

# 30. API Response

Contoh GET messages:

```json
{
  "success": true,
  "channel": {
    "id": "1",
    "name": "IT Club",
    "slug": "it-club",
    "logo": "/images/it-club.png"
  },
  "messages": [
    {
      "id": "msg_1",
      "sender": {
        "name": "Admin Exisel",
        "role": "ADMIN",
        "avatar": "/images/admin.png"
      },
      "content": "Selamat datang di channel IT Club.",
      "createdAt": "2026-08-08T10:30:00"
    }
  ]
}
```

---

# 31. Security

Semua API POST/PATCH/DELETE harus melakukan authentication.

Contoh logic:

```txt
if user belum login
    return 401

if role bukan ADMIN atau GURU
    return 403
```

Kemudian validasi:

```txt
content != empty
channel exists
content <= 2000
```

---

# 32. Input Sanitization

Pesan harus di-sanitize.

Jangan langsung render raw HTML.

Hindari:

```tsx
dangerouslySetInnerHTML
```

untuk pesan.

Render sebagai text biasa.

Tujuannya mencegah:

```txt
XSS Attack
```

---

# 33. Pagination

Jika pesan sudah banyak:

jangan load semua pesan sekaligus.

Contoh:

```txt
20 message / request
```

API:

```txt
/api/community/channels/it-club/messages?page=1&limit=20
```

Atau gunakan cursor pagination.

---

# 34. Message Ordering

Pesan:

```txt
pesan lama
↓
pesan baru
```

Pesan terbaru berada di paling bawah seperti Discord.

Ketika membuka channel:

otomatis scroll menuju pesan terbaru.

---

# 35. Realtime Update

Direkomendasikan agar halaman Community mendapatkan pesan baru tanpa refresh.

Bisa menggunakan:

```txt
Supabase Realtime
Firebase Realtime
WebSocket
Socket.IO
Pusher
```

Jika project belum mempunyai realtime:

versi pertama boleh menggunakan:

```txt
polling setiap 10-30 detik
```

Tetapi jangan refresh halaman secara penuh.

---

# 36. Notification Badge

Jika terdapat pesan baru:

sidebar dapat menampilkan indicator.

Contoh:

```txt
IT CLUB       ●
PASKIBRA
PMR           ●
```

atau:

```txt
IT CLUB       2
```

Optional untuk versi awal.

---

# 37. Latest Message

Channel sidebar dapat menampilkan preview.

Contoh:

```txt
IT CLUB
Besok akan diadakan...
```

Optional.

---

# 38. Search Message

Tambahkan search pada bagian atas.

```txt
Cari informasi...
```

Search berdasarkan:

```txt
message content
sender
```

Optional untuk versi pertama.

---

# 39. Community Hero

Di atas Community dapat diberikan header kecil:

```txt
EXISEL COMMUNITY

Informasi terbaru dari ekstrakurikuler SMKN 69 Jakarta.
Pilih channel untuk melihat pengumuman dan kegiatan terbaru.
```

Jangan membuat hero terlalu besar karena fokus utama halaman adalah channel dan message.

---

# 40. Design Direction

Community harus menggunakan desain yang sama dengan website Exisel yang sudah ada.

Pertahankan:

```txt
Navbar
Font
Color palette
Button style
Border radius
Background
Card style
Spacing
Animation
Footer
```

JANGAN membuat website dengan desain baru.

Community harus terlihat seperti bagian asli dari Exisel.

---

# 41. Discord Inspiration

Gunakan Discord hanya sebagai inspirasi layout.

Yang boleh diambil:

```txt
sidebar channel
active channel
message timeline
avatar sender
role badge
timestamp
chat layout
```

Jangan membuat clone Discord 100%.

Tetap gunakan identity:

```txt
EXISEL
SMKN 69 JAKARTA
```

---

# 42. Visual Hierarchy

Gunakan hierarchy:

```txt
Channel Name
↓
Sender Name
↓
Timestamp
↓
Message
```

Jangan menggunakan terlalu banyak border.

Gunakan spacing agar chat mudah dibaca.

---

# 43. Animation

Animation harus sederhana.

Contoh:

```txt
channel hover
drawer slide
message fade-in
button hover
toast animation
```

Gunakan:

```txt
150ms - 300ms
```

Jangan menggunakan animation berlebihan.

---

# 44. Navbar

Tambahkan menu:

```txt
Community
```

pada navbar utama Exisel.

Contoh:

```txt
Home
Ekskul
About
Community
```

Link:

```txt
/community
```

Gunakan style navbar yang sudah ada.

---

# 45. Admin Navigation

Tambahkan:

```txt
Community
```

pada sidebar admin.

Contoh:

```txt
Dashboard
Ekskul
Community
Users
Settings
```

Icon dapat menggunakan:

```txt
MessageCircle
MessagesSquare
Megaphone
```

---

# 46. Confirmation Delete

Jika admin menghapus pesan:

jangan langsung delete.

Tampilkan modal:

```txt
Hapus Pesan?

Pesan yang telah dihapus tidak dapat dikembalikan.

[Batal] [Hapus Pesan]
```

---

# 47. Edit Message

Saat edit:

textarea otomatis berisi pesan sebelumnya.

Button:

```txt
Simpan Perubahan
```

Setelah berhasil:

```txt
Pesan berhasil diperbarui.
```

Pada Community dapat diberikan label kecil:

```txt
(diedit)
```

Contoh:

```txt
Admin Exisel • 10:30 • diedit
```

---

# 48. Toast Notification

Gunakan toast untuk:

```txt
Pesan berhasil dikirim
Pesan berhasil diedit
Pesan berhasil dihapus
Gagal mengirim pesan
Gagal mengambil pesan
```

Toast harus mengikuti komponen toast yang sudah ada di project.

---

# 49. Accessibility

Pastikan:

```txt
logo memiliki alt
button memiliki aria-label
drawer bisa ditutup keyboard
contrast text cukup
focus state terlihat
```

Contoh:

```tsx
alt="Logo IT Club"
```

---

# 50. SEO

Community page metadata:

```txt
Title:
Community Ekskul | Exisel SMKN 69 Jakarta
```

Description:

```txt
Community ekstrakurikuler SMKN 69 Jakarta untuk melihat informasi,
pengumuman, dan kegiatan terbaru setiap ekstrakurikuler.
```

---

# 51. URL State

Direkomendasikan channel aktif tersimpan pada URL.

Contoh:

```txt
/community?channel=it-club
```

Jika user membuka URL tersebut:

langsung membuka IT Club.

Jika parameter tidak tersedia:

pilih channel pertama.

---

# 52. Desktop Breakpoint

Rekomendasi:

```txt
>= 1024px
```

Sidebar channel:

```txt
240px - 280px
```

Message area:

```txt
flex: 1
```

---

# 53. Tablet

Tablet:

```txt
768px - 1023px
```

Sidebar dapat dibuat:

```txt
200px
```

atau drawer.

Sesuaikan dengan layout project existing.

---

# 54. Mobile

Mobile:

```txt
< 768px
```

Gunakan:

```txt
full width chat
channel drawer
compact header
smaller avatar
```

Jangan horizontal scroll.

---

# 55. Recommended Components

Buat reusable component.

Contoh:

```txt
components/community/
```

Isi:

```txt
CommunityLayout
CommunitySidebar
CommunityChannel
CommunityHeader
CommunityMessage
CommunityMessageList
CommunityEmptyState
CommunitySkeleton
CommunityMobileDrawer
CommunityReadOnlyNotice
```

Admin:

```txt
components/admin/community/
```

Isi:

```txt
CommunityChannelSelect
CommunityComposer
CommunityPreview
CommunityMessageManager
CommunityDeleteDialog
CommunityEditDialog
```

---

# 56. Suggested Folder Structure

Contoh jika menggunakan Next.js App Router:

```txt
app/
│
├── community/
│   └── page.tsx
│
├── admin/
│   └── community/
│       └── page.tsx
│
├── api/
│   ├── community/
│   │   ├── channels/
│   │   │   └── route.ts
│   │   │
│   │   └── messages/
│   │       └── route.ts
│   │
│   └── admin/
│       └── community/
│           └── messages/
│               └── route.ts
│
components/
│
├── community/
│
└── admin/
    └── community/
```

Sesuaikan dengan struktur project yang sudah ada.

Jangan mengubah architecture project tanpa alasan.

---

# 57. Data Source

Jika project Exisel sudah mempunyai data:

```txt
extracurricular
users
authentication
```

gunakan data tersebut.

Jangan membuat ulang database ekstrakurikuler.

Community harus terhubung dengan data ekstrakurikuler existing.

Contoh:

```txt
Extracurricular
├── id
├── name
├── logo
└── slug
```

Community message cukup menyimpan:

```txt
extracurricularId
```

---

# 58. Admin Channel Access

Jika nantinya Guru hanya menjadi pembina satu ekstrakurikuler:

sistem dapat dikembangkan agar Guru hanya bisa mengirim pesan ke channel ekstrakurikuler yang dibina.

Contoh:

```txt
Guru IT Club
↓
hanya dapat kirim pesan
↓
IT CLUB
```

Sedangkan Admin:

```txt
akses semua channel
```

Untuk versi awal:

```txt
Admin → semua channel
Guru → semua channel
```

atau sesuaikan dengan role system existing.

---

# 59. Recommended UX Flow — Student

Flow:

```txt
User membuka website
        ↓
Klik Community
        ↓
/community
        ↓
Melihat 8 channel
        ↓
Memilih IT Club
        ↓
Melihat pesan IT Club
        ↓
Memilih Paskibra
        ↓
Melihat pesan Paskibra
```

Tidak ada proses login wajib hanya untuk membaca Community kecuali sistem project memang mengharuskannya.

---

# 60. Recommended UX Flow — Admin

```txt
Admin Login
       ↓
Admin Dashboard
       ↓
Community
       ↓
Pilih Channel
       ↓
Tulis Pesan
       ↓
Preview
       ↓
Kirim
       ↓
API save database
       ↓
Pesan muncul di /community
```

---

# 61. Recommended UX Flow — Guru

```txt
Guru Login
      ↓
Admin / Guru Dashboard
      ↓
Community
      ↓
Pilih Channel
      ↓
Tulis Pengumuman
      ↓
Kirim
      ↓
Pesan muncul pada Community
```

---

# 62. Validation

Sebelum mengirim pesan:

check:

```txt
channel dipilih
content tidak kosong
content <= 2000 karakter
user authenticated
role ADMIN atau GURU
```

Jika gagal:

tampilkan error yang jelas.

Contoh:

```txt
Silakan pilih channel terlebih dahulu.
```

---

# 63. Message Delete Strategy

Disarankan menggunakan:

```txt
soft delete
```

Database:

```ts
deletedAt: Date | null
```

Sehingga pesan tidak langsung hilang dari database.

Admin tetap dapat melakukan recovery di masa depan.

Optional untuk versi awal.

---

# 64. Audit Log

Optional tetapi sangat direkomendasikan.

Catat:

```txt
siapa mengirim pesan
siapa edit pesan
siapa menghapus pesan
waktu action
channel
```

Contoh:

```txt
Admin Exisel menghapus message #123
8 Aug 2026 • 15:30
```

---

# 65. Community Rules

Pada sidebar atau header dapat diberikan button:

```txt
Tentang Community
```

Isi:

```txt
Community digunakan sebagai pusat informasi resmi ekstrakurikuler.

Pesan hanya dapat dikirim oleh Admin atau Guru.

Informasi yang tersedia pada Community berkaitan dengan kegiatan,
jadwal, pengumuman, dan informasi ekstrakurikuler.
```

---

# 66. Future Development

Setelah versi pertama selesai, Community dapat dikembangkan dengan:

```txt
Reaction emoji
Image attachment
PDF attachment
Pinned message
Important announcement
Message search
Unread message
Push notification
Mention
Event schedule
Poll
Teacher-specific channel permission
Student discussion
Community moderation
```

Namun fitur tersebut **tidak perlu dikerjakan pada versi pertama**.

---

# 67. MVP

Fokus MVP:

```txt
/community page
8 extracurricular channels
channel logo
channel sidebar
message timeline
student read-only
admin/guru send message
/admin/community
send message
edit message
delete message
role permission
responsive layout
database integration
```

Jangan menambahkan fitur kompleks sebelum MVP selesai.

---

# 68. Implementation Priority

## Phase 1 — Data

Pastikan tersedia:

```txt
Extracurricular
User
Role
CommunityMessage
```

Buat migration/database jika diperlukan.

---

## Phase 2 — Community UI

Buat:

```txt
/community
```

Implement:

```txt
sidebar
channel switching
message list
empty state
loading
responsive
```

Gunakan dummy data terlebih dahulu jika API belum selesai.

---

## Phase 3 — Community API

Implement:

```txt
GET channels
GET messages
```

Hubungkan Community ke database.

---

## Phase 4 — Admin Community

Buat:

```txt
/admin/community
```

Implement:

```txt
channel selector
message composer
send button
message history
```

---

## Phase 5 — Authentication

Tambahkan:

```txt
ADMIN
GURU
```

permission pada API.

Pastikan User tidak bisa mengirim request POST meskipun mencoba langsung melalui API.

---

## Phase 6 — Manage Messages

Implement:

```txt
edit
delete
confirmation dialog
toast
```

---

## Phase 7 — Responsive

Testing:

```txt
desktop
tablet
mobile
```

---

## Phase 8 — Final Testing

Test seluruh fitur.

---

# 69. Testing Checklist

Community:

```txt
[ ] /community dapat dibuka
[ ] 8 channel muncul
[ ] logo setiap channel muncul
[ ] channel dapat diganti
[ ] active channel jelas
[ ] message sesuai channel
[ ] timestamp benar
[ ] role badge benar
[ ] siswa tidak memiliki input chat
[ ] mobile drawer berfungsi
[ ] empty state berfungsi
[ ] loading state berfungsi
```

Admin:

```txt
[ ] /admin/community dapat dibuka admin
[ ] guru dapat membuka halaman
[ ] user biasa ditolak
[ ] admin dapat memilih channel
[ ] admin dapat mengirim pesan
[ ] guru dapat mengirim pesan
[ ] empty message tidak dapat dikirim
[ ] message > 2000 karakter ditolak
[ ] pesan langsung tersimpan
[ ] pesan muncul di /community
[ ] admin dapat edit
[ ] admin dapat delete
[ ] guru dapat edit pesan sendiri
[ ] guru tidak dapat edit pesan orang lain
```

Security:

```txt
[ ] API POST membutuhkan authentication
[ ] API PATCH membutuhkan authentication
[ ] API DELETE membutuhkan authentication
[ ] permission dicek backend
[ ] message disanitize
[ ] tidak ada XSS
```

Responsive:

```txt
[ ] 1920px
[ ] 1440px
[ ] 1024px
[ ] 768px
[ ] 430px
[ ] 390px
[ ] 360px
```

---

# 70. Final Requirement

Implementasikan Community tanpa merusak halaman atau fitur Exisel yang sudah ada.

Jangan mengganti design system existing.

Prioritaskan reuse:

```txt
existing Navbar
existing Sidebar
existing Button
existing Card
existing Modal
existing Toast
existing Authentication
existing Database
existing User Role
existing Extracurricular Data
```

Community harus terasa sebagai fitur resmi dari website Exisel, bukan halaman tambahan dengan style yang berbeda.

Konsep akhir:

```txt
EXISEL COMMUNITY
        │
        ├── IT CLUB
        ├── PASKIBRA
        ├── PMR
        ├── PRAMUKA
        ├── ESKUL 5
        ├── ESKUL 6
        ├── ESKUL 7
        └── ESKUL 8

Admin / Guru
        │
        ▼
/admin/community
        │
        ▼
Pilih Channel
        │
        ▼
Kirim Informasi
        │
        ▼
Database
        │
        ▼
/community
        │
        ▼
Siswa Membaca
```

## Target Akhir

Community menjadi **pusat pengumuman ekstrakurikuler SMKN 69 Jakarta** dengan pengalaman seperti Discord yang sederhana, modern, responsive, dan tetap mengikuti identitas visual website Exisel.