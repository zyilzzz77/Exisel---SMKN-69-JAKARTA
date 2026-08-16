import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";
import { getCommunityChannels, mapCommunityMessage, type CommunityMessageItem } from "@/lib/community/dal";
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

  const initialMessages: CommunityMessageItem[] = rawMessages.map(mapCommunityMessage);

  return (
    <AdminCommunityManager
      adminName={user.name}
      channels={channels}
      initialMessages={initialMessages}
    />
  );
}
