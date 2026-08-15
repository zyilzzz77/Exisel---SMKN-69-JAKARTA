# plans.md — Bot Informasi Ekskul

## 1. Tujuan

Bot ini membantu user bertanya tentang ekstrakurikuler (ekskul) dengan perilaku yang tetap stabil walaupun:

- pertanyaan user panjang atau terdiri dari beberapa paragraf;
- satu pesan berisi banyak pertanyaan sekaligus;
- dataset ekskul masih sedikit;
- user memakai bahasa gaul, singkatan, typo, campuran Indonesia–Inggris;
- user hanya memberi respons sosial seperti `mantap`, `makasih`, `thx`, `oke`, `gas`, `wkwk`, dan sejenisnya;
- informasi yang diminta tidak ditemukan di dataset.

Prinsip utama:

> Jangan menolak atau meminta maaf hanya karena pesan user panjang.

Bot harus **memahami pesan terlebih dahulu, memecahnya menjadi kebutuhan-kebutuhan kecil, lalu menjawab bagian yang memang dapat dijawab**.

---

## 2. Prioritas Perilaku Bot

Urutan prioritas saat menerima pesan:

1. Deteksi apakah pesan merupakan sapaan / ucapan terima kasih / reaksi sosial.
2. Deteksi apakah pesan berisi satu atau lebih pertanyaan tentang ekskul.
3. Normalisasi bahasa, typo, singkatan, dan bahasa gaul.
4. Pecah pesan panjang menjadi beberapa intent atau sub-pertanyaan.
5. Cari fakta yang relevan dari dataset.
6. Jawab semua bagian yang memiliki data.
7. Untuk bagian yang datanya belum tersedia, katakan dengan spesifik bagian mana yang belum diketahui.
8. Jangan membuat fakta tentang ekskul yang tidak ada di dataset.
9. Jangan memberi respons generik seperti `Maaf, saya tidak bisa membantu` hanya karena query panjang.
10. Pertahankan konteks percakapan untuk pertanyaan lanjutan.

---

# 3. Aturan Utama untuk Pesan Panjang

## RULE-LONG-001

Jika panjang pesan melebihi batas tertentu, misalnya:

```text
> 300 karakter
atau
> 3 kalimat
atau
> 1 pertanyaan
```

jangan langsung menghasilkan jawaban final.

Lakukan tahap pemrosesan internal berikut:

```text
RAW USER MESSAGE
    ↓
NORMALISASI
    ↓
DETEKSI INTENT
    ↓
PECAH SUB-PERTANYAAN
    ↓
CARI DATA PER SUB-PERTANYAAN
    ↓
GABUNGKAN HASIL
    ↓
JAWAB USER
```

Catatan:

- Tahap internal di atas tidak perlu ditampilkan sebagai proses berpikir model.
- User cukup menerima jawaban yang rapi dan terstruktur.
- Jangan menampilkan chain-of-thought atau reasoning tersembunyi.

---

# 4. Normalisasi Input

Sebelum melakukan pencarian dataset, buat versi input yang sudah dinormalisasi.

Contoh:

```text
"bang ekskul pmr ada ga? trs jadwalny kpn, daftar ny gmna yaa?"
```

menjadi representasi internal:

```json
{
  "topic": "ekskul",
  "entity": "PMR",
  "questions": [
    "Apakah ekskul PMR tersedia?",
    "Kapan jadwal PMR?",
    "Bagaimana cara mendaftar PMR?"
  ]
}
```

Normalisasi boleh memperbaiki:

- `ga`, `gak`, `nggak` → `tidak`
- `gmn`, `gmna`, `gimana` → `bagaimana`
- `kpn` → `kapan`
- `dmn` → `di mana`
- `yg` → `yang`
- `sm` → `sama`
- `trs`, `trus` → `terus`
- `jdwl` → `jadwal`
- `eskul`, `exkul`, `ekskul` → `ekstrakurikuler`
- `daftarinnya` → `cara pendaftaran`
- typo ringan berdasarkan kemiripan kata.

Jangan mengubah nama orang, nomor telepon, URL, kode kelas, atau nama ekskul secara agresif.

---

# 5. Intent yang Harus Dikenali

Minimal sediakan intent berikut:

```yaml
intents:
  greeting:
    description: sapaan

  gratitude:
    description: ucapan terima kasih

  positive_reaction:
    description: respons positif atau pujian

  negative_reaction:
    description: user tidak puas atau bingung

  ask_extracurricular_list:
    description: menanyakan daftar ekskul

  ask_extracurricular_detail:
    description: menanyakan detail satu ekskul

  ask_schedule:
    description: jadwal kegiatan

  ask_location:
    description: lokasi kegiatan

  ask_registration:
    description: cara atau syarat pendaftaran

  ask_contact:
    description: kontak pembina atau pengurus

  ask_cost:
    description: biaya

  ask_requirement:
    description: syarat

  ask_recommendation:
    description: meminta rekomendasi ekskul

  compare_extracurricular:
    description: membandingkan beberapa ekskul

  follow_up:
    description: pertanyaan lanjutan berdasarkan konteks

  unknown_school_info:
    description: pertanyaan sekolah yang tidak tersedia di dataset

  out_of_scope:
    description: bukan tentang layanan bot
```

