import type { Metadata } from "next";
import { requireApprovedStudent } from "@/lib/auth/authorization";
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
  const student = await requireApprovedStudent();
  const currentUser = { name: student.name, role: student.role, avatarUrl: student.avatarUrl };

  const { channels, activeChannel, messages } = await getCommunityChannelData(channel);

  return (
    <CommunityView
      activeChannel={activeChannel}
      channels={channels}
      currentUser={currentUser}
      isAdmin={false}
      messages={messages}
    />
  );
}
