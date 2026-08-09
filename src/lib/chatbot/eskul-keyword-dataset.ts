export type ChatbotReply = {
  text: string;
  action?: { href: string; label: string };
};

type KeywordEntry = {
  name: string;
  slug: string;
  aliases: string[];
  interests: string[];
  description: string;
  schedule: string;
  location: string;
  capacity: number;
};

export const extracurricularKeywordDataset: KeywordEntry[] = [
  {
    name: "PMR",
    slug: "pmr",
    aliases: ["pmr", "palang merah", "palang merah remaja", "kesehatan", "uks", "medis"],
    interests: ["menolong", "kesehatan", "medis", "pertolongan pertama", "kemanusiaan", "sosial", "sakit", "perawat", "dokter", "uks", "donor", "pmr"],
    description: "PMR cocok untuk belajar pertolongan pertama, kesehatan remaja, kerja tim, dan aksi kemanusiaan.",
    schedule: "Senin dan Selasa, pukul 15:45–17:00",
    location: "Ruang UKS",
    capacity: 32,
  },
  {
    name: "English Club",
    slug: "english-club",
    aliases: ["english club", "english", "bahasa inggris", "inggris", "ec"],
    interests: ["bahasa inggris", "speaking", "presentasi", "debat", "public speaking", "bahasa", "inggris", "bule", "english", "speak"],
    description: "English Club cocok untuk melatih speaking, presentasi, kreativitas, dan kepercayaan diri berbahasa Inggris.",
    schedule: "Kamis, pukul 15:45–17:00",
    location: "Lab Bahasa",
    capacity: 28,
  },
  {
    name: "Nihon",
    slug: "nihon",
    aliases: ["nihon", "jepang", "bahasa jepang", "budaya jepang", "anime", "wibu"],
    interests: ["bahasa jepang", "jepang", "budaya", "anime", "manga", "bahasa", "kreatif", "cosplay", "wibu", "japan", "kanji"],
    description: "Nihon mengajakmu menjelajahi bahasa, budaya, dan karya kreatif Jepang bersama teman satu minat.",
    schedule: "Selasa, pukul 15:45–17:00",
    location: "Ruang Bahasa Jepang",
    capacity: 28,
  },
  {
    name: "Basket",
    slug: "basket",
    aliases: ["basket", "basketball", "bola basket"],
    interests: ["basket", "olahraga", "bola", "stamina", "kompetisi", "atletik", "tim", "dunk", "lapangan"],
    description: "Basket cocok untuk meningkatkan teknik bermain, kebugaran, kerja sama tim, dan mental bertanding.",
    schedule: "Senin, pukul 15:45–17:00",
    location: "Lapangan Basket",
    capacity: 24,
  },
  {
    name: "ITC",
    slug: "itc",
    aliases: ["itc", "it club", "komputer", "teknologi", "coding", "pemrograman"],
    interests: ["coding", "programming", "komputer", "teknologi", "desain digital", "website", "aplikasi", "robot", "laptop", "code", "pc", "it"],
    description: "ITC adalah ruang untuk mengeksplorasi coding, desain digital, perangkat komputer, dan teknologi.",
    schedule: "Jumat, pukul 15:45–17:00",
    location: "Lab Komputer 2",
    capacity: 30,
  },
  {
    name: "Paskibra",
    slug: "paskibra",
    aliases: ["paskibra", "paskibraka", "baris berbaris", "pbb", "paskib"],
    interests: ["disiplin", "kepemimpinan", "baris berbaris", "pbb", "upacara", "fisik", "nasionalisme", "paskib", "baris"],
    description: "Paskibra membangun disiplin, kepemimpinan, kekompakan, ketangkasan, dan kemampuan baris-berbaris.",
    schedule: "Minggu, pukul 15:45–17:00",
    location: "Lapangan Sekolah",
    capacity: 36,
  },
  {
    name: "Pramuka",
    slug: "pramuka",
    aliases: ["pramuka", "kepanduan", "scout"],
    interests: ["alam", "kepanduan", "kemah", "kemandirian", "kepemimpinan", "tali temali", "petualangan", "camping", "outbound", "pramuka"],
    description: "Pramuka membentuk karakter, kemandirian, kepemimpinan, dan cinta tanah air melalui kegiatan kepanduan.",
    schedule: "Rabu, pukul 15:45–17:00",
    location: "Lapangan Upacara",
    capacity: 36,
  },
  {
    name: "Futsal",
    slug: "futsal",
    aliases: ["futsal", "sepak bola", "bola", "football"],
    interests: ["futsal", "sepak bola", "bola", "olahraga", "stamina", "strategi", "kompetisi", "tim", "bal", "tendang", "gawang"],
    description: "Futsal cocok untuk mengembangkan teknik, strategi, stamina, kerja sama, dan sportivitas di lapangan.",
    schedule: "Jumat, pukul 15:45–17:00",
    location: "Lapangan Futsal",
    capacity: 30,
  },
];

