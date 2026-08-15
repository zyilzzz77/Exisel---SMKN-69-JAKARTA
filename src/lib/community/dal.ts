import "server-only";

import { cache } from "react";
import { getPrisma } from "@/lib/database/prisma";

export type CommunityChannel = {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  messageCount: number;
};

export type CommunityMessageItem = {
  id: string;
  channelId: string;
  content: string;
  isEdited: boolean;
  createdAt: string;
  rawCreatedAt: Date;
  sender: {
    id: string;
    name: string;
    role: "ADMIN" | "STUDENT";
    avatar: string;
  };
};

const LOGO_MAP: Record<string, string> = {
  PMR: "/logo-pmr.webp",
  "English Club": "/logo-english-club.webp",
  Nihon: "/logo-nihon.webp",
  Basket: "/logo-basket.webp",
  ITC: "/logo-itc.webp",
  Paskibra: "/logo-paskibra.webp",
  Futsal: "/logo-futsal.webp",
  Pramuka: "/logo-smkn69.webp",
};

export function slugifyEskul(name: string): string {
  if (name.toUpperCase() === "ITC") return "it-club";
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function unslugifyEskul(slug: string): string {
  const normalized = slug.toLowerCase();
  if (normalized === "it-club" || normalized === "itc") return "ITC";
  if (normalized === "english-club") return "English Club";
  if (normalized === "pmr") return "PMR";
  if (normalized === "nihon") return "Nihon";
  if (normalized === "basket") return "Basket";
  if (normalized === "paskibra") return "Paskibra";
  if (normalized === "futsal") return "Futsal";
  if (normalized === "pramuka") return "Pramuka";
  return slug;
}

export function formatIndonesianTimestamp(date: Date): string {
  const now = new Date();
  const dateJakarta = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const nowJakarta = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));

  const hours = String(dateJakarta.getHours()).padStart(2, "0");
  const minutes = String(dateJakarta.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  const isToday =
    dateJakarta.getDate() === nowJakarta.getDate() &&
    dateJakarta.getMonth() === nowJakarta.getMonth() &&
    dateJakarta.getFullYear() === nowJakarta.getFullYear();

  const yesterday = new Date(nowJakarta);
  yesterday.setDate(nowJakarta.getDate() - 1);
  const isYesterday =
    dateJakarta.getDate() === yesterday.getDate() &&
    dateJakarta.getMonth() === yesterday.getMonth() &&
    dateJakarta.getFullYear() === yesterday.getFullYear();

  if (isToday) return `Hari ini • ${timeStr}`;
  if (isYesterday) return `Kemarin • ${timeStr}`;

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${dateJakarta.getDate()} ${months[dateJakarta.getMonth()]} ${dateJakarta.getFullYear()} • ${timeStr}`;
}

const DEFAULT_WELCOME_MESSAGES: Record<string, string> = {
  PMR: "Selamat datang di channel PMR SMKN 69 Jakarta! 🚑 Pantau jadwal latihan, materi pertolongan pertama, dan pengumuman aksi kemanusiaan relawan muda di sini.",
  "English Club": "Welcome to the English Club channel! 🇬🇧 Stay tuned for speaking club schedules, presentation tips, and upcoming fun activities.",
  Nihon: "Konnichiwa! 🇯🇵 Selamat datang di channel Nihon Kurabu. Dapatkan informasi terbaru seputar kelas bahasa Jepang, event budaya, dan karya kreatif di sini.",
  Basket: "Selamat datang di channel Basket SMKN 69 Jakarta! 🏀 Cek jadwal latihan fisik, strategi tim, dan info sparing di sini.",
  ITC: "Selamat datang di channel IT Club! 💻 Channel ini digunakan untuk pengumuman workshop coding, karya teknologi, dan koordinasi tim IT SMKN 69 Jakarta.",
  Paskibra: "Salam Paskibra! 🇮🇩 Selamat datang di channel Paskibra SMKN 69 Jakarta. Dapatkan informasi latihan baris-berbaris dan persiapan upacara di sini.",
  Futsal: "Selamat datang di channel Futsal! ⚽ Dapatkan info jadwal latihan rutin, match pemanasan, dan pengumuman turnamen sekolah di sini.",
  Pramuka: "Satu Pramuka untuk Satu Indonesia! 🏕️ Selamat datang di channel Pramuka SMKN 69 Jakarta. Dapatkan materi kepramukaan dan info kegiatan lapangan di sini.",
};

async function ensureAll8ChannelsExist() {
  const prisma = getPrisma();

  // Ensure Pramuka exists if database only has 7 items
  await prisma.extracurricular.upsert({
    where: { name: "Pramuka" },
    update: { isActive: true },
    create: {
      id: "10000000-0000-4000-8000-000000000008",
      name: "Pramuka",
      description: "Pendidikan kepramukaan, pembentukan karakter, kepemimpinan, dan teknik kepanduan.",
      capacity: 36,
      isActive: true,
    },
  });
}

export const getCommunityChannels = cache(async (): Promise<CommunityChannel[]> => {
  await ensureAll8ChannelsExist();
  const prisma = getPrisma();

  const extracurriculars = await prisma.extracurricular.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          communityMessages: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });

  return extracurriculars.map((eskul) => ({
    id: eskul.id,
    name: eskul.name,
    slug: slugifyEskul(eskul.name),
    logo: LOGO_MAP[eskul.name] || "/logo-smkn69.webp",
    description: eskul.description || `Channel informasi resmi ${eskul.name} SMKN 69 Jakarta`,
    messageCount: eskul._count.communityMessages,
  }));
});

export const getCommunityChannelData = cache(
  async (channelSlug?: string): Promise<{
    channels: CommunityChannel[];
    activeChannel: CommunityChannel;
    messages: CommunityMessageItem[];
  }> => {
    const channels = await getCommunityChannels();
    if (!channels.length) {
      throw new Error("Channel tidak ditemukan.");
    }

    let activeChannel = channels.find(
      (c) => c.slug === channelSlug || c.name.toLowerCase() === channelSlug?.toLowerCase(),
    );

    if (!activeChannel) {
      activeChannel = channels[0];
    }

    const prisma = getPrisma();

    // Check if initial seed welcome message is needed
    const existingCount = await prisma.communityMessage.count({
      where: { extracurricularId: activeChannel.id, deletedAt: null },
    });

    if (existingCount === 0) {
      // Find an admin user to be the sender
      const adminUser = await prisma.user.findFirst({
        where: { role: "ADMIN", isActive: true },
      });

      if (adminUser) {
        await prisma.communityMessage.create({
          data: {
            extracurricularId: activeChannel.id,
            senderId: adminUser.id,
            content: DEFAULT_WELCOME_MESSAGES[activeChannel.name] || `Selamat datang di channel ${activeChannel.name}! Pengumuman resmi dari Pembina/Admin akan muncul di sini.`,
          },
        });
      }
    }

    const rawMessages = await prisma.communityMessage.findMany({
      where: {
        extracurricularId: activeChannel.id,
        deletedAt: null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const messages: CommunityMessageItem[] = rawMessages.map((msg) => ({
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

    return {
      channels,
      activeChannel,
      messages,
    };
  },
);
