import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";
import { getCommunityChannels, formatIndonesianTimestamp, type CommunityMessageItem } from "@/lib/community/dal";
import { AdminCommunityManager } from "@/components/admin/admin-community-manager";

export const metadata: Metadata = {
  title: "Kelola Community — Admin EXISEL",
  description: "Dashboard pengelola pengumuman dan pesan resmi Exisel Community SMKN 69 Jakarta.",
};

export default async function AdminCommunityPage() {
  const session = await readSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!user || !user.isActive || user.role !== "ADMIN") {
    redirect("/login");
  }

  const channels = await getCommunityChannels();

  const rawMessages = await prisma.communityMessage.findMany({
    where: { deletedAt: null },
    include: {
      sender: {
        select: { id: true, name: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const initialMessages: CommunityMessageItem[] = rawMessages.map((msg) => ({
    id: msg.id,
    channelId: msg.extracurricularId,
    content: msg.content,
    isEdited: msg.isEdited,
    createdAt: formatIndonesianTimestamp(msg.createdAt),
    rawCreatedAt: msg.createdAt,
    sender: {
      id: msg.sender.id,
      name: msg.sender.name,
      role: msg.sender.role === "ADMIN" ? "ADMIN" : "STUDENT",
      avatar: "/logo-smkn69.webp",
    },
  }));

  return (
    <AdminCommunityManager
      adminName={user.name}
      channels={channels}
      initialMessages={initialMessages}
    />
  );
}
