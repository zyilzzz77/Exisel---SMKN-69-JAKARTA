import type { Metadata } from "next";
import { readSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/database/prisma";
import { getCommunityChannelData } from "@/lib/community/dal";
import { CommunityView } from "@/components/community/community-view";

export const metadata: Metadata = {
  title: "Community Ekskul — EXISEL SMKN 69 Jakarta",
  description:
    "Papan pengumuman dan informasi resmi ekstrakurikuler SMKN 69 Jakarta. Dapatkan update jadwal, kegiatan, dan pesan terbaru.",
};

type PageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default async function CommunityPage({ searchParams }: PageProps) {
  const { channel } = await searchParams;
  const session = await readSession();

  let currentUser: { name: string; role: string } | null = null;
  let isAdmin = false;

  if (session?.userId) {
    const user = await getPrisma().user.findUnique({
      where: { id: session.userId },
      select: { name: true, role: true, isActive: true },
    });
    if (user?.isActive) {
      currentUser = { name: user.name, role: user.role };
      if (user.role === "ADMIN") {
        isAdmin = true;
      }
    }
  }

  const { channels, activeChannel, messages } = await getCommunityChannelData(channel);

  return (
    <CommunityView
      activeChannel={activeChannel}
      channels={channels}
      currentUser={currentUser}
      isAdmin={isAdmin}
      messages={messages}
    />
  );
}
