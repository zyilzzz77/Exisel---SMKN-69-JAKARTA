export const llmConfig = {
  baseURL:
    process.env.EKSIBOT_LLM_BASE_URL?.trim() ||
    "https://r9t4u2l.abc-tunnel.us/v1",
  model:
    process.env.EKSIBOT_LLM_MODEL?.trim() ||
    "ag/gemini-3.7-flash-low",
  apiKey: process.env.EKSIBOT_LLM_API_KEY?.trim() || "",
  timeoutMs: 15_000,
  temperature: 0.3,
  maxTokens: 600,
};
