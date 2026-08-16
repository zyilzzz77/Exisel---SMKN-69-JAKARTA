import { NextResponse } from "next/server";
import { processEksibotMessage } from "@/lib/ai/router";
import { checkRateLimit, requestClientIp } from "@/lib/attendance/rate-limit";
import { readSession } from "@/lib/auth/session";
import { checkChatbotBlock, applyChatbotBlock } from "@/lib/ai/blocker";
import type { ChatbotContext } from "@/lib/chatbot/eskul-keyword-dataset";
import type { ChatMessageItem } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

const CHAT_LIMIT_PER_MINUTE = 15;
const SPAM_VIOLATION_THRESHOLD = 5;

// In-memory tracker untuk mendeteksi spam beruntun yang memicu blokir 2 hari
const violationCounter = new Map<string, { count: number; resetAt: number }>();

function recordSpamViolation(key: string): number {
  const now = Date.now();
  const current = violationCounter.get(key);
  if (!current || current.resetAt <= now) {
    violationCounter.set(key, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return 1;
  }
  current.count += 1;
  return current.count;
}

type RequestPayload = {
  message: string;
  context?: ChatbotContext;
  history?: ChatMessageItem[];
};

function formatBlockedDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function GET(request: Request) {
  try {
    const clientIp = requestClientIp(request);
    const session = await readSession();
    const identifierKey = session ? `user:${session.userId}` : `ip:${clientIp}`;

    const blockStatus = await checkChatbotBlock(identifierKey);
    if (blockStatus.isBlocked && blockStatus.blockedUntil) {
      return NextResponse.json(
        {
          isBlocked: true,
          blockedUntil: blockStatus.blockedUntil.toISOString(),
          reason: blockStatus.reason,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { isBlocked: false },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ isBlocked: false }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = requestClientIp(request);
    const session = await readSession();
    const identifierKey = session ? `user:${session.userId}` : `ip:${clientIp}`;

    // 1. Cek apakah user/IP sedang diblokir 2 hari
    const blockStatus = await checkChatbotBlock(identifierKey);
    if (blockStatus.isBlocked && blockStatus.blockedUntil) {
      return NextResponse.json(
        {
          reply: {
            text: `Akses asisten AI Eksibot kamu sedang diblokir hingga ${formatBlockedDate(
              blockStatus.blockedUntil,
            )} WIB karena pelanggaran keamanan (${blockStatus.reason || "aktivitas mencurigakan"}).`,
            source: "filter",
          },
          isBlocked: true,
          blockedUntil: blockStatus.blockedUntil.toISOString(),
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 2. Rate Limiting Request per menit
    const rate = checkRateLimit(`chatbot:${identifierKey}`, CHAT_LIMIT_PER_MINUTE);
    if (!rate.allowed) {
      const violations = recordSpamViolation(identifierKey);
      if (violations >= SPAM_VIOLATION_THRESHOLD) {
        const { blockedUntil } = await applyChatbotBlock(
          identifierKey,
          "Spam request berlebihan secara beruntun",
        );
        return NextResponse.json(
          {
            reply: {
              text: `Kamu telah melakukan spam berulang kali. Akses asisten AI Eksibot kamu diblokir selama 2 hari (hingga ${formatBlockedDate(
                blockedUntil,
              )} WIB).`,
              source: "filter",
            },
            isBlocked: true,
            blockedUntil: blockedUntil.toISOString(),
          },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        );
      }

      return NextResponse.json(
        {
          reply: {
            text: "Kamu mengirim pesan terlalu cepat. Mohon tunggu sebentar sebelum mengirim lagi.",
            source: "filter",
          },
        },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = (await request.json()) as RequestPayload;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong." },
        { status: 400 },
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        {
          reply: {
            text: "Pesan terlalu panjang (maksimal 1000 karakter). Coba kirim pertanyaan yang lebih ringkas.",
            source: "filter",
          },
        },
        { status: 200 },
      );
    }

    const initialContext: ChatbotContext = body.context ?? {
      lastEntitySlug: null,
      recentEntitySlugs: [],
      lastIntent: null,
    };

    // Filter and sanitize history (keep max 6, each max 500 chars)
    const sanitizedHistory: ChatMessageItem[] = (
      Array.isArray(body.history) ? body.history : []
    )
      .slice(-6)
      .map((item) => ({
        role: item.role === "assistant" || item.role === "user" ? item.role : "user",
        content: String(item.content || "").slice(0, 500),
      }));

    const result = await processEksibotMessage(message, initialContext, sanitizedHistory);

    // 3. Jika pesan terdeteksi sebagai Jailbreak / Secret Extraction / Konten Terlarang -> Langsung blokir 2 hari
    if (
      result.safetyViolation === "unsafe" ||
      result.safetyViolation === "secret" ||
      result.safetyViolation === "restricted"
    ) {
      const reason =
        result.safetyViolation === "secret"
          ? "Percobaan ekstraksi kredensial / API Key"
          : result.safetyViolation === "restricted"
            ? "Membahas konten terlarang (18+, LGBT, terorisme, bullying, narkoba, dll.)"
            : "Percobaan bypass / Jailbreak AI";

      const { blockedUntil } = await applyChatbotBlock(identifierKey, reason);

      return NextResponse.json(
        {
          reply: {
            text: `Aktivitas berbahaya terdeteksi (${reason}). Akses asisten AI Eksibot kamu telah diblokir selama 2 hari (hingga ${formatBlockedDate(
              blockedUntil,
            )} WIB).`,
            source: "filter",
          },
          isBlocked: true,
          blockedUntil: blockedUntil.toISOString(),
          context: result.context,
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        reply: result.reply,
        context: result.context,
        telemetry: result.rawResult?.telemetry,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[API CHATBOT ERROR]", error);
    return NextResponse.json(
      {
        reply: {
          text: "Maaf, terjadi kendala teknis pada sistem chat. Silakan coba kembali.",
          source: "dataset",
        },
      },
      { status: 500 },
    );
  }
}
