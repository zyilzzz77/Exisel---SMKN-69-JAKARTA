import aliasesData from "@/lib/chatbot/data/aliases.json";
import slangData from "@/lib/chatbot/data/slang.json";

export type ChatbotReply = {
  text: string;
  action?: { href: string; label: string };
};

export type ChatbotIntent =
  | "ask_extracurricular_list"
  | "ask_extracurricular_detail"
  | "ask_schedule"
  | "ask_location"
  | "ask_registration"
  | "ask_contact"
  | "ask_cost"
  | "ask_requirement"
  | "ask_capacity"
  | "ask_recommendation"
  | "compare_extracurricular"
  | "follow_up"
  | "unknown_school_info"
  | "out_of_scope";

export type SocialIntent =
  | "greeting"
  | "gratitude"
  | "positive_reaction"
  | "negative_reaction"
  | "acknowledgement"
  | "laughter";

export type ChatbotContext = {
  lastEntitySlug: string | null;
  recentEntitySlugs: string[];
  lastIntent: ChatbotIntent | null;
};

export type ChatbotAnalysis = {
  normalizedMessage: string;
  intents: ChatbotIntent[];
  entitySlugs: string[];
  socialIntent: SocialIntent | null;
  subQuestionCount: number;
  missingFields: string[];
  usedContext: boolean;
  fallbackUsed: boolean;
};

export type ChatbotTelemetry = {
  unanswered?: {
    timestamp: string;
    intents: ChatbotIntent[];
    entitySlugs: string[];
    missingFields: string[];
    queryLength: number;
  };
  slangCandidate?: {
    phrase: string;
    predictedIntent: SocialIntent;
    confidence: number;
    approved: false;
  };
};

export type ChatbotResult = ChatbotReply & {
  context: ChatbotContext;
  analysis: ChatbotAnalysis;
  telemetry?: ChatbotTelemetry;
};

type Schedule = {
  days: string[];
  label: string;
  time: string;
};

export type ExtracurricularRecord = {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  interests: string[];
  category: "olahraga" | "kesehatan" | "bahasa" | "teknologi" | "kepemimpinan";
  description: string;
  schedule: Schedule | null;
  location: string | null;
  capacity: number | null;
  coach: string | null;
  contact: string | null;
  registration: string | null;
  requirements: string[] | null;
  cost: string | null;
  source: "admin";
  lastUpdated: string;
  status: "verified";
};

type SlangEntry = {
  normalized: string;
  intent: SocialIntent | null;
};

const aliases = aliasesData as Record<string, string[]>;
const slang = slangData as Record<string, SlangEntry>;
const registration =
  "Buka katalog Pilihan Ekskul, pilih ekskul yang diinginkan, lalu tekan tombol Daftar sekarang.";

