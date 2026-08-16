import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/database/prisma";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "Profil Saya — EXISEL",
  description: "Kelola foto profil, informasi akun, dan password akun EXISEL SMKN 69 Jakarta.",
};

export default async function ProfilePage() {
  const sessionUser = await getActiveSessionUser("STUDENT");
  if (!sessionUser) {
    redirect("/login");
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      nis: true,
      className: true,
      role: true,
      avatarUrl: true,
      mustChangePassword: true,
      createdAt: true,
      enrollments: {
        where: {
          status: { in: ["APPROVED", "PENDING"] },
        },
        select: {
          id: true,
          status: true,
          registeredAt: true,
          extracurricular: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        nis: user.nis,
        className: user.className,
        role: user.role,
        avatarUrl: user.avatarUrl,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt.toISOString(),
        enrollments: user.enrollments.map((e) => ({
          id: e.id,
          status: e.status as "APPROVED" | "PENDING",
          registeredAt: e.registeredAt.toISOString(),
          extracurricular: e.extracurricular,
        })),
      }}
    />
  );
}

