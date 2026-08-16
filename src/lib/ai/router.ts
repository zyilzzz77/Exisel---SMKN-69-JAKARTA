import { isUnsafeOrOffTopic } from "./safety";
import { callEksibotLLM } from "./client";
import {
  getEskulChatbotReply,
  type ChatbotContext,
  type ChatbotResult,
} from "../chatbot/eskul-keyword-dataset";
import type { ChatMessageItem, EksibotServiceResponse } from "./types";

const DETAIL_REQUEST_PATTERNS = [
  /\b(jelaskan|jelasin|detail|lengkap|rincian|lebih detail|bagaimana cara|step by step|urutan|langkah-langkah)\b/i,
  /\b(kenapa|mengapa|apa bedanya|perbedaan|alasan)\b/i,
  /\b(bagaimana alur|gimana cara|tolong jelaskan)\b/i,
];

function isDetailRequest(message: string): boolean {
  return DETAIL_REQUEST_PATTERNS.some((p) => p.test(message));
}

export async function processEksibotMessage(
  message: string,
  context: ChatbotContext,
  history: ChatMessageItem[] = [],
): Promise<{ reply: EksibotServiceResponse; context: ChatbotContext; rawResult?: ChatbotResult }> {
  // 1. Safety & Off-Topic Filter
  const safetyCheck = isUnsafeOrOffTopic(message);
  if (safetyCheck.isBlocked) {
    return {
      reply: {
        text: safetyCheck.refusalText || "Maaf, permintaan ini tidak dapat diproses.",
        source: "filter",
      },
      context,
    };
  }

  // 2. Keyword Dataset Matcher (Fast & Local Priority)
  const localResult = getEskulChatbotReply(message, context);
  const wantsDetail = isDetailRequest(message);

  // If local dataset answered with high confidence (not fallback/out_of_scope) and user didn't explicitly demand deep elaboration:
  const isGenericFallback =
    localResult.analysis.fallbackUsed ||
    localResult.analysis.intents.includes("out_of_scope") ||
    localResult.analysis.intents.includes("unknown_school_info");

  if (!isGenericFallback && !wantsDetail) {
    return {
      reply: {
        text: localResult.text,
        action: localResult.action,
        source: "dataset",
      },
      context: localResult.context,
      rawResult: localResult,
    };
  }

  // 3. LLM Handler (ag/gemini-3.7-flash-low) for detailed or complex questions
  const llmResult = await callEksibotLLM(message, history);

  if (llmResult.success) {
    return {
      reply: {
        text: llmResult.text,
        action: localResult.action,
        source: "llm",
      },
      context: localResult.context,
      rawResult: localResult,
    };
  }

  // 4. Graceful Fallback if LLM fails: return the structured local response
  return {
    reply: {
      text: localResult.text,
      action: localResult.action,
      source: "dataset",
    },
    context: localResult.context,
    rawResult: localResult,
  };
}