export const extracurricularKeywordDataset: ExtracurricularRecord[] = [
  {
    id: "pmr",
    name: "PMR",
    slug: "pmr",
    aliases: aliases.pmr,
    interests: ["menolong", "kesehatan", "medis", "pertolongan pertama", "kemanusiaan", "sosial", "uks", "donor"],
    category: "kesehatan",
    description: "PMR cocok untuk belajar pertolongan pertama, kesehatan remaja, kerja tim, dan aksi kemanusiaan.",
    schedule: { days: ["MONDAY", "TUESDAY"], label: "Senin dan Selasa", time: "15:45–17:00" },
    location: "Ruang UKS",
    capacity: 32,
    coach: null,
    contact: null,
    registration,
    requirements: null,
    cost: null,
    source: "admin",
    lastUpdated: "2026-08-04",
    status: "verified",
  },
  {
    id: "english-club",
    name: "English Club",
    slug: "english-club",
    aliases: aliases["english-club"],
    interests: ["bahasa inggris", "speaking", "presentasi", "debat", "public speaking", "bahasa"],
    category: "bahasa",
    description: "English Club cocok untuk melatih speaking, presentasi, kreativitas, dan kepercayaan diri berbahasa Inggris.",
    schedule: { days: ["THURSDAY"], label: "Kamis", time: "15:45–17:00" },
    location: "Lab Bahasa",
    capacity: 28,
    coach: null,
    contact: null,
    registration,
    requirements: null,
    cost: null,
    source: "admin",
    lastUpdated: "2026-08-04",
    status: "verified",
  },
  {
    id: "nihon",
    name: "Nihon",
    slug: "nihon",
    aliases: aliases.nihon,
    interests: ["bahasa jepang", "jepang", "budaya", "anime", "manga", "kreatif", "cosplay", "kanji"],
    category: "bahasa",
    description: "Nihon mengajakmu menjelajahi bahasa, budaya, dan karya kreatif Jepang bersama teman satu minat.",
    schedule: { days: ["TUESDAY"], label: "Selasa", time: "15:45–17:00" },
    location: "Ruang Bahasa Jepang",
    capacity: 28,
    coach: null,
    contact: null,
    registration,
    requirements: null,
    cost: null,
    source: "admin",
    lastUpdated: "2026-08-04",
    status: "verified",
  },
  {
    id: "basket",
    name: "Basket",
    slug: "basket",
    aliases: aliases.basket,
    interests: ["basket", "olahraga", "bola", "stamina", "kompetisi", "atletik", "tim", "lapangan"],
    category: "olahraga",
    description: "Basket cocok untuk meningkatkan teknik bermain, kebugaran, kerja sama tim, dan mental bertanding.",
    schedule: { days: ["MONDAY"], label: "Senin", time: "15:45–17:00" },
    location: "Lapangan Basket",
    capacity: 24,
    coach: null,
    contact: null,
    registration,
    requirements: null,
    cost: null,
    source: "admin",
    lastUpdated: "2026-08-04",
    status: "verified",
  },
  {
    id: "itc",
    name: "ITC",
    slug: "itc",
    aliases: aliases.itc,
    interests: ["coding", "programming", "komputer", "teknologi", "desain digital", "website", "aplikasi", "robot", "laptop", "code"],
    category: "teknologi",
    description: "ITC adalah ruang untuk mengeksplorasi coding, desain digital, perangkat komputer, dan teknologi.",
    schedule: { days: ["FRIDAY"], label: "Jumat", time: "15:45–17:00" },
    location: "Lab Komputer 2",
    capacity: 30,
    coach: null,
    contact: null,
    registration,
    requirements: null,
    cost: null,
    source: "admin",
    lastUpdated: "2026-08-04",
    status: "verified",
  },
  {
    id: "paskibra",
    name: "Paskibra",
    slug: "paskibra",
    aliases: aliases.paskibra,
    interests: ["disiplin", "kepemimpinan", "baris berbaris", "pbb", "upacara", "fisik", "nasionalisme"],
    category: "kepemimpinan",
    description: "Paskibra membangun disiplin, kepemimpinan, kekompakan, ketangkasan, dan kemampuan baris-berbaris.",
    schedule: { days: ["SUNDAY"], label: "Minggu", time: "15:45–17:00" },
    location: "Lapangan Sekolah",
    capacity: 36,
    coach: null,
    contact: null,
    registration,
    requirements: null,
    cost: null,
    source: "admin",
    lastUpdated: "2026-08-09",
    status: "verified",
  },
  {
    id: "pramuka",
    name: "Pramuka",
    slug: "pramuka",
    aliases: aliases.pramuka,
    interests: ["alam", "kepanduan", "kemah", "kemandirian", "kepemimpinan", "tali temali", "petualangan", "camping", "outbound"],
    category: "kepemimpinan",
    description: "Pramuka membentuk karakter, kemandirian, kepemimpinan, dan cinta tanah air melalui kegiatan kepanduan.",
    schedule: { days: ["WEDNESDAY"], label: "Rabu", time: "15:45–17:00" },
    location: "Lapangan Upacara",
    capacity: 36,
    coach: null,
    contact: null,
    registration,
    requirements: null,
    cost: null,
    source: "admin",
    lastUpdated: "2026-08-04",
    status: "verified",
  },
  {
    id: "futsal",
    name: "Futsal",
    slug: "futsal",
    aliases: aliases.futsal,
    interests: ["futsal", "sepak bola", "bola", "olahraga", "stamina", "strategi", "kompetisi", "tim", "gawang"],
    category: "olahraga",
    description: "Futsal cocok untuk mengembangkan teknik, strategi, stamina, kerja sama, dan sportivitas di lapangan.",
    schedule: { days: ["FRIDAY"], label: "Jumat", time: "15:45–17:00" },
    location: "Lapangan Futsal",
    capacity: 30,
    coach: null,
    contact: null,
    registration,
    requirements: null,
    cost: null,
    source: "admin",
    lastUpdated: "2026-08-04",
    status: "verified",
  },
];

