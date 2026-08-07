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
    aliases: ["pmr", "palang merah", "palang merah remaja", "kesehatan"],
    interests: ["menolong", "kesehatan", "medis", "pertolongan pertama", "kemanusiaan", "sosial"],
    description: "PMR cocok untuk belajar pertolongan pertama, kesehatan remaja, kerja tim, dan aksi kemanusiaan.",
    schedule: "Senin dan Selasa, pukul 15:45–17:00",
    location: "Ruang UKS",
    capacity: 32,
  },
  {
    name: "English Club",
    slug: "english-club",
    aliases: ["english club", "english", "bahasa inggris", "inggris"],
    interests: ["bahasa inggris", "speaking", "presentasi", "debat", "public speaking", "bahasa"],
    description: "English Club cocok untuk melatih speaking, presentasi, kreativitas, dan kepercayaan diri berbahasa Inggris.",
    schedule: "Kamis, pukul 15:45–17:00",
    location: "Lab Bahasa",
    capacity: 28,
  },
  {
    name: "Nihon",
    slug: "nihon",
    aliases: ["nihon", "jepang", "bahasa jepang", "budaya jepang", "anime"],
    interests: ["bahasa jepang", "jepang", "budaya", "anime", "manga", "bahasa", "kreatif"],
    description: "Nihon mengajakmu menjelajahi bahasa, budaya, dan karya kreatif Jepang bersama teman satu minat.",
    schedule: "Selasa, pukul 15:45–17:00",
    location: "Ruang Bahasa Jepang",
    capacity: 28,
  },
  {
    name: "Basket",
    slug: "basket",
    aliases: ["basket", "basketball", "bola basket"],
    interests: ["basket", "olahraga", "bola", "stamina", "kompetisi", "atletik", "tim"],
    description: "Basket cocok untuk meningkatkan teknik bermain, kebugaran, kerja sama tim, dan mental bertanding.",
    schedule: "Senin, pukul 15:45–17:00",
    location: "Lapangan Basket",
    capacity: 24,
  },
  {
    name: "ITC",
    slug: "itc",
    aliases: ["itc", "it club", "komputer", "teknologi", "coding"],
    interests: ["coding", "programming", "komputer", "teknologi", "desain digital", "website", "aplikasi", "robot"],
    description: "ITC adalah ruang untuk mengeksplorasi coding, desain digital, perangkat komputer, dan teknologi.",
    schedule: "Jumat, pukul 15:45–17:00",
    location: "Lab Komputer 2",
    capacity: 30,
  },
  {
    name: "Paskibra",
    slug: "paskibra",
    aliases: ["paskibra", "paskibraka", "baris berbaris", "pbb"],
    interests: ["disiplin", "kepemimpinan", "baris berbaris", "pbb", "upacara", "fisik", "nasionalisme"],
    description: "Paskibra membangun disiplin, kepemimpinan, kekompakan, ketangkasan, dan kemampuan baris-berbaris.",
    schedule: "Selasa, pukul 15:45–17:00",
    location: "Lapangan Upacara",
    capacity: 36,
  },
  {
    name: "Pramuka",
    slug: "pramuka",
    aliases: ["pramuka", "kepanduan", "scout"],
    interests: ["alam", "kepanduan", "kemah", "kemandirian", "kepemimpinan", "tali temali", "petualangan"],
    description: "Pramuka membentuk karakter, kemandirian, kepemimpinan, dan cinta tanah air melalui kegiatan kepanduan.",
    schedule: "Rabu, pukul 15:45–17:00",
    location: "Lapangan Upacara",
    capacity: 36,
  },
  {
    name: "Futsal",
    slug: "futsal",
    aliases: ["futsal", "sepak bola", "bola", "football"],
    interests: ["futsal", "sepak bola", "olahraga", "bola", "stamina", "strategi", "kompetisi", "tim"],
    description: "Futsal cocok untuk mengembangkan teknik, strategi, stamina, kerja sama, dan sportivitas di lapangan.",
    schedule: "Jumat, pukul 15:45–17:00",
    location: "Lapangan Futsal",
    capacity: 30,
  },
];

