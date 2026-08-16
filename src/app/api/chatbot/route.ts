import { NextResponse } from "next/server";
import { processEksibotMessage } from "@/lib/ai/router";
import type { ChatbotContext } from "@/lib/chatbot/eskul-keyword-dataset";
import type { ChatMessageItem } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

type RequestPayload = {
  message: string;
  context?: ChatbotContext;
  history?: ChatMessageItem[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestPayload;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong." },
        { status: 400 },
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        {
          reply: {
            text: "Pesan terlalu panjang. Coba kirim pertanyaan yang lebih singkat dan berkaitan dengan Exisel.",
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

    const history: ChatMessageItem[] = Array.isArray(body.history)
      ? body.history
      : [];

    const result = await processEksibotMessage(message, initialContext, history);

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