const intentKeywords: Partial<Record<ChatbotIntent, string[]>> = {
  ask_schedule: ["jadwal", "jadwalnya", "hari apa", "jam berapa", "kapan", "pukul", "waktu", "latihan kapan"],
  ask_location: ["lokasi", "lokasinya", "tempat", "tempatnya", "ruang", "di mana", "latihan dimana", "latihannya dimana"],
  ask_registration: ["daftar", "daftarnya", "pendaftaran", "gabung", "join", "cara masuk", "daftarinnya"],
  ask_contact: ["kontak", "kontaknya", "hubungi", "nomor", "pembina", "pembinanya", "pengurus", "siapa yang harus"],
  ask_cost: ["biaya", "biayanya", "bayar", "gratis", "uang", "iuran"],
  ask_requirement: ["syarat", "syaratnya", "pemula", "boleh ikut", "persyaratan", "harus bisa"],
  ask_capacity: ["kuota", "kuotanya", "kapasitas", "kursi", "maksimal", "berapa siswa", "sisa kuota"],
  ask_recommendation: ["rekomendasi", "saran", "bingung pilih", "bingung memilih", "pilih apa", "pilihkan", "bantu pilih", "bagusnya", "cocok mana", "saya suka", "aku suka", "minat saya"],
};

const socialKeywords: Record<SocialIntent, string[]> = {
  greeting: ["halo", "hallo", "hola", "hello", "hai", "hi", "hey", "selamat pagi", "selamat siang", "selamat sore", "selamat malam"],
  gratitude: ["terima kasih", "thank you", "tysm"],
  positive_reaction: ["mantap", "keren", "nice", "cakep", "sip banget", "oke banget", "jelas", "good", "lanjut"],
  negative_reaction: ["bingung", "tidak ngerti", "kurang jelas", "salah", "tidak puas"],
  acknowledgement: ["oke", "ok", "siap", "noted", "paham", "ngerti", "iya", "aman"],
  laughter: ["tertawa", "haha", "hehe", "xixi"],
};

const socialReplies: Record<SocialIntent, string> = {
  greeting: "Halo! Mau tanya soal ekskul apa? 👋",
  gratitude: "Sama-sama 😄 Kalau masih ada yang mau ditanyain soal ekskul, gas aja.",
  positive_reaction: "Mantap 😄",
  negative_reaction: "Bagian mana yang masih membingungkan? Sebut nama ekskul dan info yang ingin kamu cek ya.",
  acknowledgement: "Siap 👍",
  laughter: "Wkwk 😄",
};

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function hasPhrase(value: string, phrase: string) {
  return ` ${value} `.includes(` ${phrase} `);
}

function hasAny(value: string, phrases: string[]) {
  return phrases.some((phrase) => hasPhrase(value, normalizeChatbotMessage(phrase)));
}

export function normalizeChatbotMessage(value: string) {
  let normalized = value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z])\1{2,}/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  for (const [original, entry] of Object.entries(slang).sort(
    ([left], [right]) => right.length - left.length,
  )) {
    normalized = ` ${normalized} `
      .replaceAll(` ${original} `, ` ${entry.normalized} `)
      .trim()
      .replace(/\s+/g, " ");
  }

  return normalized;
}