function normalize(value: string) {
  return value.toLocaleLowerCase("id-ID").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function containsAny(query: string, keywords: string[]) {
  return keywords.some((keyword) => query.includes(normalize(keyword)));
}

function findProgram(query: string) {
  return extracurricularKeywordDataset.find((program) => containsAny(query, program.aliases));
}

function detailAction(program: KeywordEntry) {
  return { href: `/eskul/${program.slug}`, label: `Lihat ${program.name}` };
}

function recommendationReply(query: string): ChatbotReply | null {
  const ranked = extracurricularKeywordDataset
    .map((program) => ({
      program,
      score: program.interests.reduce((score, keyword) => score + (query.includes(normalize(keyword)) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;
  const bestScore = ranked[0].score;
  const recommendations = ranked.filter((entry) => entry.score === bestScore).slice(0, 3).map((entry) => entry.program);
  const primary = recommendations[0];

  return {
    text: `Dari minat yang kamu ceritakan, ${recommendations.map((item) => item.name).join(" dan ")} paling cocok untuk kamu. ${primary.description}`,
    action: detailAction(primary),
  };
}

export function getEskulChatbotReply(message: string): ChatbotReply {
  const query = normalize(message);
  if (!query) return { text: "Tulis pertanyaanmu dulu, ya. Contoh: jadwal ITC kapan?" };

  if (containsAny(query, ["halo", "hallo", "hello", "hai", "hi", "hey", "selamat pagi", "selamat siang", "selamat sore", "selamat malam"])) {
    return { text: "Halo! Aku EksiBot. Aku bisa bantu cari ekskul, jadwal, lokasi, kapasitas, rekomendasi minat, dan cara daftar." };
  }
  if (containsAny(query, ["terima kasih", "makasih", "thanks", "thank you"])) {
    return { text: "Sama-sama! Semoga kamu menemukan ekskul yang paling pas, ya." };
  }

  if (containsAny(query, ["exisel", "eksi sel", "website ini", "aplikasi ini", "platform ini"])) {
    if (containsAny(query, ["apa", "tentang", "fungsi", "untuk apa", "siapa", "jelaskan", "kegunaan", "bisa apa"]) || query === "exisel") {
      return {
        text: "EXISEL adalah platform informasi ekstrakurikuler SMKN 69 Jakarta. Di sini siswa bisa menjelajahi 8 ekskul, melihat jadwal dan kuota, mendaftar, memantau status, serta mengisi kehadiran.",
        action: { href: "/ekstrakulikuler", label: "Jelajahi EXISEL" },
      };
    }

    return {
      text: "Kamu sedang menggunakan EXISEL, pusat informasi dan layanan ekstrakurikuler SMKN 69 Jakarta. Tanyakan saja ekskul, jadwal, kuota, pendaftaran, atau rekomendasi minatmu.",
    };
  }

  if (containsAny(query, ["namsel", "nam sel", "kawan namsel"])) {
    return {
      text: "Namsel adalah nama atau sapaan komunitas warga SMKN 69 Jakarta. Situs resmi sekolah juga menggunakan sapaan “Kawan Namsel” untuk menyebut siswa dan keluarga besar SMKN 69 Jakarta.",
    };
  }

  if (containsAny(query, ["smkn 69", "smk 69", "smkn69", "smk negeri 69"])) {
    if (containsAny(query, ["dimana", "di mana", "alamat", "lokasi", "terletak", "tempat"])) {
      return {
        text: "SMKN 69 Jakarta beralamat di Jl. Dr. Radjiman Widyodiningrat, Rawabadung, RT 007/RW 007, Kelurahan Jatinegara, Kecamatan Cakung, Jakarta Timur.",
      };
    }

    return {
      text: "SMKN 69 Jakarta adalah sekolah menengah kejuruan negeri di Kecamatan Cakung, Jakarta Timur. EXISEL membantu siswa SMKN 69 menjelajahi dan mengelola kegiatan ekstrakurikuler.",
    };
  }

  const program = findProgram(query);
  if (program) {
    if (containsAny(query, ["jadwal", "hari", "jam", "kapan", "pukul", "waktu"])) {
      return { text: `Jadwal ${program.name}: ${program.schedule}, di ${program.location}.`, action: detailAction(program) };
    }
    if (containsAny(query, ["lokasi", "tempat", "ruang", "dimana", "di mana"])) {
      return { text: `${program.name} berlatih di ${program.location}. Jadwalnya ${program.schedule}.`, action: detailAction(program) };
    }
    if (containsAny(query, ["kuota", "kapasitas", "kursi", "maksimal", "berapa siswa"])) {
      return { text: `Kapasitas maksimal ${program.name} adalah ${program.capacity} siswa. Sisa kuota terbaru bisa kamu lihat di katalog ekskul.`, action: { href: "/ekstrakulikuler", label: "Cek kuota" } };
    }
    return { text: `${program.description} Jadwalnya ${program.schedule} di ${program.location}.`, action: detailAction(program) };
  }

  if (containsAny(query, ["daftar", "pendaftaran", "gabung", "join", "cara masuk"])) {
    return { text: "Untuk mendaftar, buka menu Pilihan ekskul, pilih ekskul yang kamu minati, buka detailnya, lalu tekan Daftar sekarang.", action: { href: "/ekstrakulikuler", label: "Pilih ekskul" } };
  }

  const recommendation = recommendationReply(query);
  if (recommendation && containsAny(query, ["suka", "minat", "cocok", "rekomendasi", "ingin", "mau", "hobi"])) return recommendation;

  if (
    containsAny(query, ["apa saja", "semua ekskul", "daftar ekskul", "pilihan ekskul", "ada ekskul"]) &&
    !containsAny(query, ["jadwal", "hari", "kapan", "lokasi", "tempat", "ruang", "dimana", "di mana", "kuota", "kapasitas", "kursi"])
  ) {
    return { text: `Ada ${extracurricularKeywordDataset.length} pilihan: ${extracurricularKeywordDataset.map((entry) => entry.name).join(", ")}.`, action: { href: "/ekstrakulikuler", label: "Lihat semuanya" } };
  }

  if (containsAny(query, ["lokasi", "tempat", "ruang", "dimana", "di mana"])) {
    return {
      text: "Lokasi latihan: PMR di Ruang UKS; English Club di Lab Bahasa; Nihon di Ruang Bahasa Jepang; Basket di Lapangan Basket; ITC di Lab Komputer 2; Paskibra dan Pramuka di Lapangan Upacara; Futsal di Lapangan Futsal.",
      action: { href: "/ekstrakulikuler", label: "Lihat detail lokasi" },
    };
  }

  if (containsAny(query, ["kuota", "kapasitas", "kursi", "berapa siswa", "maksimal"])) {
    return {
      text: "Kapasitas maksimal: PMR 32 siswa; English Club 28; Nihon 28; Basket 24; ITC 30; Paskibra 36; Pramuka 36; dan Futsal 30 siswa. Sisa kuota terbaru tersedia di katalog.",
      action: { href: "/ekstrakulikuler", label: "Cek sisa kuota" },
    };
  }

  if (containsAny(query, ["jadwal", "hari", "kapan"])) {
    return { text: "Jadwal singkat: PMR Senin–Selasa, Basket Senin, Nihon dan Paskibra Selasa, Pramuka Rabu, English Club Kamis, serta ITC dan Futsal Jumat. Semua mulai pukul 15:45.", action: { href: "/ekstrakulikuler", label: "Lihat jadwal lengkap" } };
  }
  if (recommendation) return recommendation;

  if (containsAny(query, ["rekomendasi", "cocok", "minat", "pilihkan", "pilih ekskul"])) {
    return {
      text: "Ceritakan minatmu agar aku bisa merekomendasikan ekskul. Contohnya: “saya suka coding”, “saya suka olahraga”, “saya tertarik bahasa”, “saya suka menolong”, atau “saya suka kegiatan alam”.",
    };
  }

  return { text: "Maaf, aku belum menemukan keyword yang cocok. Coba sebutkan nama ekskul atau tanyakan jadwal, lokasi, kuota, cara daftar, atau rekomendasi berdasarkan minatmu." };
}