function normalize(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsAny(query: string, keywords: string[]) {
  return keywords.some((keyword) => query.includes(normalize(keyword)));
}

function findProgram(query: string) {
  return extracurricularKeywordDataset.find((program) =>
    containsAny(query, program.aliases),
  );
}

function detailAction(program: KeywordEntry) {
  return { href: `/eskul/${program.slug}`, label: `Lihat ${program.name}` };
}

function recommendationReply(query: string): ChatbotReply | null {
  const ranked = extracurricularKeywordDataset
    .map((program) => ({
      program,
      score: program.interests.reduce(
        (score, keyword) =>
          score + (query.includes(normalize(keyword)) ? 1 : 0),
        0,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;
  const bestScore = ranked[0].score;
  const recommendations = ranked
    .filter((entry) => entry.score === bestScore)
    .slice(0, 3)
    .map((entry) => entry.program);
  const primary = recommendations[0];

  return {
    text: `Berdasarkan minat yang kamu sebutkan, ${recommendations
      .map((item) => item.name)
      .join(" dan ")} sangat cocok untuk kamu! ${primary.description}`,
    action: detailAction(primary),
  };
}

export function getEskulChatbotReply(message: string): ChatbotReply {
  const query = normalize(message);
  if (!query) {
    return {
      text: "Tulis pertanyaanmu dulu ya! Contoh: “jadwal ITC kapan?” atau “bingung pilih ekskul”.",
    };
  }

  if (
    containsAny(query, [
      "halo",
      "hallo",
      "hello",
      "hai",
      "hi",
      "hey",
      "selamat pagi",
      "selamat siang",
      "selamat sore",
      "selamat malam",
    ])
  ) {
    return {
      text: "Halo! Aku EksiBot. Aku bisa bantu cari info ekskul, jadwal, lokasi, sisa kuota, serta memberikan rekomendasi ekskul terbaik sesuai minatmu.",
    };
  }

  if (containsAny(query, ["terima kasih", "makasih", "thanks", "thank you"])) {
    return {
      text: "Sama-sama! Semoga kamu menemukan ekskul yang paling pas dan menyenangkan ya! 😊",
    };
  }

  if (
    containsAny(query, [
      "exisel",
      "eksi sel",
      "website ini",
      "aplikasi ini",
      "platform ini",
    ])
  ) {
    if (
      containsAny(query, [
        "apa",
        "tentang",
        "fungsi",
        "untuk apa",
        "siapa",
        "jelaskan",
        "kegunaan",
        "bisa apa",
      ]) ||
      query === "exisel"
    ) {
      return {
        text: "EXISEL adalah platform informasi resmi ekstrakurikuler SMKN 69 Jakarta. Di sini siswa bisa melihat 8 pilihan ekskul, mengecek jadwal, mendaftar, memantau status, serta mengisi presensi digital.",
        action: { href: "/ekstrakulikuler", label: "Jelajahi EXISEL" },
      };
    }

    return {
      text: "Kamu sedang menggunakan EXISEL, portal pusat ekstrakurikuler SMKN 69 Jakarta. Tanyakan saja seputar ekskul, jadwal, sisa kuota, pendaftaran, atau rekomendasi minatmu.",
    };
  }

  if (containsAny(query, ["namsel", "nam sel", "kawan namsel"])) {
    return {
      text: "Namsel adalah sebutan atau sapaan hangat untuk komunitas warga SMKN 69 Jakarta (Kawan Namsel).",
    };
  }

  if (containsAny(query, ["smkn 69", "smk 69", "smkn69", "smk negeri 69"])) {
    if (
      containsAny(query, [
        "dimana",
        "di mana",
        "alamat",
        "lokasi",
        "terletak",
        "tempat",
      ])
    ) {
      return {
        text: "SMKN 69 Jakarta beralamat di Jl. Dr. Radjiman Widyodiningrat, Rawabadung, RT 007/RW 007, Kelurahan Jatinegara, Kecamatan Cakung, Jakarta Timur.",
      };
    }

    return {
      text: "SMKN 69 Jakarta adalah sekolah menengah kejuruan negeri di Jakarta Timur. EXISEL hadir untuk membantu siswa mengeksplorasi kegiatan ekstrakurikuler sekolah.",
    };
  }

  // Check confusion or recommendation intent
  const isAskingRecommendation = containsAny(query, [
    "bingung",
    "rekomendasi",
    "saran",
    "pilih apa",
    "mau pilih",
    "pilih ekskul",
    "pilihkan",
    "bantu pilih",
    "bingung milih",
    "bagus mana",
    "cocok mana",
    "milih apa",
  ]);

  if (isAskingRecommendation) {
    const recommendation = recommendationReply(query);
    if (recommendation) return recommendation;

    return {
      text: "Kalau kamu bingung mau pilih ekskul apa, coba sesuaikan dengan minatmu:\n\n• 💻 **Suka Komputer & Coding**: ITC\n• ⚽ **Suka Olahraga & Tim**: Basket atau Futsal\n• 🏥 **Suka Menolong & Kesehatan**: PMR Wira\n• 🗣️ **Suka Bahasa & Budaya**: English Club atau Nihon\n• 🇮🇩 **Suka Disiplin & Kepemimpinan**: Paskibra atau Pramuka\n\nCeritakan minat yang kamu sukai agar aku bisa merekomendasikan ekskul yang paling pas!",
      action: { href: "/ekstrakulikuler", label: "Lihat Semua Ekskul" },
    };
  }

  const program = findProgram(query);
  if (program) {
    if (
      containsAny(query, ["jadwal", "hari", "jam", "kapan", "pukul", "waktu"])
    ) {
      return {
        text: `Jadwal ${program.name}: ${program.schedule}, berlokasi di ${program.location}.`,
        action: detailAction(program),
      };
    }
    if (
      containsAny(query, ["lokasi", "tempat", "ruang", "dimana", "di mana"])
    ) {
      return {
        text: `${program.name} latihan di ${program.location}. Jadwal rutin: ${program.schedule}.`,
        action: detailAction(program),
      };
    }
    if (
      containsAny(query, [
        "kuota",
        "kapasitas",
        "kursi",
        "maksimal",
        "berapa siswa",
      ])
    ) {
      return {
        text: `Kapasitas maksimal ${program.name} adalah ${program.capacity} siswa. Sisa kuota terbaru dapat kamu cek di katalog ekskul.`,
        action: { href: "/ekstrakulikuler", label: "Cek Kuota" },
      };
    }
    return {
      text: `${program.description} Jadwal latihan: ${program.schedule} di ${program.location}.`,
      action: detailAction(program),
    };
  }

  if (
    containsAny(query, [
      "daftar",
      "pendaftaran",
      "gabung",
      "join",
      "cara masuk",
    ])
  ) {
    return {
      text: "Untuk mendaftar, buka katalog Pilihan Ekskul, klik ekskul yang kamu inginkan, lalu tekan tombol 'Daftar sekarang'.",
      action: { href: "/ekstrakulikuler", label: "Pilih Ekskul" },
    };
  }

  const recommendation = recommendationReply(query);
  if (recommendation) return recommendation;

  if (
    containsAny(query, [
      "apa saja",
      "semua ekskul",
      "daftar ekskul",
      "pilihan ekskul",
      "ada ekskul",
    ]) &&
    !containsAny(query, [
      "jadwal",
      "hari",
      "kapan",
      "lokasi",
      "tempat",
      "ruang",
      "dimana",
      "di mana",
      "kuota",
      "kapasitas",
      "kursi",
    ])
  ) {
    return {
      text: `SMKN 69 Jakarta memiliki 8 pilihan ekskul: ${extracurricularKeywordDataset
        .map((entry) => entry.name)
        .join(", ")}.`,
      action: { href: "/ekstrakulikuler", label: "Lihat Semua Ekskul" },
    };
  }

  if (containsAny(query, ["lokasi", "tempat", "ruang", "dimana", "di mana"])) {
    return {
      text: "Lokasi latihan: PMR di Ruang UKS; English Club di Lab Bahasa; Nihon di Ruang Bahasa Jepang; Basket di Lapangan Basket; ITC di Lab Komputer 2; Paskibra di Lapangan Sekolah; Pramuka di Lapangan Upacara; Futsal di Lapangan Futsal.",
      action: { href: "/ekstrakulikuler", label: "Detail Lokasi" },
    };
  }

  if (
    containsAny(query, [
      "kuota",
      "kapasitas",
      "kursi",
      "berapa siswa",
      "maksimal",
    ])
  ) {
    return {
      text: "Kapasitas maksimal: PMR 32 siswa; English Club 28; Nihon 28; Basket 24; ITC 30; Paskibra 36; Pramuka 36; Futsal 30 siswa. Cek sisa kuota terbaru di katalog.",
      action: { href: "/ekstrakulikuler", label: "Cek Sisa Kuota" },
    };
  }

  if (containsAny(query, ["jadwal", "hari", "kapan"])) {
    return {
      text: "Jadwal ekskul: PMR (Senin & Selasa), Basket (Senin), Nihon (Selasa), Pramuka (Rabu), English Club (Kamis), ITC & Futsal (Jumat), serta Paskibra (Minggu). Semua mulai pukul 15:45.",
      action: { href: "/ekstrakulikuler", label: "Lihat Jadwal Lengkap" },
    };
  }

  // Friendly Fallback for out-of-context queries
  return {
    text: "Maaf ya, aku belum bisa menjawab pertanyaan kamu. Saat ini Eksibot disiapkan khusus untuk membantu memberikan informasi dan rekomendasi ekstrakurikuler di SMKN 69 Jakarta. Coba tanyakan seputar rekomendasi ekskul, jadwal, lokasi, atau cara daftar ya! 😊",
    action: { href: "/ekstrakulikuler", label: "Lihat Katalog Ekskul" },
  };
}
