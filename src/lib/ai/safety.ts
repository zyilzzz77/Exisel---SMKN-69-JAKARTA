const PROMPT_INJECTION_PATTERNS = [
  /\bignore (all )?(previous|prior) (instructions|prompts|rules|guidelines)\b/i,
  /\babaikan (semua )?(instruksi|aturan|perintah|petunjuk)\b/i,
  /\blupakan (semua )?(instruksi|aturan|perintah)\b/i,
  /\breveal (your )?(system prompt|api key|secret|env|token|credentials)\b/i,
  /\b(tampilkan|bocorkan|berikan|apa|sebutkan) (system prompt|api key|prompt kamu|env|\.env|rahasia|password|token)\b/i,
  /\bjailbreak\b/i,
  /\bdeveloper mode\b/i,
  /\b(dan|evil|unrestricted) mode\b/i,
  /\bact as (unrestricted|dan|evil|godmode|an ai without limits)\b/i,
  /\bjadilah (tanpa batas|unrestricted|asisten bebas)\b/i,
  /\bpretend you are (unrestricted|a programmer|someone else)\b/i,
  /\bkamu sekarang adalah\b.*\b(bebas|tanpa aturan|unrestricted)\b/i,
  /\bsimulate\b.*\b(unrestricted|jailbreak)\b/i,
];

const SECRET_EXTRACTION_PATTERNS = [
  /\b(api key|apikey|secret key|jwt secret|database url|session secret)\b/i,
  /\b(env variable|environment variable|\.env\.local|\.env\.production)\b/i,
  /\b(sk-[a-zA-Z0-9_-]{10,})\b/i,
];

const CODING_REQUEST_PATTERNS = [
  /\b(buatkan|bikin|tulis|generate|create|write)\b.*\b(code|kode|koding|coding|script|skrip|program|function|fungsi|syntax)\b/i,
  /\b(buatkan|bikin|tulis)\b.*\b(html|css|javascript|typescript|python|php|java|c\+\+|react|nextjs|next\.js|sql|bash)\b/i,
  /\b(kerjakan|selesaikan|jawabin)\b.*\b(pr|tugas|soal|matematika|fisika|kimia|ujian)\b/i,
  /\b(buatkan|bikin|desain)\b.*\b(landing page|website|web portofolio|game|aplikasi)\b/i,
];

const GENERAL_OFF_TOPIC_PATTERNS = [
  /\b(siapa presiden|berita hari ini|rekomendasi film|crypto|bitcoin|judi|slot|gacor|cheat|hack|crack password|ddos|exploit)\b/i,
  /\b(buatkan cerita|bikin puisi|karang cerpen|resep masakan|ramalan zodiak)\b/i,
  /\b(terjemahkan ke bahasa|translate to)\b/i,
];

const RESTRICTED_CONTENT_PATTERNS = [
  /\b(sex|seks|xxx|porn|porno|bokep|konten dewasa|dewasa|18\+|nsfw)\b/i,
  /\b(cerita mesum|cerita dewasa|fantasi seksual|hubungan badan|bikini|telanjang|bugil|vulgar)\b/i,
  /\b(lgbt|homoseksual|gay|lesbian|biseksual|transgender|sesama jenis)\b/i,
  /\b(teroris|terorisme|bom|bomber|islamic state|isis|jihad radikal|radikalisasi)\b/i,
  /\b(bully|bullying|ngebully|di-bully|dibully|perundungan|mengintimidasi|merundung|hina teman|ejek teman|mempermalukan|ngejek)\b/i,
  /\b(narkoba|narkotika|sabu|ekstasi|ganja|shabu|psikotropika|jualan obat terlarang)\b/i,
  /\b(membunuh|pembunuhan|pembunuh bayaran|melukai orang|kekerasan fisik|main hakim sendiri)\b/i,
  /\b(mengancam|ancaman kekerasan|mau bunuh|bunuh diri|menyakiti diri sendiri|self harm)\b/i,
];

export function isUnsafeOrOffTopic(message: string): {
  isBlocked: boolean;
  reason?: "unsafe" | "secret" | "coding" | "off_topic" | "restricted";
  refusalText?: string;
} {
  const clean = message.trim();

  // 1. Cek Secret Extraction
  for (const pattern of SECRET_EXTRACTION_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isBlocked: true,
        reason: "secret",
        refusalText:
          "Maaf, informasi kredensial, API key, dan konfigurasi internal sistem dilindungi dan tidak dapat diberikan.",
      };
    }
  }

  // 2. Cek Prompt Injection / Jailbreak
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isBlocked: true,
        reason: "unsafe",
        refusalText:
          "Maaf, Eksibot hanya membantu informasi seputar Exisel, ekstrakurikuler, pendaftaran, community, dan kehadiran di SMKN 69 Jakarta.",
      };
    }
  }

  // 3. Cek Permintaan Coding
  for (const pattern of CODING_REQUEST_PATTERNS) {
    if (
      !clean.toLowerCase().includes("tidak bisa login") &&
      !clean.toLowerCase().includes("gagal absen") &&
      !clean.toLowerCase().includes("error di exisel")
    ) {
      if (pattern.test(clean)) {
        return {
          isBlocked: true,
          reason: "coding",
          refusalText:
            "Maaf, Eksibot bukan asisten pemrograman umum dan hanya membantu seputar sistem Exisel serta kegiatan ekstrakurikuler SMKN 69 Jakarta.",
        };
      }
    }
  }

  // 4. Cek Pertanyaan Umum di luar cakupan
  for (const pattern of GENERAL_OFF_TOPIC_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isBlocked: true,
        reason: "off_topic",
        refusalText:
          "Maaf, Eksibot hanya dapat menjawab pertanyaan seputar Exisel, kegiatan ekskul, pendaftaran, dan presensi sekolah.",
      };
    }
  }

  // 5. Cek Konten Terlarang (18+, LGBT, Terorisme, Bullying, Narkoba, Kekerasan)
  for (const pattern of RESTRICTED_CONTENT_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isBlocked: true,
        reason: "restricted",
        refusalText:
          "Maaf, topik ini dilarang di Eksibot. Eksibot hanya membahas kegiatan ekstrakurikuler, pendaftaran, dan informasi sekolah di SMKN 69 Jakarta.",
      };
    }
  }

  return { isBlocked: false };
}