Satu pesan boleh memiliki lebih dari satu intent.

Contoh:

```text
"Basket jadwalnya kapan, latihannya di mana, sama kalau mau daftar hubungi siapa?"
```

harus menghasilkan:

```json
{
  "intents": [
    "ask_schedule",
    "ask_location",
    "ask_registration",
    "ask_contact"
  ],
  "entity": "Basket"
}
```

---

# 6. Multi-Question Decomposition

Untuk pesan panjang, identifikasi semua pertanyaan yang dapat berdiri sendiri.

Contoh input:

```text
Saya tertarik ikut basket tapi saya juga ingin tahu apakah latihan bentrok
dengan Pramuka. Basket biasanya hari apa? Lokasinya di mana? Kalau pemula
boleh ikut tidak? Terus kalau saya mau daftar harus menghubungi siapa?
```

Representasi internal:

```json
{
  "main_entities": ["Basket", "Pramuka"],
  "sub_questions": [
    {
      "id": 1,
      "intent": "ask_schedule",
      "entity": "Basket",
      "question": "Kapan jadwal latihan Basket?"
    },
    {
      "id": 2,
      "intent": "ask_location",
      "entity": "Basket",
      "question": "Di mana lokasi latihan Basket?"
    },
    {
      "id": 3,
      "intent": "ask_requirement",
      "entity": "Basket",
      "question": "Apakah pemula boleh mengikuti Basket?"
    },
    {
      "id": 4,
      "intent": "ask_contact",
      "entity": "Basket",
      "question": "Siapa yang harus dihubungi untuk pendaftaran Basket?"
    },
    {
      "id": 5,
      "intent": "compare_extracurricular",
      "entities": ["Basket", "Pramuka"],
      "question": "Apakah jadwal Basket bentrok dengan Pramuka?"
    }
  ]
}
```

Semua `sub_questions` harus diproses satu per satu.

---

# 7. Aturan Pencarian Dataset

Untuk setiap sub-pertanyaan:

```pseudo
for question in sub_questions:
    result = search_dataset(question)

    if result.confidence >= HIGH:
        answer_from_dataset()

    elif result.confidence >= MEDIUM:
        answer_with_care()

    else:
        mark_as_not_found()
```

Jangan menggunakan satu kegagalan pencarian untuk menggagalkan seluruh pesan.

SALAH:

```text
User bertanya 5 hal.
1 pertanyaan tidak ditemukan.
Bot: "Maaf, saya tidak dapat membantu."
```

BENAR:

```text
User bertanya 5 hal.
4 ditemukan, 1 tidak ditemukan.

Bot menjawab 4 informasi yang tersedia,
lalu menyebutkan 1 informasi yang belum tersedia.
```

---

# 8. Format Dataset yang Disarankan

Setiap ekskul sebaiknya memiliki schema seragam.

Contoh:

```json
{
  "id": "basket",
  "name": "Basket",
  "aliases": [
    "basket",
    "basketball",
    "bola basket"
  ],
  "description": "Ekstrakurikuler olahraga basket.",
  "schedule": {
    "day": "Rabu",
    "time": "15:30-17:00"
  },
  "location": "Lapangan sekolah",
  "coach": "Nama pembina",
  "contact": "Nomor/kontak resmi",
  "registration": "Pendaftaran melalui ...",
  "requirements": [
    "Siswa aktif",
    "Mengikuti aturan kegiatan"
  ],
  "cost": null,
  "quota": null,
  "notes": null,
  "last_updated": "YYYY-MM-DD"
}
```

Gunakan `null` untuk data yang belum tersedia.

Jangan mengisi data kosong dengan tebakan.

---

# 9. Alias Nama Ekskul

Sediakan alias agar pencarian tidak bergantung pada satu ejaan.

Contoh:

```yaml
aliases:
  paskibra:
    - paskib
    - pasukan pengibar bendera
    - paskibraka

  pmr:
    - palang merah remaja

  basket:
    - basketball
    - bola basket

  futsal:
    - futsal sekolah

  pramuka:
    - scouting
    - scout
```

Jika alias baru sering muncul dari user, simpan ke daftar kandidat alias untuk ditinjau admin.

---

# 10. Small Talk Tidak Perlu Dataset Ekskul

Ucapan sosial harus dijawab langsung tanpa melakukan pencarian dataset.

Kategori:

```yaml
social_messages:

  gratitude:
    examples:
      - makasih
      - terima kasih
      - thanks
      - thank you
      - thx
      - tysm
      - tengkyu
      - mksh
      - trims
      - nuhun

  positive:
    examples:
      - mantap
      - mantul
      - keren
      - gokil
      - jos
      - nice
      - cakep
      - sip
      - gas
      - gaskeun
      - good
      - oke banget
      - jelas
      - paham
      - GG

  acknowledgement:
    examples:
      - oke
      - ok
      - okee
      - okey
      - siap
      - noted
      - paham
      - ngerti
      - iy
      - iya
      - yoi
      - bet
      - aman

  laughter:
    examples:
      - wkwk
      - wkwkwk
      - haha
      - hahaha
      - hehe
      - xixi
      - awok
```

Contoh respons:

```text
User: mantap
Bot: Mantap 😄 Kalau mau cek ekskul lain, tinggal sebut namanya.

User: thx bro
Bot: Sama-sama 😄 Kalau masih ada yang mau ditanyain soal ekskul, gas aja.

User: oke ngerti
Bot: Sip 👍

User: wkwkwk
Bot: 😄
```

Jangan menjawab:

```text
"Maaf, informasi tersebut tidak tersedia pada dataset."
```

untuk pesan sosial.

---

# 11. Deteksi Bahasa Gaul Secara Fleksibel

Jangan hanya mengandalkan exact match.

Gunakan kombinasi:

```text
1. lowercase
2. hapus tanda baca yang tidak penting
3. normalisasi pengulangan huruf
4. fuzzy matching
5. semantic intent classifier
```

Contoh:

```text
mantappppp
```

dinormalisasi menjadi:

```text
mantap
```

Contoh:

```text
makasiiii
```

dapat dikenali sebagai:

```text
makasih
```

Normalisasi pengulangan karakter:

```pseudo
normalize_repeated_chars(word):
    "mantappppp" -> "mantapp" / "mantap"
    "makasiiii"  -> "makasii" / "makasih"
    "okeeeeee"   -> "okee"
```

Gunakan fuzzy matching hanya pada small-talk dan kata umum.

Jangan gunakan fuzzy matching agresif pada nama ekskul yang bisa menyebabkan salah identifikasi.

---

# 12. Update Bahasa Gaul

Bahasa gaul sebaiknya tidak hanya berupa daftar statis.

Sediakan file terpisah:

```text
data/slang.json
```

Contoh:

```json
{
  "thx": {
    "normalized": "terima kasih",
    "intent": "gratitude"
  },
  "mksh": {
    "normalized": "terima kasih",
    "intent": "gratitude"
  },
  "mantul": {
    "normalized": "mantap",
    "intent": "positive_reaction"
  },
  "gaskeun": {
    "normalized": "lanjut",
    "intent": "positive_reaction"
  }
}
```

Ketika bot menemukan istilah baru:

```pseudo
if phrase_not_known
and model_confidence_social_intent >= 0.85:
    log_candidate_slang(
        original_phrase,
        predicted_intent,
        timestamp
    )
```

Jangan otomatis memasukkan semua kata baru ke production.

Gunakan alur:

```text
UNKNOWN SLANG
   ↓
LOG
   ↓
ADMIN REVIEW
   ↓
APPROVED
   ↓
ADD TO slang.json
```

Ini mencegah user memasukkan kata berbahaya atau salah arti ke kamus bot.

---

# 13. Context Memory Percakapan

Bot harus mengingat entitas utama beberapa turn terakhir.

Contoh:

```text
User: Jadwal basket kapan?
Bot: Basket latihan hari Rabu pukul ...

User: kalau lokasinya?
```

`lokasinya` harus dianggap sebagai:

```text
lokasi Basket
```

Bukan meminta user mengulang nama ekskul.

Simpan state sementara:

```json
{
  "last_entity": "Basket",
  "last_intent": "ask_schedule",
  "conversation_topic": "extracurricular"
}
```

Context hanya berlaku selama sesi atau sesuai kebijakan aplikasi.

---

# 14. Ambiguous Follow-Up

Input:

```text
"kalau yang itu?"
```

Jika konteks terakhir cukup jelas:

```text
resolve menggunakan last_entity
```

Jika terdapat dua kemungkinan yang sama kuat:

```text
tanyakan klarifikasi singkat
```

Contoh:

```text
"Maksud kamu Basket atau Futsal?"
```

Jangan menanyakan klarifikasi bila konteks sudah jelas.

---

# 15. Kebijakan Jika Data Tidak Ditemukan

Gunakan fallback bertingkat.

## Level 1 — Sebagian Data Ada

Contoh:

```text
User:
Basket hari apa, jam berapa, biayanya berapa, pembinanya siapa?
```

Dataset memiliki hari, jam, pembina, tetapi tidak biaya.

Jawaban:

```text
Basket latihan hari Rabu pukul 15.30–17.00 dan pembinanya Pak/Bu X.
Untuk informasi biaya, datanya belum tersedia di sistem.
```

---

## Level 2 — Ekskul Ada, Field Tidak Ada

Jawab:

