const PROMPT_INJECTION_PATTERNS = [
  /\bignore (all )?(previous|prior) (instructions|prompts|rules)\b/i,
  /\babaikan (semua )?(instruksi|aturan|perintah)\b/i,
  /\breveal (your )?(system prompt|api key|secret|env)\b/i,
  /\b(tampilkan|bocorkan|berikan|apa) (system prompt|api key|prompt kamu|env|\.env|rahasia)\b/i,
  /\bjailbreak\b/i,
  /\bdeveloper mode\b/i,
  /\bact as (unrestricted|dan|evil)\b/i,
  /\bjadilah (tanpa batas|unrestricted)\b/i,
];

const CODING_REQUEST_PATTERNS = [
  /\b(buatkan|bikin|tulis|generate|create)\b.*\b(code|kode|koding|coding|script|skrip|program|function|fungsi)\b/i,
  /\b(buatkan|bikin|tulis)\b.*\b(html|css|javascript|typescript|python|php|java|c\+\+|react|nextjs|next\.js)\b/i,
  /\b(kerjakan|selesaikan|jawabin)\b.*\b(pr|tugas|soal|matematika|fisika|kimia)\b/i,
  /\b(buatkan|bikin)\b.*\b(landing page|website|web portofolio|game)\b/i,
];

const GENERAL_OFF_TOPIC_PATTERNS = [
  /\b(siapa presiden|berita hari ini|rekomendasi film|crypto|bitcoin|judi|slot|gacor|cheat|hack|crack password)\b/i,
  /\b(buatkan cerita|bikin puisi|karang cerpen)\b/i,
];

export function isUnsafeOrOffTopic(message: string): {
  isBlocked: boolean;
  reason?: "unsafe" | "coding" | "off_topic";
  refusalText?: string;
} {
  const clean = message.trim();

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

  for (const pattern of CODING_REQUEST_PATTERNS) {
    // Check if it's NOT troubleshooting an existing exisel login/feature
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

  return { isBlocked: false };
}
