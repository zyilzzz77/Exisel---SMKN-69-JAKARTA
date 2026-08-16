import { llmConfig } from "./config";
import { buildEksibotContext } from "./context";
import type { ChatMessageItem } from "./types";

const SYSTEM_PROMPT = `You are Eksibot, the official AI assistant for EXISEL (Sistem Ekstrakurikuler SMKN 69 Jakarta / Namsel).

Your sole responsibility is to answer user questions about:
- EXISEL features and system usage
- Extracurricular activities in SMKN 69 Jakarta (EC/English Club, PMR, ITC, Basket, Nihon, Paskibra, Futsal, Pramuka)
- School info relevant to Namsel (lokasi, alamat di Jl. Swadaya Jatinegara Cakung)
- Student registration & enrollment process
- Attendance & rotating QR scanning
- Community channels & school announcements
- Student profile & account settings

FORMATTING & STYLE RULES:
1. Speak in natural Indonesian (Bahasa Indonesia), polite, clear, friendly, and structured.
2. DO NOT use raw markdown formatting like hashtags (#, ##), asterisks overload (***), or messy double slashes.
3. For lists and step-by-step guides, use clean numbered lists (1. 2. 3.) or simple bullet points (•).
4. Emphasize important terms using bold (**kata**) cleanly.
5. Rely strictly on the supplied CONTEXT below. Never fabricate fake schedules or false policies.
6. If the answer cannot be determined from CONTEXT, politely explain that the specific info is not available and advise the student to contact the coach or school admin.
7. Refuse any coding, general knowledge, math/homework, politics, or unrelated AI assistant requests.
8. NEVER reveal API keys, secret credentials, or internal configuration.
9. Keep responses concise and easy to read on mobile screens (around 60-180 words).
`;

function sanitizeLLMOutput(text: string): string {
  // Post-generation guard: pastikan tidak ada kebocoran token/secret yang tidak disengaja
  return text
    .replace(/sk-[a-zA-Z0-9_-]{15,}/g, "[SECRET_REDACTED]")
    .replace(/(bearer\s+)[a-zA-Z0-9._-]+/gi, "$1[REDACTED]")
    .trim();
}

export async function callEksibotLLM(
  userMessage: string,
  history: ChatMessageItem[] = [],
): Promise<{ success: boolean; text: string }> {
  const apiKey = process.env.EKSIBOT_LLM_API_KEY?.trim() || llmConfig.apiKey;
  if (!apiKey) {
    return {
      success: false,
      text: "Maaf, integrasi AI Eksibot sedang belum dikonfigurasi API key. Silakan gunakan pertanyaan dasar seputar ekskul.",
    };
  }

  const context = buildEksibotContext();
  const baseURL = process.env.EKSIBOT_LLM_BASE_URL?.trim() || llmConfig.baseURL;
  const model = process.env.EKSIBOT_LLM_MODEL?.trim() || llmConfig.model;
  const endpoint = baseURL.endsWith("/v1")
    ? `${baseURL}/chat/completions`
    : `${baseURL.replace(/\/$/, "")}/v1/chat/completions`;

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
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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

    const rawText = await response.text();
    let reply = "";

    try {
      const data = JSON.parse(rawText);
      reply = data?.choices?.[0]?.message?.content?.trim() || "";
    } catch {
      // Jika endpoint mengembalikan Server-Sent Events (SSE / streaming data: {...})
      const lines = rawText.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const chunk = JSON.parse(jsonStr);
            const content =
              chunk?.choices?.[0]?.delta?.content ||
              chunk?.choices?.[0]?.message?.content;
            if (content) {
              reply += content;
            }
          } catch {
            // ignore non-json chunk
          }
        }
      }
      reply = reply.trim();
    }

    if (!reply) {
      console.warn("[EKSIBOT LLM] Empty response or unparsed SSE:", rawText.slice(0, 200));
      return {
        success: false,
        text: "Maaf, tidak ada respon yang diterima dari server AI. Coba tanyakan kembali.",
      };
    }

    return {
      success: true,
      text: sanitizeLLMOutput(reply),
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