```text
"PMR ada di daftar ekskul, tetapi informasi jadwalnya belum tersedia di data saya."
```

Bukan:

```text
"PMR tidak ada."
```

---

## Level 3 — Nama Ekskul Tidak Ditemukan

Jawab:

```text
"Aku belum menemukan ekskul bernama 'Archery' di data yang tersedia.
Kalau kamu punya ejaan atau nama lainnya, kirim aja."
```

---

## Level 4 — Pertanyaan Di Luar Dataset

Contoh:

```text
"Siapa kepala sekolah sekarang?"
```

Jika bot memang hanya memiliki data ekskul:

```text
"Saat ini data yang aku punya fokus ke informasi ekskul, jadi data kepala sekolah belum tersedia."
```

Jangan mengarang.

---

# 16. Jangan Terlalu Sering Menggunakan Kata "Maaf"

Hindari respons default:

```text
Maaf, saya tidak bisa menjawab.
```

Gunakan respons yang lebih informatif:

```text
"Data jadwal ekskul itu belum tersedia."
```

atau:

```text
"Aku menemukan data Basket, tapi belum ada informasi biayanya."
```

Kata `maaf` boleh digunakan jika memang sesuai konteks, tetapi jangan menjadi fallback utama.

---

# 17. Response Composer

Setelah semua sub-pertanyaan diproses:

```pseudo
known_answers = []
missing_answers = []

for result in results:
    if result.found:
        known_answers.append(result)
    else:
        missing_answers.append(result)

response = compose(
    known_answers,
    missing_answers
)
```

Untuk 1–2 pertanyaan:

```text
jawab langsung
```

Untuk 3+ pertanyaan:

```text
boleh menggunakan bullet agar mudah dibaca
```

Contoh:

```text
Untuk Basket:

- Jadwal: Rabu, 15.30–17.00.
- Tempat: lapangan sekolah.
- Pemula: boleh ikut.
- Pendaftaran: hubungi pengurus/pembina sesuai data.
- Bentrok dengan Pramuka: belum bisa dipastikan karena jadwal Pramuka belum tersedia.
```

---

# 18. Panjang Jawaban

Sesuaikan dengan kompleksitas user.

```yaml
response_length:
  simple_question: short
  multiple_questions: medium
  long_paragraph: structured
  small_talk: very_short
```

Jangan menjawab `mantap` dengan paragraf panjang.

Jangan menjawab pertanyaan lima bagian dengan satu kalimat tidak lengkap.

---

# 19. Style Bahasa

Default:

- Bahasa Indonesia natural.
- Tidak terlalu formal.
- Ramah.
- Boleh menyesuaikan sedikit dengan gaya user.
- Jangan berlebihan memakai slang.
- Informasi tetap harus jelas.

Contoh:

```text
User:
bang basket hari apa

Bot:
Basket latihan hari Rabu pukul 15.30–17.00 👍
```

Contoh user formal:

```text
User:
Mohon informasinya mengenai jadwal ekstrakurikuler Basket.

Bot:
Ekstrakurikuler Basket dilaksanakan hari Rabu pukul 15.30–17.00.
```

---

# 20. Confidence Rules

Gunakan threshold untuk mencegah hallucination.

Contoh:

```yaml
confidence:
  exact_database_match: 1.00
  alias_match: 0.95
  strong_semantic_match: 0.85
  weak_semantic_match: 0.60
```

Aturan:

```pseudo
if confidence >= 0.85:
    answer()

elif confidence >= 0.60:
    answer_only_if_safe_or_request_confirmation()

else:
    do_not_guess()
```

Untuk fakta seperti:

- jadwal;
- biaya;
- nomor telepon;
- nama pembina;
- lokasi;
- syarat;

prioritaskan exact database value.

---

# 21. Retrieval Strategy

Jangan mencari seluruh paragraf sebagai satu query saja.

SALAH:

```pseudo
search_dataset(full_user_paragraph)
```

BENAR:

```pseudo
questions = decompose(full_user_paragraph)

for q in questions:
    search_dataset(
        entity=q.entity,
        intent=q.intent,
        keywords=q.keywords
    )
```

Contoh:

```text
"Saya mau basket. Hari apa, jam berapa, dan daftarnya gimana?"
```

Query retrieval:

```text
basket schedule
basket time
basket registration
```

---

# 22. Keyword + Semantic Search

Karena dataset masih sedikit, gunakan hybrid search.

```pseudo
score =
    0.45 * exact_keyword_score +
    0.20 * alias_score +
    0.35 * semantic_similarity
```

Dengan dataset kecil, exact field/alias match tetap memiliki prioritas tinggi.

---

# 23. Optional RAG Flow

Jika memakai embedding/vector database:

```text
User Input
   ↓
Intent Parser
   ↓
Question Decomposer
   ↓
Entity Resolver
   ↓
Retriever
   ├── Structured DB
   └── Vector DB
   ↓
Evidence Filter
   ↓
Answer Generator
```

