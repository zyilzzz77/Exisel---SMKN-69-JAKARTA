"use server";

import { revalidatePath } from "next/cache";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import {
  MAX_ATTACHMENT_SIZE,
  ATTACHMENT_FILENAME_PATTERN,
  isAllowedMime,
} from "@/lib/community/attachments";
import { getPrisma } from "@/lib/database/prisma";

export type ActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type CommunityAttachmentInput = {
  path: string;
  name: string;
  size: number;
  mime: string;
};

export async function sendCommunityMessageAction(
  extracurricularId: string,
  content: string,
  attachment?: CommunityAttachmentInput | null,
): Promise<ActionState> {
  try {
    const user = await getActiveSessionUser("ADMIN");
    if (!user) {
      return { error: "Akses ditolak. Hanya Admin dan Guru yang dapat mengirim pengumuman." };
    }

    const prisma = getPrisma();
    const trimmedContent = content.trim();
    if (!trimmedContent && !attachment) {
      return { error: "Pesan atau lampiran tidak boleh kosong." };
    }

    if (trimmedContent.length > 2000) {
      return { error: "Pesan tidak boleh melebihi 2000 karakter." };
    }

    if (attachment) {
      if (!ATTACHMENT_FILENAME_PATTERN.test(attachment.path)) {
        return { error: "Lampiran tidak valid." };
      }
      if (!attachment.name || attachment.name.length > 255) {
        return { error: "Nama file tidak valid." };
      }
      if (
        !Number.isInteger(attachment.size) ||
        attachment.size <= 0 ||
        attachment.size > MAX_ATTACHMENT_SIZE
      ) {
        return { error: "Ukuran file tidak valid." };
      }
      if (!isAllowedMime(attachment.mime)) {
        return { error: "Tipe file tidak diizinkan." };
      }
    }

    const eskul = await prisma.extracurricular.findUnique({
      where: { id: extracurricularId },
      select: { id: true, name: true },
    });

    if (!eskul) {
      return { error: "Channel ekstrakurikuler tidak ditemukan." };
    }

    await prisma.communityMessage.create({
      data: {
        extracurricularId: eskul.id,
        senderId: user.id,
        content: trimmedContent,
        attachmentPath: attachment?.path ?? null,
        attachmentName: attachment?.name ?? null,
        attachmentSize: attachment?.size ?? null,
        attachmentMime: attachment?.mime ?? null,
      },
    });

    revalidatePath("/community");
    revalidatePath("/admin/community");

    return {
      success: true,
      message: `Pesan berhasil dikirim ke channel ${eskul.name}.`,
    };
  } catch (error) {
    console.error("sendCommunityMessageAction error:", error);
    return { error: "Gagal mengirim pesan. Silakan coba lagi." };
  }
}

export async function updateCommunityMessageAction(
  messageId: string,
  content: string,
): Promise<ActionState> {
  try {
    const user = await getActiveSessionUser("ADMIN");
    if (!user) {
      return { error: "Akses ditolak." };
    }

    const prisma = getPrisma();
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return { error: "Isi pesan tidak boleh kosong." };
    }

    if (trimmedContent.length > 2000) {
      return { error: "Pesan tidak boleh melebihi 2000 karakter." };
    }

    const existingMessage = await prisma.communityMessage.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage || existingMessage.deletedAt) {
      return { error: "Pesan tidak ditemukan." };
    }

    await prisma.communityMessage.update({
      where: { id: messageId },
      data: {
        content: trimmedContent,
        isEdited: true,
      },
    });

    revalidatePath("/community");
    revalidatePath("/admin/community");

    return {
      success: true,
      message: "Pesan berhasil diperbarui.",
    };
  } catch (error) {
    console.error("updateCommunityMessageAction error:", error);
    return { error: "Gagal memperbarui pesan." };
  }
}

export async function deleteCommunityMessageAction(
  messageId: string,
): Promise<ActionState> {
  try {
    const user = await getActiveSessionUser("ADMIN");
    if (!user) {
      return { error: "Akses ditolak." };
    }

    const prisma = getPrisma();
    const existingMessage = await prisma.communityMessage.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage || existingMessage.deletedAt) {
      return { error: "Pesan tidak ditemukan." };
    }

    await prisma.communityMessage.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
      },
    });

    revalidatePath("/community");
    revalidatePath("/admin/community");

    return {
      success: true,
      message: "Pesan berhasil dihapus.",
    };
  } catch (error) {
    console.error("deleteCommunityMessageAction error:", error);
    return { error: "Gagal menghapus pesan." };
  }
}