function resolveEntities(query: string) {
  return extracurricularKeywordDataset
    .map((program) => ({
      program,
      position: program.aliases.reduce((earliest, alias) => {
        const position = ` ${query} `.indexOf(
          ` ${normalizeChatbotMessage(alias)} `,
        );
        return position >= 0 ? Math.min(earliest, position) : earliest;
      }, Number.POSITIVE_INFINITY),
    }))
    .filter(({ position }) => Number.isFinite(position))
    .sort((left, right) => left.position - right.position)
    .map(({ program }) => program);
}

function detectSocialIntent(query: string): SocialIntent | null {
  for (const intent of Object.keys(socialKeywords) as SocialIntent[]) {
    if (hasAny(query, socialKeywords[intent])) return intent;
  }
  return null;
}

function levenshtein(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );
  for (let index = 0; index <= left.length; index += 1) rows[index][0] = index;
  for (let index = 0; index <= right.length; index += 1) rows[0][index] = index;
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] +
          (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
  }
  return rows[left.length][right.length];
}

function detectFuzzySocialCandidate(query: string) {
  const tokens = query
    .split(" ")
    .filter((token) => token.length >= 4 && !["bang", "min", "bro", "kak"].includes(token));
  if (tokens.length === 0 || query.split(" ").length > 4) return null;

  const candidates: Array<{ phrase: string; intent: SocialIntent }> = [
    { phrase: "makasih", intent: "gratitude" },
    { phrase: "mantap", intent: "positive_reaction" },
    { phrase: "keren", intent: "positive_reaction" },
    { phrase: "siap", intent: "acknowledgement" },
    { phrase: "wkwk", intent: "laughter" },
  ];

  let best: { token: string; intent: SocialIntent; confidence: number } | null = null;
  for (const token of tokens) {
    for (const candidate of candidates) {
      const distance = levenshtein(token, candidate.phrase);
      const confidence = 1 - distance / Math.max(token.length, candidate.phrase.length);
      if (confidence >= 0.55 && (!best || confidence > best.confidence)) {
        best = { token, intent: candidate.intent, confidence };
      }
    }
  }
  return best;
}

function detectIntents(query: string, entityCount: number) {
  const intents: ChatbotIntent[] = [];
  for (const [intent, keywords] of Object.entries(intentKeywords) as Array<
    [ChatbotIntent, string[]]
  >) {
    if (hasAny(query, keywords)) intents.push(intent);
  }

  if (
    hasAny(query, ["ekstrakurikuler apa saja", "daftar ekstrakurikuler", "semua ekstrakurikuler", "pilihan ekstrakurikuler", "ada ekstrakurikuler apa"])
  ) {
    intents.push("ask_extracurricular_list");
  }
  if (
    entityCount >= 2 &&
    hasAny(query, ["bandingkan", "dibanding", "atau", "versus", "vs", "bentrok", "bagus mana", "bagusan"])
  ) {
    intents.push("compare_extracurricular");
  }
  if (
    hasAny(query, ["kepala sekolah", "jurusan sekolah", "spp", "uang sekolah"])
  ) {
    intents.push("unknown_school_info");
  }
  if (
    hasAny(query, ["hacking", "hack wifi", "bobol wifi", "buat malware", "curi password"])
  ) {
    intents.push("out_of_scope");
  }
  if (
    entityCount > 0 &&
    (intents.length === 0 || hasAny(query, ["apa itu", "tentang", "ada tidak", "ada kah", "jelaskan"]))
  ) {
    intents.push("ask_extracurricular_detail");
  }
  return unique(intents);
}

function detailAction(program: ExtracurricularRecord) {
  return { href: `/eskul/${program.slug}`, label: `Lihat ${program.name}` };
}

function formatSchedule(program: ExtracurricularRecord) {
  return program.schedule
    ? `${program.schedule.label}, pukul ${program.schedule.time}`
    : null;
}