Prompt generator hanya boleh menggunakan fakta hasil retrieval.

---

# 24. Recommended Internal Object

Gunakan object internal seperti:

```json
{
  "message_type": "information_request",
  "language": "id",
  "tone": "casual",
  "entities": ["Basket", "Pramuka"],
  "intents": [
    "ask_schedule",
    "ask_location",
    "compare_extracurricular"
  ],
  "sub_questions": [],
  "context": {
    "last_entity": null
  },
  "retrieval_results": [],
  "missing_fields": [],
  "response_mode": "structured"
}
```

---

# 25. System Prompt yang Disarankan

```text
Kamu adalah bot informasi ekstrakurikuler sekolah.

TUGAS UTAMA:
Membantu user mendapatkan informasi ekskul berdasarkan data yang tersedia.

ATURAN:

1. Jangan menolak pertanyaan hanya karena pesan user panjang.
2. Jika pesan memiliki beberapa pertanyaan, pecah menjadi sub-pertanyaan secara internal.
3. Jawab setiap sub-pertanyaan berdasarkan dataset.
4. Jika hanya sebagian informasi tersedia, tetap jawab bagian yang tersedia.
5. Sebutkan secara spesifik informasi yang belum tersedia.
6. Jangan mengarang jadwal, biaya, nama pembina, kontak, lokasi, kuota, atau syarat.
7. Gunakan konteks percakapan untuk pertanyaan lanjutan.
8. Kenali bahasa Indonesia informal, typo ringan, singkatan, dan bahasa gaul.
9. Sapaan, ucapan terima kasih, pujian, tawa, atau acknowledgment tidak perlu dicari di dataset.
10. Jangan menggunakan "Maaf, saya tidak dapat membantu" sebagai fallback universal.
11. Sesuaikan panjang jawaban dengan jumlah pertanyaan.
12. Jika user bertanya 3 hal atau lebih, susun jawaban agar mudah dibaca.
13. Jangan menampilkan proses berpikir internal.
14. Jika ada dua interpretasi yang sama kuat dan konteks tidak cukup, tanyakan klarifikasi singkat.
15. Jika konteks sudah jelas, jangan meminta user mengulang informasi.
```

---

# 26. Prompt untuk Question Decomposer

```text
Analisis pesan user dan ubah menjadi daftar kebutuhan informasi yang mandiri.

Kembalikan JSON saja dengan schema:

{
  "message_type": "",
  "entities": [],
  "intents": [],
  "sub_questions": [
    {
      "intent": "",
      "entity": "",
      "question": "",
      "search_terms": []
    }
  ],
  "social_intent": null
}

Aturan:
- Pertahankan semua pertanyaan penting.
- Jangan menjawab pertanyaan.
- Jangan mengarang entity.
- Gunakan konteks sebelumnya jika referensi seperti "itu", "yang tadi",
  "jadwalnya", atau "tempatnya" memiliki referen yang jelas.
- Jika pesan hanya merupakan small talk, isi social_intent dan kosongkan
  sub_questions.
```

---

# 27. Prompt untuk Answer Generator

```text
Buat jawaban berdasarkan EVIDENCE yang diberikan.

Aturan:
- Gunakan hanya fakta dalam EVIDENCE untuk informasi sekolah.
- Jawab semua sub-pertanyaan yang memiliki evidence.
- Jika evidence untuk salah satu sub-pertanyaan tidak tersedia, nyatakan
  informasi itu belum tersedia.
- Jangan menggagalkan seluruh jawaban karena satu data hilang.
- Jangan mengarang.
- Gunakan Bahasa Indonesia yang natural.
- Sesuaikan gaya bahasa secara ringan dengan user.
- Untuk 3 atau lebih informasi, gunakan struktur yang mudah dibaca.
- Jangan menjelaskan reasoning internal.
```

---

# 28. Social Response Layer

Sebelum RAG:

```pseudo
social = classify_social_message(user_message)

if social.confidence >= 0.90 and social.has_no_information_question:
    return social_response(social.intent)
```

Contoh template:

```yaml
responses:

  greeting:
    - "Halo! Mau tanya soal ekskul apa?"
    - "Hai 👋 Ada ekskul yang mau kamu cek?"

  gratitude:
    - "Sama-sama 😄"
    - "Siap, sama-sama!"
    - "Sama-sama. Kalau ada yang mau ditanyain lagi, gas aja 👍"

  positive_reaction:
    - "Mantap 😄"
    - "Sip 👍"
    - "Gas 😄"

  acknowledgement:
    - "Siap 👍"
    - "Oke!"
    - "Sip."

  laughter:
    - "😄"
    - "Wkwk 😄"
```

Pilih satu respons, jangan mengirim semuanya.

---

# 29. Mixed Social + Question

User bisa menulis:

```text
"Mantap, btw jadwal PMR kapan?"
```

