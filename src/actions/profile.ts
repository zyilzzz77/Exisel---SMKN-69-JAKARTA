"use server";

import { hash, verify } from "argon2";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/database/prisma";

export type ProfileActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<ProfileActionState> {
  try {
    const user = await getActiveSessionUser("STUDENT");
    if (!user) {
      return { error: "Sesi tidak valid. Silakan login ulang." };
    }

    if (!currentPassword || currentPassword.length < 6) {
      return { error: "Password saat ini minimal 6 karakter." };
    }

    if (!newPassword || newPassword.length < 6) {
      return { error: "Password baru minimal 6 karakter." };
    }

    if (newPassword.length > 128) {
      return { error: "Password baru maksimal 128 karakter." };
    }

    if (currentPassword === newPassword) {
      return { error: "Password baru harus berbeda dari password saat ini." };
    }

    const prisma = getPrisma();
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!fullUser) {
      return { error: "User tidak ditemukan." };
    }

    const valid = await verify(fullUser.passwordHash, currentPassword).catch(
      () => false,
    );

    if (!valid) {
      return { error: "Password saat ini tidak sesuai." };
    }

    const newHash = await hash(newPassword, {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return {
      success: true,
      message: "Password berhasil diperbarui.",
    };
  } catch (error) {
    console.error("changePasswordAction error:", error);
    return { error: "Gagal memperbarui password. Coba lagi." };
  }
}

export async function updateAvatarAction(
  avatarUrl: string,
): Promise<ProfileActionState> {
  try {
    const user = await getActiveSessionUser("STUDENT");
    if (!user) {
      return { error: "Sesi tidak valid. Silakan login ulang." };
    }

    if (!avatarUrl || !avatarUrl.startsWith("/uploads/avatars/")) {
      return { error: "URL avatar tidak valid." };
    }

    const prisma = getPrisma();
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    return {
      success: true,
      message: "Foto profil berhasil diperbarui.",
    };
  } catch (error) {
    console.error("updateAvatarAction error:", error);
    return { error: "Gagal memperbarui foto profil. Coba lagi." };
  }
}

export async function removeAvatarAction(): Promise<ProfileActionState> {
  try {
    const user = await getActiveSessionUser("STUDENT");
    if (!user) {
      return { error: "Sesi tidak valid. Silakan login ulang." };
    }

    const prisma = getPrisma();
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });

    return {
      success: true,
      message: "Foto profil berhasil dihapus.",
    };
  } catch (error) {
    console.error("removeAvatarAction error:", error);
    return { error: "Gagal menghapus foto profil. Coba lagi." };
  }
}
