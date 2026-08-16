import "server-only";

import { getPrisma } from "@/lib/database/prisma";

const BLOCK_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 Hari (48 Jam)

export type ChatbotBlockStatus = {
  isBlocked: boolean;
  blockedUntil?: Date;
  reason?: string;
};

export async function checkChatbotBlock(identifierKey: string): Promise<ChatbotBlockStatus> {
  const prisma = getPrisma();
  const now = new Date();

  try {
    const block = await prisma.chatbotBlock.findUnique({
      where: { key: identifierKey },
    });

    if (!block) {
      return { isBlocked: false };
    }

    if (block.blockedUntil.getTime() > now.getTime()) {
      return {
        isBlocked: true,
        blockedUntil: block.blockedUntil,
        reason: block.reason,
      };
    }

    // Blokir sudah kedaluwarsa, bisa dihapus
    await prisma.chatbotBlock.delete({
      where: { key: identifierKey },
    }).catch(() => {});

    return { isBlocked: false };
  } catch (error) {
    console.error("[CHATBOT BLOCK CHECK ERROR]", error);
    return { isBlocked: false };
  }
}

export async function applyChatbotBlock(
  identifierKey: string,
  reason: string,
): Promise<{ blockedUntil: Date }> {
  const prisma = getPrisma();
  const blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS);

  try {
    await prisma.chatbotBlock.upsert({
      where: { key: identifierKey },
      create: {
        key: identifierKey,
        reason,
        blockedUntil,
        violationCount: 1,
      },
      update: {
        reason,
        blockedUntil,
        violationCount: { increment: 1 },
      },
    });
  } catch (error) {
    console.error("[CHATBOT BLOCK APPLY ERROR]", error);
  }

  return { blockedUntil };
}