Jangan berhenti di `positive_reaction`.

Hasil:

```json
{
  "social_intent": "positive_reaction",
  "intents": ["ask_schedule"],
  "entity": "PMR"
}
```

Jawaban:

```text
Siap 😄 Untuk PMR, jadwalnya ...
```

Prioritas pertanyaan informasi lebih tinggi daripada small talk.

---

# 30. Greeting + Question

Input:

```text
"Halo min, mau tanya dong basket latihannya kapan?"
```

Jangan hanya menjawab:

```text
"Halo! Ada yang bisa dibantu?"
```

Jawab isi pertanyaannya:

```text
"Halo 👋 Basket latihan hari ..."
```

---

# 31. Typo Handling

Contoh:

```text
"jadwal paskib kapan?"
"jadal paskib kpn?"
"jadwl paskibra?"
```

Semua harus menuju intent:

```text
ask_schedule(Paskibra)
```

Gunakan typo correction hanya jika confidence tinggi.

---

# 32. Anti-Failure Rule untuk Parser

Jika parser gagal menghasilkan JSON valid:

```pseudo
try:
    structured_parse()

except:
    use_simple_intent_classifier()

if still_failed:
    keyword_extract()

if still_failed:
    answer_with_safe_general_fallback()
```

Jangan mengembalikan error parser ke user.

---

# 33. Safe General Fallback

Jika sistem benar-benar tidak memahami input:

```text
"Aku belum nangkep bagian yang ingin kamu tanyakan. Kalau soal ekskul, kamu bisa tulis nama ekskulnya plus yang mau dicek, misalnya jadwal, tempat, atau cara daftar."
```

Gunakan ini hanya jika:

- intent benar-benar tidak dapat ditentukan;
- tidak ada sub-pertanyaan yang bisa diproses;
- bukan small talk.

---

# 34. Jangan Gunakan Panjang Input Sebagai Alasan Menolak

Hapus rule semacam:

```pseudo
if token_count > X:
    return apology
```

Ganti dengan:

```pseudo
if token_count > X:
    chunk_or_decompose()
```

Jika pesan sangat panjang:

```pseudo
segments = split_by_sentence_and_topic(user_message)

for segment in segments:
    detect_questions(segment)
```

Setelah itu gabungkan sub-pertanyaan yang duplikat.

---

# 35. Deduplication

User bisa mengulang pertanyaan.

Input:

```text
"Basket hari apa? Jadwal basket kapan? Terus basket latihannya hari apa?"
```

Jadikan satu:

```text
ask_schedule(Basket)
```

Jangan menjawab pertanyaan yang sama tiga kali.

---

# 36. Contradiction Handling

Jika dataset memiliki dua nilai berbeda:

```text
Basket:
dokumen A → Rabu
dokumen B → Kamis
```

Jangan memilih secara acak.

Gunakan:

```text
"Aku menemukan dua data jadwal Basket yang berbeda, yaitu Rabu dan Kamis.
Datanya perlu dicek lagi sebelum aku memastikan jadwal yang benar."
```

Jika tersedia `last_updated`, prioritaskan sumber terbaru hanya jika aturan sistem memang mengizinkan.

---

# 37. Data Freshness

Setiap record sebaiknya memiliki:

```json
{
  "source": "admin",
  "last_updated": "2026-08-01",
  "status": "verified"
}
```

Prioritas:

```text
verified + terbaru
verified + lama
unverified
```

Jangan menyebut data sebagai terbaru jika tidak memiliki informasi tanggal.

---

# 38. Recommendation Questions

Untuk:

```text
"Bagusnya saya ikut apa?"
```

Jangan langsung mengarang rekomendasi.

Cari preferensi user, misalnya:

```text
- olahraga
- seni
- akademik
- organisasi
- teknologi
- jadwal kosong
```

Contoh:

```text
"Kalau kamu suka olahraga, bisa pertimbangkan Basket atau Futsal.
Kalau lebih suka organisasi/kedisiplinan, bisa lihat Paskibra atau Pramuka."
```

Hanya sebut ekskul yang benar-benar ada di dataset.

---

# 39. Comparison Questions

Contoh:

```text
"Bagusan basket atau futsal?"
```

Gunakan field yang tersedia:

```text
jadwal
jenis kegiatan
lokasi
syarat
biaya
```

Jangan membuat klaim subjektif absolut.

Jawab sebagai trade-off.

---

# 40. Logging

Simpan log anonim/seperlunya untuk meningkatkan kualitas.

Contoh:

```json
{
  "timestamp": "2026-08-13T08:00:00+07:00",
  "normalized_query": "jadwal basket kapan",
  "intent": "ask_schedule",
  "entity": "Basket",
  "retrieval_found": true,
  "fallback_used": false
}
```

Untuk query gagal:

```json
{
  "normalized_query": "ekskul panahan ada ga",
  "intent": "ask_extracurricular_detail",
  "entity": "Panahan",
  "retrieval_found": false,
  "unknown_term": null
}
```

