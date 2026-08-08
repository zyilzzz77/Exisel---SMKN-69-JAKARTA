"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/database/prisma";
import { readSession } from "@/lib/auth/session";

export type ActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function sendCommunityMessageAction(
  extracurricularId: string,
  content: string,
): Promise<ActionState> {
  try {
    const session = await readSession();
    if (!session?.userId) {
      return { error: "Silakan login terlebih dahulu untuk mengirim pesan." };
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return { error: "Sesi pengguna tidak valid." };
    }

    if (user.role !== "ADMIN") {
      return { error: "Akses ditolak. Hanya Admin dan Guru yang dapat mengirim pengumuman." };
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return { error: "Pesan tidak boleh kosong." };
    }

    if (trimmedContent.length > 2000) {
      return { error: "Pesan tidak boleh melebihi 2000 karakter." };
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
    const session = await readSession();
    if (!session?.userId) {
      return { error: "Silakan login terlebih dahulu." };
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive || user.role !== "ADMIN") {
      return { error: "Akses ditolak." };
    }

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
    const session = await readSession();
    if (!session?.userId) {
      return { error: "Silakan login terlebih dahulu." };
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive || user.role !== "ADMIN") {
      return { error: "Akses ditolak." };
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