function compareSchedules(programs: ExtracurricularRecord[]) {
  if (programs.length < 2) return null;
  const [first, second] = programs;
  if (!first.schedule || !second.schedule) {
    return `Bentrok jadwal ${first.name} dan ${second.name} belum bisa dipastikan karena ada data jadwal yang belum tersedia.`;
  }
  const sharedDays = first.schedule.days.filter((day) =>
    second.schedule?.days.includes(day),
  );
  return sharedDays.length > 0 && first.schedule.time === second.schedule.time
    ? `Jadwal ${first.name} dan ${second.name} berpotensi bentrok: keduanya berlangsung pada ${first.schedule.label === second.schedule.label ? first.schedule.label : "hari yang sama"} pukul ${first.schedule.time}.`
    : `Jadwal rutin ${first.name} dan ${second.name} tidak bentrok berdasarkan data yang tersedia.`;
}

function recommendationPrograms(query: string) {
  return extracurricularKeywordDataset
    .map((program) => ({
      program,
      score: program.interests.reduce(
        (score, interest) =>
          score + (hasPhrase(query, normalizeChatbotMessage(interest)) ? 1 : 0),
        0,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ program }) => program);
}

function missingText(program: ExtracurricularRecord, field: string) {
  return `Informasi ${field} ${program.name} belum tersedia di data EXISEL.`;
}

function answerProgramIntent(
  program: ExtracurricularRecord,
  intent: ChatbotIntent,
) {
  switch (intent) {
    case "ask_extracurricular_detail":
      return { text: program.description };
    case "ask_schedule": {
      const value = formatSchedule(program);
      return value
        ? { text: `Jadwal: ${value}.` }
        : { text: missingText(program, "jadwal"), missing: "jadwal" };
    }
    case "ask_location":
      return program.location
        ? { text: `Tempat: ${program.location}.` }
        : { text: missingText(program, "lokasi"), missing: "lokasi" };
    case "ask_registration":
      return program.registration
        ? { text: `Pendaftaran: ${program.registration}` }
        : { text: missingText(program, "pendaftaran"), missing: "pendaftaran" };
    case "ask_contact":
      return program.contact || program.coach
        ? { text: `Kontak/pembina: ${program.contact ?? program.coach}.` }
        : { text: missingText(program, "kontak atau pembina"), missing: "kontak" };
    case "ask_cost":
      return program.cost
        ? { text: `Biaya: ${program.cost}.` }
        : { text: missingText(program, "biaya"), missing: "biaya" };
    case "ask_requirement":
      return program.requirements
        ? { text: `Syarat: ${program.requirements.join(", ")}.` }
        : { text: missingText(program, "syarat untuk pemula"), missing: "syarat" };
    case "ask_capacity":
      return program.capacity !== null
        ? { text: `Kapasitas maksimal: ${program.capacity} siswa. Sisa kuota terbaru tersedia di katalog.` }
        : { text: missingText(program, "kapasitas"), missing: "kapasitas" };
    default:
      return null;
  }
}

function generalAnswer(intent: ChatbotIntent) {
  if (intent === "ask_extracurricular_list") {
    return `SMKN 69 Jakarta memiliki 8 pilihan ekskul: ${extracurricularKeywordDataset.map(({ name }) => name).join(", ")}.`;
  }
  if (intent === "ask_schedule") {
    return `Jadwal rutin:\n${extracurricularKeywordDataset
      .map((program) => `• ${program.name}: ${formatSchedule(program) ?? "belum tersedia"}`)
      .join("\n")}`;
  }
  if (intent === "ask_location") {
    return `Lokasi latihan:\n${extracurricularKeywordDataset
      .map((program) => `• ${program.name}: ${program.location ?? "belum tersedia"}`)
      .join("\n")}`;
  }
  if (intent === "ask_capacity") {
    return `Kapasitas maksimal:\n${extracurricularKeywordDataset
      .map((program) => `• ${program.name}: ${program.capacity ?? "belum tersedia"} siswa`)
      .join("\n")}`;
  }
  if (intent === "ask_registration") return registration;
  if (intent === "ask_contact") return "Data kontak dan nama pembina belum tersedia di EXISEL.";
  if (intent === "ask_cost") return "Data biaya ekskul belum tersedia di EXISEL.";
  if (intent === "ask_requirement") return "Data syarat khusus tiap ekskul belum tersedia di EXISEL.";
  return null;
}

function guessUnknownEntity(query: string) {
  const ignored = new Set([
    "ekstrakurikuler", "ada", "tidak", "apa", "kah", "jadwal", "kapan", "lokasi", "tempat", "di", "mana", "cara", "daftar", "biaya", "berapa", "tentang", "jelaskan", "min", "bang", "dong", "yang", "saya", "mau", "tanya",
  ]);
  const candidate = query
    .split(" ")
    .filter((token) => !ignored.has(token))
    .slice(0, 4)
    .join(" ");
  return candidate || null;
}

function nextContext(
  context: ChatbotContext,
  programs: ExtracurricularRecord[],
  intents: ChatbotIntent[],
) {
  if (programs.length === 0) return context;
  const slugs = unique(programs.map(({ slug }) => slug)).slice(-2);
  return {
    lastEntitySlug: slugs.at(-1) ?? context.lastEntitySlug,
    recentEntitySlugs: slugs,
    lastIntent: intents.at(-1) ?? context.lastIntent,
  };
}

export function createChatbotContext(): ChatbotContext {
  return { lastEntitySlug: null, recentEntitySlugs: [], lastIntent: null };
}

export function findDatasetScheduleConflicts(
  records: ExtracurricularRecord[] = extracurricularKeywordDataset,
) {
  const schedules = new Map<string, { label: string; programName: string }>();
  const conflicts: Array<{
    id: string;
    programName: string;
    schedules: [string, string];
  }> = [];

  for (const record of records) {
    if (!record.schedule) continue;
    const label = `${record.schedule.label}, ${record.schedule.time}`;
    const existing = schedules.get(record.id);
    if (existing && existing.label !== label) {
      conflicts.push({
        id: record.id,
        programName: record.name,
        schedules: [existing.label, label],
      });
    } else if (!existing) {
      schedules.set(record.id, { label, programName: record.name });
    }
  }

  return conflicts;
}

export function getChatbotTechnicalErrorReply(
  context: ChatbotContext = createChatbotContext(),
): ChatbotResult {
  return {
    text: "Lagi ada kendala memproses data ekskul. Coba kirim lagi pertanyaannya.",
    context,
    analysis: {
      ...baseAnalysis(""),
      fallbackUsed: true,
    },
  };
}

function baseAnalysis(normalizedMessage: string): ChatbotAnalysis {
  return {
    normalizedMessage,
    intents: [],
    entitySlugs: [],
    socialIntent: null,
    subQuestionCount: 0,
    missingFields: [],
    usedContext: false,
    fallbackUsed: false,
  };
}

export function getEskulChatbotReply(
  message: string,
  previousContext: ChatbotContext = createChatbotContext(),
): ChatbotResult {
  const query = normalizeChatbotMessage(message);
  const analysis = baseAnalysis(query);
  if (!query) {
    return {
      text: "Tulis pertanyaanmu dulu ya. Contoh: jadwal ITC kapan?",
      context: previousContext,
      analysis: { ...analysis, fallbackUsed: true },
    };
  }

  let programs = resolveEntities(query);
  let intents = detectIntents(query, programs.length);
  let socialIntent = detectSocialIntent(query);
  if (intents.includes("ask_recommendation")) socialIntent = null;
  const fuzzySocial = !socialIntent ? detectFuzzySocialCandidate(query) : null;
  if (fuzzySocial && intents.length === 0 && programs.length === 0) {
    socialIntent = fuzzySocial.intent;
  }

  const followUpRequested =
    programs.length === 0 &&
    (hasAny(query, ["jadwalnya", "tempatnya", "lokasinya", "biayanya", "daftarnya", "yang itu", "yang tadi"]) ||
      intents.some((intent) => ["ask_schedule", "ask_location", "ask_cost", "ask_registration", "ask_contact", "ask_requirement"].includes(intent)));

  let usedContext = false;
  if (followUpRequested && programs.length === 0) {
    if (
      hasAny(query, ["yang itu", "yang tadi"]) &&
      previousContext.recentEntitySlugs.length > 1
    ) {
      const names = previousContext.recentEntitySlugs
        .map((slug) => extracurricularKeywordDataset.find((program) => program.slug === slug)?.name)
        .filter(Boolean);
      return {
        text: `Maksud kamu ${names.join(" atau ")}?`,
        context: previousContext,
        analysis: {
          ...analysis,
          intents: ["follow_up"],
          usedContext: true,
          subQuestionCount: 1,
        },
      };
    }
    const contextualProgram = extracurricularKeywordDataset.find(
      (program) => program.slug === previousContext.lastEntitySlug,
    );
    if (contextualProgram) {
      programs = [contextualProgram];
      intents = unique<ChatbotIntent>(["follow_up", ...intents]);
      usedContext = true;
    }
  }

  const informationalIntents = intents.filter(
    (intent) => intent !== "follow_up",
  );
  const finalAnalysis = {
    ...analysis,
    intents,
    entitySlugs: programs.map(({ slug }) => slug),
    socialIntent,
    subQuestionCount: Math.max(
      informationalIntents.length * Math.max(programs.length, 1),
      informationalIntents.length,
    ),
    usedContext,
  };

  if (socialIntent && informationalIntents.length === 0 && programs.length === 0) {
    return {
      text: socialReplies[socialIntent],
      context: previousContext,
      analysis: finalAnalysis,
      telemetry: fuzzySocial
        ? {
            slangCandidate: {
              phrase: fuzzySocial.token,
              predictedIntent: fuzzySocial.intent,
              confidence: Number(fuzzySocial.confidence.toFixed(2)),
              approved: false,
            },
          }
        : undefined,
    };
  }

  if (hasAny(query, ["exisel", "eksi sel", "website ini", "aplikasi ini", "platform ini"])) {
    return {
      text: "EXISEL adalah platform informasi ekstrakurikuler SMKN 69 Jakarta untuk melihat pilihan ekskul, jadwal, pendaftaran, Community, dan presensi digital.",
      action: { href: "/ekstrakulikuler", label: "Jelajahi EXISEL" },
      context: previousContext,
      analysis: finalAnalysis,
    };
  }
  if (hasAny(query, ["namsel", "nam sel", "kawan namsel"])) {
    return {
      text: "Namsel adalah sapaan untuk komunitas warga SMKN 69 Jakarta.",
      context: previousContext,
      analysis: finalAnalysis,
    };
  }
  if (hasAny(query, ["smkn 69", "smk 69", "smkn69", "smk negeri 69"])) {
    const asksAddress = hasAny(query, ["alamat", "lokasi", "terletak", "di mana"]);
    return {
      text: asksAddress
        ? "SMKN 69 Jakarta beralamat di Jl. Dr. Radjiman Widyodiningrat, Rawabadung, Kelurahan Jatinegara, Kecamatan Cakung, Jakarta Timur."
        : "SMKN 69 Jakarta adalah sekolah menengah kejuruan negeri di Jakarta Timur. EksiBot saat ini fokus pada informasi ekstrakurikuler sekolah.",
      context: previousContext,
      analysis: finalAnalysis,
    };
  }

  if (informationalIntents.includes("out_of_scope")) {
    return {
      text: "EksiBot fokus membantu informasi ekstrakurikuler dan tidak dapat membantu aktivitas yang membahayakan atau melanggar akses orang lain.",
      context: previousContext,
      analysis: finalAnalysis,
    };
  }
  if (informationalIntents.includes("unknown_school_info")) {
    return {
      text: "Saat ini data EksiBot fokus pada informasi ekskul, jadi informasi sekolah tersebut belum tersedia.",
      context: previousContext,
      analysis: { ...finalAnalysis, missingFields: ["informasi sekolah"] },
    };
  }

  if (informationalIntents.includes("ask_recommendation")) {
    const recommendations = recommendationPrograms(query);
    const text = recommendations.length
      ? `Berdasarkan minat yang kamu sebutkan, pertimbangkan ${recommendations.map(({ name }) => name).join(", ")}. ${recommendations[0].description}`
      : "Ceritakan minatmu dulu ya—misalnya olahraga, teknologi, bahasa, kesehatan, atau kepemimpinan—supaya rekomendasinya lebih pas.";
    const primary = recommendations[0];
    return {
      text: socialIntent ? `${socialReplies[socialIntent]} ${text}` : text,
      action: primary ? detailAction(primary) : { href: "/ekstrakulikuler", label: "Lihat Semua Ekskul" },
      context: nextContext(previousContext, recommendations, intents),
      analysis: { ...finalAnalysis, entitySlugs: recommendations.map(({ slug }) => slug) },
    };
  }

  if (programs.length === 0) {
    const generalParts = informationalIntents
      .map(generalAnswer)
      .filter((part): part is string => Boolean(part));
    if (generalParts.length > 0) {
      return {
        text: `${socialIntent ? `${socialReplies[socialIntent]} ` : ""}${unique(generalParts).join("\n\n")}`,
        action: { href: "/ekstrakulikuler", label: "Lihat Katalog Ekskul" },
        context: previousContext,
        analysis: finalAnalysis,
      };
    }

    const unknownEntity = guessUnknownEntity(query);
    const asksUnknownProgram = hasAny(query, ["ada tidak", "ekstrakurikuler", "jadwal", "daftar"]);
    const fallbackText = asksUnknownProgram && unknownEntity
      ? `Aku belum menemukan ekskul bernama “${unknownEntity}” di data yang tersedia. Kalau ada ejaan atau nama lainnya, kirim aja.`
      : "Aku belum menangkap bagian yang ingin kamu tanyakan. Tulis nama ekskul plus informasi yang ingin dicek, misalnya jadwal, tempat, biaya, atau cara daftar.";
    const missingFields = asksUnknownProgram ? ["ekstrakurikuler"] : [];
    return {
      text: fallbackText,
      action: { href: "/ekstrakulikuler", label: "Lihat Katalog Ekskul" },
      context: previousContext,
      analysis: { ...finalAnalysis, missingFields, fallbackUsed: true },
      telemetry: {
        unanswered: {
          timestamp: new Date().toISOString(),
          intents,
          entitySlugs: [],
          missingFields,
          queryLength: message.length,
        },
      },
    };
  }

  const requestedProgramIntents = informationalIntents.filter((intent) =>
    [
      "ask_extracurricular_detail",
      "ask_schedule",
      "ask_location",
      "ask_registration",
      "ask_contact",
      "ask_cost",
      "ask_requirement",
      "ask_capacity",
    ].includes(intent),
  );
  const effectiveIntents = requestedProgramIntents.length
    ? requestedProgramIntents
    : (["ask_extracurricular_detail"] as ChatbotIntent[]);
  const missingFields: string[] = [];
  const sections = programs.map((program) => {
    const answers = effectiveIntents
      .map((intent) => answerProgramIntent(program, intent))
      .filter((answer): answer is NonNullable<typeof answer> => Boolean(answer));
    for (const answer of answers) {
      if (answer.missing) missingFields.push(`${answer.missing}:${program.slug}`);
    }
    if (answers.length === 1 && programs.length === 1) {
      return `${program.name}: ${answers[0].text}`;
    }
    return `${program.name}:\n${answers.map(({ text }) => `• ${text}`).join("\n")}`;
  });
  const comparison = informationalIntents.includes("compare_extracurricular")
    ? compareSchedules(programs)
    : null;
  const responseParts = [...sections, ...(comparison ? [`Perbandingan:\n• ${comparison}`] : [])];
  const responseText = `${socialIntent ? `${socialReplies[socialIntent]}\n\n` : ""}${responseParts.join("\n\n")}`;

  return {
    text: responseText,
    action: programs.length === 1
      ? detailAction(programs[0])
      : { href: "/ekstrakulikuler", label: "Bandingkan di Katalog" },
    context: nextContext(previousContext, programs, intents),
    analysis: { ...finalAnalysis, missingFields: unique(missingFields) },
    telemetry: missingFields.length
      ? {
          unanswered: {
            timestamp: new Date().toISOString(),
            intents,
            entitySlugs: programs.map(({ slug }) => slug),
            missingFields: unique(missingFields),
            queryLength: message.length,
          },
        }
      : undefined,
  };
}