Jangan menyimpan data pribadi yang tidak diperlukan.

---

# 41. Unknown Query Queue

Buat queue:

```text
logs/unanswered_queries.jsonl
```

Tujuannya:

- melihat pertanyaan yang sering gagal;
- mengetahui data ekskul apa yang kurang;
- menemukan alias baru;
- menemukan slang baru;
- menentukan prioritas penambahan dataset.

Contoh analisis mingguan:

```text
15x user bertanya biaya Basket
12x user bertanya kuota Futsal
10x user menulis "paskib"
8x user bertanya kontak PMR
```

Dari sini admin tahu data mana yang perlu ditambahkan.

---

# 42. Slang Candidate Queue

Contoh:

```json
{
  "phrase": "makaciw",
  "predicted_intent": "gratitude",
  "confidence": 0.94,
  "count": 12,
  "approved": false
}
```

Jika sudah direview:

```json
{
  "phrase": "makaciw",
  "normalized": "terima kasih",
  "intent": "gratitude",
  "approved": true
}
```

---

# 43. Cache

Untuk pertanyaan populer:

```text
daftar ekskul
jadwal basket
jadwal futsal
cara daftar
```

boleh menggunakan cache.

Cache harus dihapus/di-refresh jika dataset berubah.

---

# 44. Rate Limiting Bukan Response Logic

Jika terlalu banyak request, jangan membuat LLM mengatakan:

```text
"Maaf saya tidak tahu."
```

Rate limit harus ditangani di layer aplikasi:

```http
429 Too Many Requests
```

dengan UI/message khusus.

Jangan mencampur error teknis dengan fallback knowledge.

---

# 45. Error Handling

Pisahkan jenis error:

```yaml
errors:

  retrieval_empty:
    action: answer_missing_data

  llm_timeout:
    action: retry_or_simple_fallback

  parser_error:
    action: fallback_parser

  database_error:
    action: technical_error_message

  unknown_intent:
    action: ask_short_clarification
```

Contoh technical error:

```text
"Lagi ada kendala mengambil data ekskul. Coba kirim lagi pertanyaannya."
```

Jangan menyamakan database error dengan `data tidak tersedia`.

---

# 46. Suggested Pipeline

```pseudo
function handle_message(message, conversation_context):

    clean = normalize(message)

    social = detect_social(clean)

    parsed = parse_intents(
        message=clean,
        context=conversation_context
    )

    if social.is_social_only:
        return generate_social_reply(social)

    questions = decompose(parsed)

    questions = deduplicate(questions)

    results = []

    for q in questions:
        entity = resolve_entity(q, conversation_context)

        evidence = retrieve(
            entity=entity,
            intent=q.intent,
            search_terms=q.search_terms
        )

        results.append({
            "question": q,
            "evidence": evidence
        })

    answer = compose_answer(
        results=results,
        social=social,
        style=detect_user_style(message)
    )

    update_conversation_context(parsed)

    log_query(
        parsed=parsed,
        results=results
    )

    return answer
```

---

# 47. Contoh Test Case

## Test 1 — Simple

Input:

```text
jadwal basket kapan
```

Expected:

```text
Intent: ask_schedule
Entity: Basket
Search dataset
Jawab jadwal jika tersedia
```

---

## Test 2 — Banyak Pertanyaan

Input:

```text
Basket ada gak? Kalau ada jadwalnya kapan, tempatnya di mana,
daftarnya gimana, bayar gak, sama pembinanya siapa?
```

Expected intents:

```text
ask_extracurricular_detail
ask_schedule
ask_location
ask_registration
ask_cost
ask_contact
```

Bot harus menjawab setiap field yang ditemukan.

---

## Test 3 — Paragraf Panjang

Input:

```text
Saya kelas 10 dan lagi bingung memilih ekskul. Saya tertarik basket sama
PMR, tapi saya pulang biasanya jam 5. Basket latihannya hari apa dan jam
berapa? PMR kapan? Kalau dua-duanya bentrok saya mungkin pilih yang
jadwalnya lebih cocok. Terus daftar dua ekskul itu lewat mana ya?
```

Expected:

```text
Entities:
- Basket
- PMR

Questions:
- jadwal Basket
- jadwal PMR
- kemungkinan bentrok
- pendaftaran Basket
- pendaftaran PMR
```

Tidak boleh menghasilkan fallback hanya karena pesan panjang.

---

## Test 4 — Gratitude

Input:

```text
thxxx bang
```

Expected:

```text
Social intent: gratitude
No retrieval
Short friendly response
```

---

## Test 5 — Positive

Input:

```text
mantapppp
```

Expected:

```text
Positive reaction
No retrieval
```

---

## Test 6 — Mixed

Input:

```text
mantap, btw pmr jadwalnya kapan?
```

Expected:

```text
Positive reaction + ask_schedule(PMR)
Retrieve PMR schedule
Answer question
```

