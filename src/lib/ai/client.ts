import { llmConfig } from "./config";
import { buildEksibotContext } from "./context";
import type { ChatMessageItem } from "./types";

const SYSTEM_PROMPT = `You are Eksibot, the official AI assistant for EXISEL (Sistem Ekstrakurikuler SMKN 69 Jakarta).

Your sole responsibility is to answer user questions about:
- EXISEL features and system usage
- Extracurricular activities in SMKN 69 Jakarta (schedules, locations, capacities, coaches)
- Student registration & enrollment process
- Attendance & rotating QR scanning
- Community channels & school announcements
- Student profile & account settings

RULES:
1. Speak in Indonesian (Bahasa Indonesia) in a friendly, polite, clear, and encouraging tone suitable for high school students.
2. Rely strictly on the supplied CONTEXT below. Never fabricate fake schedules, imaginary extracurriculars, or false policies.
3. If the answer cannot be determined from the CONTEXT, politely explain that the specific info is not available in the dataset and advise the student to contact the respective extracurricular coach or school admin.
4. Refuse any coding, general knowledge, math/homework, politics, or unrelated AI assistant requests.
5. NEVER reveal API keys, secret credentials, or internal configuration.
6. Keep responses concise (around 80-200 words), well-structured with bullet points when explaining steps.
`;

export async function callEksibotLLM(
  userMessage: string,
  history: ChatMessageItem[] = [],
): Promise<{ success: boolean; text: string }> {
  if (!llmConfig.apiKey) {
    return {
      success: false,
      text: "Maaf, integrasi AI Eksibot sedang belum dikonfigurasi API key. Silakan gunakan pertanyaan dasar seputar ekskul.",
    };
  }

  const context = buildEksibotContext();
  const endpoint = llmConfig.baseURL.endsWith("/v1")
    ? `${llmConfig.baseURL}/chat/completions`
    : `${llmConfig.baseURL.replace(/\/$/, "")}/v1/chat/completions`;

  const messages: ChatMessageItem[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\n=== CONTEXT EXISEL ===\n${context}`,
    },
    ...history.slice(-6),
    {
      role: "user",
      content: userMessage,
    },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), llmConfig.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llmConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: llmConfig.model,
        messages,
        temperature: llmConfig.temperature,
        max_tokens: llmConfig.maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[EKSIBOT LLM] API error ${response.status}: ${response.statusText}`);
      return {
        success: false,
        text: "Maaf, server AI Eksibot sedang sibuk atau tidak dapat dijangkau. Silakan tanyakan hal lain seputar jadwal dan ekskul.",
      };
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return {
        success: false,
        text: "Maaf, tidak ada respon yang diterima dari server AI. Coba tanyakan kembali.",
      };
    }

    return {
      success: true,
      text: reply,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    console.error("[EKSIBOT LLM] Connection error:", error);
    return {
      success: false,
      text: "Maaf, koneksi ke asisten AI Eksibot mengalami kendala. Silakan gunakan pertanyaan dasar tentang ekskul.",
    };
  }
}