---

## Test 7 — Missing Field

Dataset:

```text
Basket exists
schedule exists
cost missing
```

Input:

```text
Basket jadwal dan biayanya berapa?
```

Expected:

```text
Jawab jadwal.
Katakan biaya belum tersedia.
```

---

## Test 8 — Follow Up

Conversation:

```text
User: Basket kapan?
Bot: Rabu ...

User: tempatnya?
```

Expected:

```text
resolve "tempatnya" -> Basket
```

---

## Test 9 — Unknown Slang

Input:

```text
makaciw min
```

Jika semantic classifier yakin gratitude:

```text
jawab sebagai gratitude
log candidate slang jika belum ada
```

---

## Test 10 — Out of Scope

Input:

```text
buatkan saya kode hacking wifi
```

Expected:

```text
Ikuti safety policy aplikasi/model.
Jangan mencoba mencari jawabannya di dataset ekskul.
```

---

# 48. Regression Test Wajib

Setiap perubahan bot harus dites terhadap minimal:

```text
[ ] pesan 1 kalimat
[ ] pesan > 5 kalimat
[ ] pesan > 1 paragraf
[ ] 5 pertanyaan dalam satu pesan
[ ] typo
[ ] bahasa gaul
[ ] ucapan terima kasih
[ ] pujian
[ ] mixed small-talk + pertanyaan
[ ] follow-up tanpa menyebut nama ekskul
[ ] data lengkap
[ ] data sebagian
[ ] data kosong
[ ] entity tidak dikenal
[ ] dua sumber bertentangan
[ ] database error
```

---

# 49. Metrics

Pantau:

```yaml
metrics:
  answer_rate:
    description: persentase query yang berhasil dijawab

  partial_answer_rate:
    description: query dengan sebagian data tersedia

  unnecessary_apology_rate:
    target: mendekati 0

  fallback_rate:
    description: persentase generic fallback

  retrieval_hit_rate:
    description: persentase retrieval menemukan data

  multi_question_completion_rate:
    description: berapa sub-pertanyaan yang berhasil dijawab

  unknown_slang_count:
    description: slang baru yang belum dipetakan

  unanswered_query_frequency:
    description: pertanyaan yang sering tidak memiliki data
```

Metric penting:

```text
MULTI QUESTION COMPLETION RATE
=
jumlah sub-pertanyaan terjawab
/
total sub-pertanyaan user
```

---

# 50. Target Behaviour

Target akhir:

```text
USER PANJANG
→ bot tidak panik

BANYAK PERTANYAAN
→ bot pecah dan jawab satu per satu

DATA KURANG
→ bot jawab yang tersedia

DATA TIDAK ADA
→ bot bilang field tertentu belum tersedia

THX / MANTAP / WKWK
→ bot merespons secara sosial

TYPO / GAUL
→ bot normalisasi

PERTANYAAN LANJUTAN
→ bot menggunakan konteks

DATA BARU / SLANG BARU
→ masuk log kandidat dan dapat di-update setelah review
```

---

# 51. Struktur Folder yang Disarankan

```text
bot-ekskul/
│
├── plans.md
│
├── prompts/
│   ├── system.txt
│   ├── intent_parser.txt
│   ├── answer_generator.txt
│   └── social_classifier.txt
│
├── data/
│   ├── extracurriculars.json
│   ├── aliases.json
│   └── slang.json
│
├── logs/
│   ├── unanswered_queries.jsonl
│   └── slang_candidates.jsonl
│
├── tests/
│   ├── test_long_queries.json
│   ├── test_slang.json
│   ├── test_missing_data.json
│   └── test_followups.json
│
└── src/
    ├── normalize.*
    ├── classify.*
    ├── decompose.*
    ├── retrieve.*
    ├── compose.*
    └── context.*
```

---

# 52. Definition of Done

Bot dianggap memenuhi rencana ini jika:

```text
[ ] Tidak gagal hanya karena input panjang.
[ ] Bisa mendeteksi lebih dari satu pertanyaan per pesan.
[ ] Bisa menjawab sebagian saat dataset hanya memiliki sebagian informasi.
[ ] Tidak hallucinate ketika data tidak tersedia.
[ ] Bisa merespons small talk tanpa retrieval.
[ ] Mengenali variasi bahasa gaul umum.
[ ] Slang baru dapat masuk candidate queue.
[ ] Memahami follow-up sederhana dari konteks.
[ ] Pencarian dilakukan per intent/sub-question.
[ ] Error teknis dipisahkan dari missing knowledge.
[ ] Semua test case utama lolos.
```

---

# 53. Prinsip Terpenting

```text
LONG QUERY != ERROR

MISSING ONE FIELD != FAILED REQUEST

SMALL TALK != DATABASE QUERY

UNKNOWN DATA != MAKE SOMETHING UP

FOLLOW-UP != ASK USER TO REPEAT EVERYTHING
```
